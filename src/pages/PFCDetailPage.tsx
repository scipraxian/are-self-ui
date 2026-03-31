import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ThreePanel } from '../components/ThreePanel';
import { PFCInspector } from '../components/PFCInspector';
import { PFCNavTree } from '../components/PFCNavTree';
import { PFCStatusBadge } from '../components/PFCStatusBadge';
import { PFCInlineCreate } from '../components/PFCInlineCreate';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useDendrite } from '../components/SynapticCleft';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import type { PFCItemStatus } from '../components/PrefrontalCortex';
import './PFCDetailPage.css';

type DetailType = 'epic' | 'story' | 'task';

function getDetailType(pathname: string): DetailType {
    if (pathname.includes('/pfc/epic/')) return 'epic';
    if (pathname.includes('/pfc/story/')) return 'story';
    return 'task';
}

export function PFCDetailPage() {
    const { epicId, storyId, taskId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    const itemId = epicId || storyId || taskId;
    const detailType = getDetailType(location.pathname);

    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<PFCAgileItem | null>(null);
    const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);

    // Real-time subscriptions
    const pfcEpicEvent = useDendrite('PFCEpic', null);
    const pfcStoryEvent = useDendrite('PFCStory', null);
    const pfcTaskEvent = useDendrite('PFCTask', null);

    useEffect(() => {
        if (!itemId) return;
        let cancelled = false;

        const fetchAll = async () => {
            try {
                const [statusRes, epicRes, storyRes, taskRes] = await Promise.all([
                    apiFetch('/api/v2/pre-frontal-item-status/'),
                    apiFetch('/api/v2/pfc-epics/?full=true'),
                    apiFetch('/api/v2/pfc-stories/?full=true'),
                    apiFetch('/api/v2/pfc-tasks/?full=true')
                ]);

                if (cancelled) return;

                let allStatuses: PFCItemStatus[] = [];
                if (statusRes.ok) {
                    const data = await statusRes.json();
                    allStatuses = data.results || data;
                }

                let allItems: PFCAgileItem[] = [];
                if (epicRes.ok) {
                    const data = await epicRes.json();
                    allItems = [...allItems, ...(data.results || data).map((e: any) => ({ ...e, item_type: 'EPIC' }))];
                }
                if (storyRes.ok) {
                    const data = await storyRes.json();
                    allItems = [...allItems, ...(data.results || data).map((s: any) => ({
                        ...s, item_type: 'STORY', parent_name: s.epic?.name, parent_id: s.epic?.id
                    }))];
                }
                if (taskRes.ok) {
                    const data = await taskRes.json();
                    allItems = [...allItems, ...(data.results || data).map((t: any) => ({
                        ...t, item_type: 'TASK', parent_name: t.story?.name, parent_id: t.story?.id
                    }))];
                }

                if (cancelled) return;
                setStatuses(allStatuses);
                setItems(allItems);

                const current = allItems.find(i => i.id === itemId);
                if (current) setSelectedItem(current);

                setIsLoading(false);
            } catch (err) {
                console.error("Failed to fetch PFC data:", err);
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchAll();
        return () => { cancelled = true; };
    }, [itemId, pfcEpicEvent, pfcStoryEvent, pfcTaskEvent]);

    // Breadcrumbs
    useEffect(() => {
        const currentItem = items.find(i => i.id === itemId);
        if (!currentItem) {
            setCrumbs([{ label: 'Prefrontal Cortex', path: '/pfc' }]);
            return;
        }

        const crumbs = [{ label: 'Prefrontal Cortex', path: '/pfc' }];

        if (detailType === 'epic') {
            crumbs.push({ label: currentItem.name, path: `/pfc/epic/${currentItem.id}` });
        } else if (detailType === 'story') {
            // Find parent epic
            const parentEpic = items.find(i => i.id === currentItem.parent_id);
            if (parentEpic) {
                crumbs.push({ label: parentEpic.name, path: `/pfc/epic/${parentEpic.id}` });
            }
            crumbs.push({ label: currentItem.name, path: `/pfc/story/${currentItem.id}` });
        } else if (detailType === 'task') {
            const parentStory = items.find(i => i.id === currentItem.parent_id);
            if (parentStory) {
                const parentEpic = items.find(i => i.id === parentStory.parent_id);
                if (parentEpic) {
                    crumbs.push({ label: parentEpic.name, path: `/pfc/epic/${parentEpic.id}` });
                }
                crumbs.push({ label: parentStory.name, path: `/pfc/story/${parentStory.id}` });
            }
            crumbs.push({ label: currentItem.name, path: `/pfc/task/${currentItem.id}` });
        }

        setCrumbs(crumbs);
        return () => setCrumbs([]);
    }, [setCrumbs, items, itemId, detailType]);

    const currentItem = items.find(i => i.id === itemId);

    const handleCreateItem = async (name: string, type: 'EPIC' | 'STORY' | 'TASK', parentId?: string) => {
        const endpointMap: Record<string, string> = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[type];
        const backlogStatus = statuses.find(s => s.name.toLowerCase() === 'backlog') || statuses[0];

        const payload: Record<string, any> = { name, status: backlogStatus?.id };
        if (type === 'STORY' && parentId) payload.epic = parentId;
        if (type === 'TASK' && parentId) payload.story = parentId;

        const res = await apiFetch(`/api/v2/${endpoint}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Create failed');
    };

    const handleRefresh = () => {
        // Trigger re-fetch by updating a dep — the dendrite events handle this naturally,
        // but for manual saves we re-trigger via dummy state
        setItems(prev => [...prev]);
    };

    if (isLoading) {
        return (
            <div className="pfc-detail-loader">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    if (!currentItem) {
        return (
            <ThreePanel
                left={<div className="pfc-detail-empty">Item not found.</div>}
                center={<div className="glass-panel three-panel-center-stage pfc-detail-empty">
                    The requested item could not be found.
                    <button className="pfc-detail-back-btn" onClick={() => navigate('/pfc')}>Back to Board</button>
                </div>}
                right={null}
            />
        );
    }

    // Render children based on type
    const renderChildren = () => {
        if (detailType === 'epic') {
            const childStories = items.filter(i => i.item_type === 'STORY' && i.parent_id === currentItem.id);
            return (
                <div className="pfc-detail-children">
                    <div className="pfc-detail-children-header">
                        <h3 className="pfc-detail-children-title">Stories ({childStories.length})</h3>
                    </div>
                    <div className="pfc-detail-children-list">
                        {childStories.map(story => {
                            const taskCount = items.filter(i => i.item_type === 'TASK' && i.parent_id === story.id).length;
                            const doneCount = items.filter(i => i.item_type === 'TASK' && i.parent_id === story.id && i.status?.name?.toLowerCase() === 'done').length;

                            return (
                                <div
                                    key={story.id}
                                    className="pfc-detail-child-row pfc-detail-child-row--story"
                                    onClick={() => navigate(`/pfc/story/${story.id}`)}
                                >
                                    <div className="pfc-detail-child-main">
                                        <span className="pfc-detail-child-name">{story.name}</span>
                                        {story.status && <PFCStatusBadge name={story.status.name} />}
                                    </div>
                                    <div className="pfc-detail-child-meta">
                                        <span className="font-mono text-xs text-muted">{taskCount} tasks</span>
                                        {taskCount > 0 && (
                                            <span className="font-mono text-xs text-muted">({doneCount} done)</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <PFCInlineCreate
                        itemType="STORY"
                        parentId={currentItem.id}
                        onSubmit={(name) => handleCreateItem(name, 'STORY', currentItem.id)}
                    />
                </div>
            );
        }

        if (detailType === 'story') {
            const childTasks = items.filter(i => i.item_type === 'TASK' && i.parent_id === currentItem.id);
            return (
                <div className="pfc-detail-children">
                    <div className="pfc-detail-children-header">
                        <h3 className="pfc-detail-children-title">Tasks ({childTasks.length})</h3>
                    </div>
                    <div className="pfc-detail-children-list">
                        {childTasks.map(task => (
                            <div
                                key={task.id}
                                className="pfc-detail-child-row pfc-detail-child-row--task"
                                onClick={() => navigate(`/pfc/task/${task.id}`)}
                            >
                                <div className="pfc-detail-child-main">
                                    <span className="pfc-detail-child-name">{task.name}</span>
                                    {task.status && <PFCStatusBadge name={task.status.name} />}
                                </div>
                                <div className="pfc-detail-child-meta">
                                    {task.owning_disc && (
                                        <span className="font-mono text-xs" style={{ color: 'var(--accent-gold)' }}>
                                            {task.owning_disc.name}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <PFCInlineCreate
                        itemType="TASK"
                        parentId={currentItem.id}
                        onSubmit={(name) => handleCreateItem(name, 'TASK', currentItem.id)}
                    />
                </div>
            );
        }

        // Task detail — no children
        return null;
    };

    // Completion stats
    const getCompletionBar = () => {
        let total = 0, done = 0;
        if (detailType === 'epic') {
            const storyIds = items.filter(i => i.item_type === 'STORY' && i.parent_id === currentItem.id).map(s => s.id);
            const tasks = items.filter(i => i.item_type === 'TASK' && storyIds.includes(i.parent_id || ''));
            total = tasks.length;
            done = tasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
        } else if (detailType === 'story') {
            const tasks = items.filter(i => i.item_type === 'TASK' && i.parent_id === currentItem.id);
            total = tasks.length;
            done = tasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
        }
        if (total === 0) return null;
        const pct = Math.round((done / total) * 100);
        return (
            <div className="pfc-detail-completion">
                <div className="pfc-detail-completion-text">{done}/{total} tasks complete ({pct}%)</div>
                <div className="pfc-detail-completion-bar">
                    <div className="pfc-detail-completion-fill" style={{ width: `${pct}%` }} />
                </div>
            </div>
        );
    };

    return (
        <ThreePanel
            left={
                <PFCNavTree
                    items={items}
                    selectedItemId={itemId}
                    filterEpicId={null}
                    filterStoryId={null}
                    onItemSelect={(item) => {
                        const path = `/pfc/${item.item_type.toLowerCase()}/${item.id}`;
                        navigate(path);
                    }}
                    onFilterEpic={() => {}}
                    onFilterStory={() => {}}
                    onCreateItem={handleCreateItem}
                />
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <div className="pfc-detail-center">
                        <div className="pfc-detail-header">
                            <span className={`pfcinspector-type-pill pfcinspector-type-pill--${detailType}`}>
                                {currentItem.item_type}
                            </span>
                            <span className="font-mono text-xs text-muted">
                                {currentItem.id.split('-')[0]}
                            </span>
                        </div>

                        <h1 className="pfc-detail-name">{currentItem.name}</h1>

                        {currentItem.description && (
                            <div className="pfc-detail-description">{currentItem.description}</div>
                        )}

                        {getCompletionBar()}
                        {renderChildren()}
                    </div>
                </div>
            }
            right={
                selectedItem || currentItem ? (
                    <PFCInspector
                        item={selectedItem || currentItem}
                        allItems={items}
                        statuses={statuses}
                        onUpdate={handleRefresh}
                        onDelete={() => navigate('/pfc')}
                        isExpanded={isInspectorExpanded}
                        onToggleExpand={() => setIsInspectorExpanded(prev => !prev)}
                    />
                ) : null
            }
            rightClassName={isInspectorExpanded ? 'three-panel-right--expanded' : undefined}
        />
    );
}

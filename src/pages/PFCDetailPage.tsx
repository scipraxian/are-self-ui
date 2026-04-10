import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { PFCStatusBadge } from '../components/PFCStatusBadge';
import { PFCInlineCreate } from '../components/PFCInlineCreate';
import { useBreadcrumbs, type Breadcrumb } from '../context/BreadcrumbProvider';
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
                        ...s, item_type: 'STORY',
                        parent_name: typeof s.epic === 'string' ? undefined : s.epic?.name,
                        parent_id: typeof s.epic === 'string' ? s.epic : s.epic?.id
                    }))];
                }
                if (taskRes.ok) {
                    const data = await taskRes.json();
                    allItems = [...allItems, ...(data.results || data).map((t: any) => ({
                        ...t, item_type: 'TASK',
                        parent_name: typeof t.story === 'string' ? undefined : t.story?.name,
                        parent_id: typeof t.story === 'string' ? t.story : t.story?.id
                    }))];
                }

                if (cancelled) return;
                setStatuses(allStatuses);
                setItems(allItems);
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
        const PFC_ROOT: Breadcrumb = {
            label: 'Prefrontal Cortex',
            path: '/pfc',
            tip: 'The Prefrontal Cortex plans work — epics split into stories, stories into tasks, all scoped by shift and priority.',
            doc: 'docs/brain-regions/prefrontal-cortex',
        };

        if (!currentItem) {
            setCrumbs([PFC_ROOT]);
            return;
        }

        const crumbs: Breadcrumb[] = [PFC_ROOT];
        const detailTip: Pick<Breadcrumb, 'tip' | 'doc'> = {
            tip: 'Epic → Story → Task. Drill in to see sub-items, status, assigned shift, and tied pathways.',
            doc: 'docs/brain-regions/prefrontal-cortex',
        };

        if (detailType === 'epic') {
            crumbs.push({ label: currentItem.name, path: `/pfc/epic/${currentItem.id}`, ...detailTip });
        } else if (detailType === 'story') {
            const parentEpic = items.find(i => i.id === currentItem.parent_id);
            if (parentEpic) {
                crumbs.push({ label: parentEpic.name, path: `/pfc/epic/${parentEpic.id}` });
            }
            crumbs.push({ label: currentItem.name, path: `/pfc/story/${currentItem.id}`, ...detailTip });
        } else if (detailType === 'task') {
            const parentStory = items.find(i => i.id === currentItem.parent_id);
            if (parentStory) {
                const parentEpic = items.find(i => i.id === parentStory.parent_id);
                if (parentEpic) {
                    crumbs.push({ label: parentEpic.name, path: `/pfc/epic/${parentEpic.id}` });
                }
                crumbs.push({ label: parentStory.name, path: `/pfc/story/${parentStory.id}` });
            }
            crumbs.push({ label: currentItem.name, path: `/pfc/task/${currentItem.id}`, ...detailTip });
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

    if (isLoading) {
        return (
            <div className="pfc-detail-loader">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    if (!currentItem) {
        return (
            <div className="pfc-detail-page">
                <div className="pfc-detail-not-found glass-surface">
                    The requested item could not be found.
                    <button className="pfc-detail-back-btn" onClick={() => navigate('/pfc')}>Back to Board</button>
                </div>
            </div>
        );
    }

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

        return null;
    };

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
        <div className="pfc-detail-page">
            <div className="pfc-detail-content glass-surface">
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
        </div>
    );
}

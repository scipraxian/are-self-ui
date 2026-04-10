import { useState, useEffect, type ReactNode } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import { useBreadcrumbs, type Breadcrumb } from '../context/BreadcrumbProvider';
import { useDendrite } from '../components/SynapticCleft';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import type { PFCItemStatus } from '../components/PrefrontalCortex';
import './PFCEditPage.css';

type DetailType = 'epic' | 'story' | 'task';

interface AccordionProps {
    title: string;
    variant: 'epic' | 'story' | 'task';
    icon?: ReactNode;
    open?: boolean;
    children: ReactNode;
}

interface PFCTag {
    id: number;
    name: string;
}

const Accordion = ({ title, variant, icon, open = false, children }: AccordionProps) => {
    return (
        <details open={open} className={`pfc-edit-accordion pfc-edit-accordion--${variant}`}>
            <summary className="pfc-edit-accordion-summary">
                {icon}
                <span>{title}</span>
            </summary>
            <div className="pfc-edit-accordion-content">
                {children}
            </div>
        </details>
    );
};

function getDetailType(pathname: string): DetailType {
    if (pathname.includes('/pfc/epic/')) return 'epic';
    if (pathname.includes('/pfc/story/')) return 'story';
    return 'task';
}

export function PFCEditPage() {
    const { epicId, storyId, taskId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    const itemId = epicId || storyId || taskId;
    const detailType = getDetailType(location.pathname);

    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [environments, setEnvironments] = useState<{id: string, name: string}[]>([]);
    const [identityDiscs, setIdentityDiscs] = useState<{id: number, name: string}[]>([]);
    const [allTags, setAllTags] = useState<PFCTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [localData, setLocalData] = useState<PFCAgileItem | null>(null);

    const pfcEpicEvent = useDendrite('PFCEpic', null);
    const pfcStoryEvent = useDendrite('PFCStory', null);
    const pfcTaskEvent = useDendrite('PFCTask', null);

    // Fetch all data
    useEffect(() => {
        if (!itemId) return;
        let cancelled = false;

        const fetchAll = async () => {
            try {
                const [statusRes, epicRes, storyRes, taskRes, envRes, discRes, tagsRes] = await Promise.all([
                    apiFetch('/api/v2/pre-frontal-item-status/'),
                    apiFetch('/api/v2/pfc-epics/?full=true'),
                    apiFetch('/api/v2/pfc-stories/?full=true'),
                    apiFetch('/api/v2/pfc-tasks/?full=true'),
                    apiFetch('/api/v1/environments/'),
                    apiFetch('/api/v2/identity-discs/'),
                    apiFetch('/api/v2/pfc-tags/')
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

                if (envRes.ok) {
                    const data = await envRes.json();
                    setEnvironments(data.results || data);
                }

                if (discRes.ok) {
                    const data = await discRes.json();
                    setIdentityDiscs(data.results || data);
                }

                if (tagsRes.ok) {
                    const data = await tagsRes.json();
                    setAllTags(data.results || data);
                }

                if (cancelled) return;
                setStatuses(allStatuses);
                setItems(allItems);

                const currentItem = allItems.find(i => i.id === itemId);
                if (currentItem) {
                    setLocalData(currentItem);
                }
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
        const editTip: Pick<Breadcrumb, 'tip' | 'doc'> = {
            tip: 'Edit this PFC item — name, description, status, shift assignment, tied pathways, and sub-item ordering.',
            doc: 'docs/brain-regions/prefrontal-cortex',
        };

        if (detailType === 'epic') {
            crumbs.push({ label: currentItem.name, path: `/pfc/epic/${currentItem.id}`, ...editTip });
        } else if (detailType === 'story') {
            const parentEpic = items.find(i => i.id === currentItem.parent_id);
            if (parentEpic) {
                crumbs.push({ label: parentEpic.name, path: `/pfc/epic/${parentEpic.id}` });
            }
            crumbs.push({ label: currentItem.name, path: `/pfc/story/${currentItem.id}`, ...editTip });
        } else if (detailType === 'task') {
            const parentStory = items.find(i => i.id === currentItem.parent_id);
            if (parentStory) {
                const parentEpic = items.find(i => i.id === parentStory.parent_id);
                if (parentEpic) {
                    crumbs.push({ label: parentEpic.name, path: `/pfc/epic/${parentEpic.id}` });
                }
                crumbs.push({ label: parentStory.name, path: `/pfc/story/${parentStory.id}` });
            }
            crumbs.push({ label: currentItem.name, path: `/pfc/task/${currentItem.id}`, ...editTip });
        }

        setCrumbs(crumbs);
        return () => setCrumbs([]);
    }, [setCrumbs, items, itemId, detailType]);

    const currentItem = localData || items.find(i => i.id === itemId);
    const typeClass = currentItem?.item_type.toLowerCase() as 'epic' | 'story' | 'task' | undefined;
    const endpointMap: Record<string, string> = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };

    const handleSave = async (field: keyof PFCAgileItem, value: string | number | undefined | null) => {
        if (!currentItem || currentItem[field] === value) return;
        try {
            const endpoint = endpointMap[currentItem.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${currentItem.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            if (res.ok) {
                const updated = items.find(i => i.id === currentItem.id);
                if (updated) {
                    setLocalData({ ...updated, [field]: value });
                }
            }
        } catch (err) {
            console.error(`Failed to update ${field}:`, err);
        }
    };

    const handleStatusChange = async (statusId: string) => {
        if (!currentItem) return;
        const numId = Number(statusId);
        const statusObj = statuses.find(s => s.id === numId);
        if (statusObj) {
            setLocalData(prev => prev ? { ...prev, status: statusObj } : null);
            const endpoint = endpointMap[currentItem.item_type];
            try {
                const res = await apiFetch(`/api/v2/${endpoint}/${currentItem.id}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: numId })
                });
                if (res.ok) {
                    // Data will be refetched via dendrite hook
                }
            } catch (err) {
                console.error("Failed to update status:", err);
            }
        }
    };

    const handleAssigneeChange = async (discId: string) => {
        if (!currentItem) return;
        const numId = discId ? Number(discId) : null;
        try {
            const endpoint = endpointMap[currentItem.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${currentItem.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owning_disc: numId })
            });
            if (res.ok) {
                // Data will be refetched via dendrite hook
            }
        } catch (err) {
            console.error("Failed to update assignee:", err);
        }
    };


    const handleEnvironmentChange = async (envId: string | null) => {
        if (!currentItem || currentItem.item_type !== 'EPIC') return;
        const envObj = environments.find(env => env.id === envId) || null;
        setLocalData(prev => prev ? { ...prev, environment: envObj } : null);
        try {
            const res = await apiFetch(`/api/v2/pfc-epics/${currentItem.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ environment: envId })
            });
            if (res.ok) {
                // Data will be refetched via dendrite hook
            }
        } catch (err) {
            console.error("Failed to update environment", err);
        }
    };

    const handleTagToggle = async (tagId: number) => {
        if (!currentItem) return;
        const currentTags = localData?.tags || [];
        const hasTag = currentTags.some(t => t.id === tagId);
        const newTags = hasTag
            ? currentTags.filter(t => t.id !== tagId)
            : [...currentTags, { id: tagId, name: allTags.find(t => t.id === tagId)?.name || '' }];

        setLocalData(prev => prev ? { ...prev, tags: newTags } : null);

        try {
            const tagIds = newTags.map(t => t.id);
            const endpoint = endpointMap[currentItem.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${currentItem.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag_ids: tagIds })
            });
            if (res.ok) {
                // Data will be refetched via dendrite hook
            }
        } catch (err) {
            console.error("Failed to update tags:", err);
        }
    };

    const handleDeleteTicket = async () => {
        if (!currentItem) return;
        if (!confirm(`WARNING: Are you sure you want to permanently delete this ${currentItem.item_type}? This action cannot be undone.`)) return;
        try {
            const endpoint = endpointMap[currentItem.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${currentItem.id}/`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                navigate('/pfc');
            }
        } catch (err) {
            console.error(`Failed to delete ${currentItem.item_type}:`, err);
        }
    };

    const getChildStats = () => {
        if (!currentItem) return null;
        if (currentItem.item_type === 'EPIC') {
            const childStories = items.filter(i => i.item_type === 'STORY' && i.parent_id === currentItem.id);
            const storyIds = childStories.map(s => s.id);
            const childTasks = items.filter(i => i.item_type === 'TASK' && storyIds.includes(i.parent_id || ''));
            const done = childTasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
            return { childCount: childStories.length, taskCount: childTasks.length, doneCount: done, label: 'stories' };
        }
        if (currentItem.item_type === 'STORY') {
            const childTasks = items.filter(i => i.item_type === 'TASK' && i.parent_id === currentItem.id);
            const done = childTasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
            return { childCount: childTasks.length, taskCount: childTasks.length, doneCount: done, label: 'tasks' };
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="pfc-edit-loader">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    if (!currentItem) {
        return (
            <div className="pfc-edit-page">
                <div className="pfc-edit-not-found glass-surface">
                    The requested item could not be found.
                    <button className="pfc-edit-back-btn" onClick={() => navigate('/pfc')}>Back to Board</button>
                </div>
            </div>
        );
    }

    const childStats = getChildStats();
    const completionPct = childStats && childStats.taskCount > 0
        ? Math.round((childStats.doneCount / childStats.taskCount) * 100)
        : 0;

    const parentItem = currentItem.parent_id ? items.find(i => i.id === currentItem.parent_id) : null;
    const grandparentItem = parentItem?.parent_id ? items.find(i => i.id === parentItem.parent_id) : null;

    return (
        <div className="pfc-edit-page">
            <button className="pfc-edit-back-btn-header" onClick={() => navigate('/pfc')} title="Back to board">
                <ArrowLeft size={16} />
            </button>

            <div className="pfc-edit-content glass-surface">
                {/* Breadcrumb navigation */}
                {(parentItem || grandparentItem) && (
                    <div className="pfc-edit-breadcrumb">
                        {grandparentItem && (
                            <>
                                <span
                                    className="pfc-edit-breadcrumb-link pfc-edit-breadcrumb-link--epic"
                                    onClick={() => navigate(`/pfc/epic/${grandparentItem.id}/edit`)}
                                >
                                    {grandparentItem.name}
                                </span>
                                <span className="pfc-edit-breadcrumb-sep">/</span>
                            </>
                        )}
                        {parentItem && (
                            <span
                                className={`pfc-edit-breadcrumb-link pfc-edit-breadcrumb-link--${parentItem.item_type.toLowerCase()}`}
                                onClick={() => navigate(`/pfc/${parentItem.item_type.toLowerCase()}/${parentItem.id}/edit`)}
                            >
                                {parentItem.name}
                            </span>
                        )}
                    </div>
                )}

                {/* Header */}
                <div className="pfc-edit-header">
                    <div className="pfc-edit-header-left">
                        <span className={`pfc-edit-type-pill pfc-edit-type-pill--${typeClass}`}>
                            {currentItem.item_type}
                        </span>
                        <span className="font-mono text-xs text-muted">ID: {currentItem.id.split('-')[0]}</span>
                    </div>
                    <button className="pfc-edit-delete-btn" onClick={handleDeleteTicket} title="Delete this item">
                        <Trash2 size={16} />
                    </button>
                </div>

                {/* Name field */}
                <input
                    type="text"
                    className="pfc-edit-name-field"
                    value={localData?.name || ''}
                    onChange={(e) => setLocalData(prev => prev ? { ...prev, name: e.target.value } : null)}
                    onBlur={(e) => handleSave('name', e.target.value)}
                    placeholder="Item name"
                />

                {/* Completion bar */}
                {childStats && (
                    <div className="pfc-edit-completion">
                        <div className="pfc-edit-completion-text">
                            {childStats.doneCount}/{childStats.taskCount} {childStats.label} complete ({completionPct}%)
                        </div>
                        <div className="pfc-edit-completion-bar">
                            <div className="pfc-edit-completion-fill" style={{ width: `${completionPct}%` }} />
                        </div>
                    </div>
                )}

                {/* Main editing accordion sections */}
                <Accordion title="Details" variant={typeClass || 'task'} open={true}>
                    <div className="pfc-edit-field">
                        <label className="pfc-edit-field-label">Status</label>
                        <select
                            className="pfc-edit-field-select"
                            value={localData?.status?.id || ''}
                            onChange={(e) => handleStatusChange(e.target.value)}
                        >
                            {statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pfc-edit-field">
                        <label className="pfc-edit-field-label">Priority</label>
                        <select
                            className="pfc-edit-field-select"
                            value={localData?.priority || 3}
                            onChange={(e) => {
                                const numVal = Number(e.target.value);
                                setLocalData(prev => prev ? { ...prev, priority: numVal } : null);
                                handleSave('priority', numVal);
                            }}
                        >
                            <option value="1">P1: CRITICAL</option>
                            <option value="2">P2: HIGH</option>
                            <option value="3">P3: NORMAL</option>
                            <option value="4">P4: LOW</option>
                        </select>
                    </div>

                    <div className="pfc-edit-field">
                        <label className="pfc-edit-field-label">Assignee</label>
                        <select
                            className="pfc-edit-field-select"
                            value={localData?.owning_disc?.id || ''}
                            onChange={(e) => handleAssigneeChange(e.target.value)}
                        >
                            <option value="">-- Unassigned --</option>
                            {identityDiscs.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    {currentItem.item_type === 'EPIC' && (
                        <div className="pfc-edit-field">
                            <label className="pfc-edit-field-label">Environment</label>
                            <select
                                className="pfc-edit-field-select"
                                value={localData?.environment?.id || ''}
                                onChange={(e) => handleEnvironmentChange(e.target.value || null)}
                            >
                                <option value="">-- None --</option>
                                {environments.map(env => (
                                    <option key={env.id} value={env.id}>{env.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {localData?.complexity !== undefined && (
                        <div className="pfc-edit-field">
                            <label className="pfc-edit-field-label">Complexity</label>
                            <input
                                type="number"
                                className="pfc-edit-field-input"
                                min="0"
                                value={localData.complexity}
                                onChange={(e) => setLocalData(prev => prev ? { ...prev, complexity: Number(e.target.value) } : null)}
                                onBlur={(e) => handleSave('complexity', e.target.value ? Number(e.target.value) : 0)}
                            />
                        </div>
                    )}

                    <div className="pfc-edit-field">
                        <label className="pfc-edit-field-label">Tags</label>
                        <div className="pfc-edit-tags-container">
                            {localData?.tags && localData.tags.length > 0 && (
                                localData.tags.map(tag => (
                                    <div key={tag.id} className="pfc-edit-tag">
                                        <span>{tag.name}</span>
                                        <span
                                            className="pfc-edit-tag-remove"
                                            onClick={() => handleTagToggle(tag.id)}
                                            title="Remove tag"
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))
                            )}
                            {allTags.length > 0 && (
                                <select
                                    className="pfc-edit-field-select pfc-edit-tags-select"
                                    defaultValue=""
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleTagToggle(Number(e.target.value));
                                            e.target.value = '';
                                        }
                                    }}
                                >
                                    <option value="">+ Add tag</option>
                                    {allTags
                                        .filter(t => !localData?.tags?.some(tag => tag.id === t.id))
                                        .map(tag => (
                                            <option key={tag.id} value={tag.id}>{tag.name}</option>
                                        ))
                                    }
                                </select>
                            )}
                        </div>
                    </div>
                </Accordion>

                <Accordion title="Description" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.description || ''}
                        placeholder="Enter description..."
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, description: e.target.value } : null)}
                        onBlur={(e) => handleSave('description', e.target.value)}
                    />
                </Accordion>

                <Accordion title="Perspective" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.perspective || ''}
                        placeholder="What is the perspective for this work?"
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, perspective: e.target.value } : null)}
                        onBlur={(e) => handleSave('perspective', e.target.value)}
                    />
                </Accordion>

                <Accordion title="Assertions (DoR)" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.assertions || ''}
                        placeholder="Testable steps starting with 'Assert'..."
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, assertions: e.target.value } : null)}
                        onBlur={(e) => handleSave('assertions', e.target.value)}
                    />
                </Accordion>

                <Accordion title="Outside Scope" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.outside || ''}
                        placeholder="What is NOT included in this work?"
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, outside: e.target.value } : null)}
                        onBlur={(e) => handleSave('outside', e.target.value)}
                    />
                </Accordion>

                <Accordion title="Definition of Done Exceptions" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.dod_exceptions || ''}
                        placeholder="Any exceptions to the standard definition of done?"
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, dod_exceptions: e.target.value } : null)}
                        onBlur={(e) => handleSave('dod_exceptions', e.target.value)}
                    />
                </Accordion>

                <Accordion title="Dependencies" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.dependencies || ''}
                        placeholder="List dependencies, blockers, or prerequisites..."
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, dependencies: e.target.value } : null)}
                        onBlur={(e) => handleSave('dependencies', e.target.value)}
                    />
                </Accordion>

                <Accordion title="Demo Specifics" variant={typeClass || 'task'}>
                    <textarea
                        className="pfc-edit-textarea"
                        value={localData?.demo_specifics || ''}
                        placeholder="Specific requirements or scenarios for demonstration..."
                        onChange={(e) => setLocalData(prev => prev ? { ...prev, demo_specifics: e.target.value } : null)}
                        onBlur={(e) => handleSave('demo_specifics', e.target.value)}
                    />
                </Accordion>
            </div>
        </div>
    );
}

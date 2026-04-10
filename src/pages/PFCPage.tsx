import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { PrefrontalCortex } from '../components/PrefrontalCortex';
import { PFCBacklog } from '../components/PFCBacklog';
import { PFCInspector } from '../components/PFCInspector';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useDendrite } from '../components/SynapticCleft';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import type { PFCItemStatus } from '../components/PrefrontalCortex';
import './PFCPage.css';

type ViewMode = 'board' | 'backlog';

export function PFCPage() {
    const { setCrumbs } = useBreadcrumbs();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const viewMode: ViewMode = location.pathname === '/pfc/backlog' ? 'backlog' : 'board';

    // URL-driven state
    const selectedId = searchParams.get('selected');
    const epicFilter = searchParams.get('epic');
    const statusFilter = searchParams.get('status');
    const priorityFilter = searchParams.get('priority');
    const assigneeFilter = searchParams.get('assignee');

    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);

    const pfcEpicEvent = useDendrite('PFCEpic', null);
    const pfcStoryEvent = useDendrite('PFCStory', null);
    const pfcTaskEvent = useDendrite('PFCTask', null);

    useEffect(() => {
        setCrumbs([{
            label: 'Prefrontal Cortex',
            path: '/pfc',
            tip: 'The Prefrontal Cortex plans work — epics split into stories, stories into tasks, all scoped by shift and priority.',
            doc: 'docs/brain-regions/prefrontal-cortex',
        }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    useEffect(() => {
        let cancelled = false;
        const fetchData = async () => {
            try {
                const [statusRes, epicRes, storyRes, taskRes] = await Promise.all([
                    apiFetch('/api/v2/pre-frontal-item-status/'),
                    apiFetch('/api/v2/pfc-epics/?full=true'),
                    apiFetch('/api/v2/pfc-stories/?full=true'),
                    apiFetch('/api/v2/pfc-tasks/?full=true')
                ]);
                if (cancelled) return;

                if (statusRes.ok) {
                    const data = await statusRes.json();
                    if (!cancelled) setStatuses(data.results || data);
                }

                let allItems: PFCAgileItem[] = [];
                if (epicRes.ok) {
                    const data = await epicRes.json();
                    allItems = [...allItems, ...(data.results || data).map((e: any) => ({
                        ...e, item_type: 'EPIC' as const
                    }))];
                }
                if (storyRes.ok) {
                    const data = await storyRes.json();
                    allItems = [...allItems, ...(data.results || data).map((s: any) => ({
                        ...s, item_type: 'STORY' as const,
                        parent_name: typeof s.epic === 'string' ? undefined : s.epic?.name,
                        parent_id: typeof s.epic === 'string' ? s.epic : s.epic?.id
                    }))];
                }
                if (taskRes.ok) {
                    const data = await taskRes.json();
                    allItems = [...allItems, ...(data.results || data).map((t: any) => ({
                        ...t, item_type: 'TASK' as const,
                        parent_name: typeof t.story === 'string' ? undefined : t.story?.name,
                        parent_id: typeof t.story === 'string' ? t.story : t.story?.id
                    }))];
                }

                if (!cancelled) {
                    setItems(allItems);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to fetch PFC data:", err);
                if (!cancelled) setIsLoading(false);
            }
        };
        fetchData();
        return () => { cancelled = true; };
    }, [pfcEpicEvent, pfcStoryEvent, pfcTaskEvent]);

    const setUrlParam = useCallback((key: string, value: string | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value) { next.set(key, value); } else { next.delete(key); }
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const handleItemSelect = useCallback((item: PFCAgileItem) => {
        setUrlParam('selected', item.id);
    }, [setUrlParam]);

    const handleItemDoubleClick = useCallback((item: PFCAgileItem) => {
        navigate(`/pfc/${item.item_type.toLowerCase()}/${item.id}/edit`);
    }, [navigate]);

    const handleRefresh = useCallback(() => {
        setItems(prev => [...prev]);
    }, []);

    const handleCreateItem = useCallback(async (
        name: string, type: 'EPIC' | 'STORY' | 'TASK', parentId?: string, statusId?: number
    ) => {
        const endpointMap: Record<string, string> = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[type];

        // Default to "Blocked by User" status, fall back to first status
        const blockedStatus = statuses.find(s =>
            s.name.toLowerCase().replace(/[\s_]+/g, '') === 'blockedbyuser' || s.id === 6
        );
        const fallbackStatus = blockedStatus || statuses[0];

        const payload: Record<string, any> = { name, status: statusId || fallbackStatus?.id };

        // Stories require an epic FK, tasks require a story FK.
        // Auto-assign the first available parent if none provided.
        if (type === 'STORY') {
            const epicId = parentId || items.find(i => i.item_type === 'EPIC')?.id;
            if (epicId) payload.epic = epicId;
        }
        if (type === 'TASK') {
            const storyId = parentId || items.find(i => i.item_type === 'STORY')?.id;
            if (storyId) payload.story = storyId;
        }

        const res = await apiFetch(`/api/v2/${endpoint}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            console.error(`Create ${type} failed (${res.status}):`, errBody);
            throw new Error(`Create ${type} failed`);
        }
        handleRefresh();
    }, [statuses, items, handleRefresh]);

    const selectedItem = selectedId ? items.find(i => i.id === selectedId) || null : null;

    const handleViewChange = (mode: ViewMode) => {
        const target = mode === 'backlog' ? '/pfc/backlog' : '/pfc';
        const params = searchParams.toString();
        navigate(target + (params ? `?${params}` : ''), { replace: true });
    };

    // Derived filter options
    const epics = useMemo(() => items.filter(i => i.item_type === 'EPIC'), [items]);
    const uniqueAssignees = useMemo(() => {
        const map = new Map<string, string>();
        items.forEach(i => {
            if (i.owning_disc) map.set(String(i.owning_disc.id), i.owning_disc.name);
        });
        return Array.from(map, ([id, name]) => ({ id, name }));
    }, [items]);
    const uniqueStatusNames = useMemo(() =>
        [...new Set(items.map(i => i.status?.name).filter(Boolean))] as string[]
    , [items]);

    // Apply URL-driven filters
    const filteredItems = useMemo(() => {
        let result = items;
        if (epicFilter) {
            const epicStoryIds = items
                .filter(i => i.item_type === 'STORY' && i.parent_id === epicFilter)
                .map(s => s.id);
            result = result.filter(i =>
                i.id === epicFilter ||
                i.parent_id === epicFilter ||
                (i.item_type === 'TASK' && epicStoryIds.includes(i.parent_id || ''))
            );
        }
        if (statusFilter) result = result.filter(i => i.status?.name === statusFilter);
        if (priorityFilter) result = result.filter(i => String(i.priority) === priorityFilter);
        if (assigneeFilter) result = result.filter(i => String(i.owning_disc?.id) === assigneeFilter);
        return result;
    }, [items, epicFilter, statusFilter, priorityFilter, assigneeFilter]);

    const hasFilters = !!(epicFilter || statusFilter || priorityFilter || assigneeFilter);

    if (isLoading && items.length === 0) {
        return (
            <div className="pfc-page-loader">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    return (
        <div className="pfc-page">
            <div className="pfc-filter-bar glass-surface">
                <div className="pfc-filter-bar-group">
                    <div className="pfc-view-toggle">
                        <button
                            className={`pfc-view-toggle-btn ${viewMode === 'board' ? 'pfc-view-toggle-btn--active' : ''}`}
                            onClick={() => handleViewChange('board')}
                        >
                            <LayoutGrid size={14} /> Board
                        </button>
                        <button
                            className={`pfc-view-toggle-btn ${viewMode === 'backlog' ? 'pfc-view-toggle-btn--active' : ''}`}
                            onClick={() => handleViewChange('backlog')}
                        >
                            <List size={14} /> Backlog
                        </button>
                    </div>
                    <div className="pfc-filter-divider" />
                    <select className="pfc-filter-select" value={statusFilter || ''} onChange={e => setUrlParam('status', e.target.value || null)}>
                        <option value="">All Statuses</option>
                        {uniqueStatusNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select className="pfc-filter-select" value={priorityFilter || ''} onChange={e => setUrlParam('priority', e.target.value || null)}>
                        <option value="">All Priorities</option>
                        <option value="1">P1: Critical</option>
                        <option value="2">P2: High</option>
                        <option value="3">P3: Normal</option>
                        <option value="4">P4: Low</option>
                    </select>
                    <select className="pfc-filter-select" value={epicFilter || ''} onChange={e => setUrlParam('epic', e.target.value || null)}>
                        <option value="">All Epics</option>
                        {epics.map(ep => <option key={ep.id} value={ep.id}>{ep.name}</option>)}
                    </select>
                    <select className="pfc-filter-select" value={assigneeFilter || ''} onChange={e => setUrlParam('assignee', e.target.value || null)}>
                        <option value="">All Assignees</option>
                        {uniqueAssignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    {hasFilters && (
                        <button className="pfc-filter-clear" onClick={() => {
                            setSearchParams(prev => {
                                const next = new URLSearchParams(prev);
                                next.delete('epic'); next.delete('status');
                                next.delete('priority'); next.delete('assignee');
                                return next;
                            }, { replace: true });
                        }}>
                            Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="pfc-main">
                <div className="pfc-stage">
                    {viewMode === 'board' ? (
                        <PrefrontalCortex
                            items={filteredItems}
                            statuses={statuses}
                            selectedItemId={selectedId}
                            onItemSelect={handleItemSelect}
                            onItemDoubleClick={handleItemDoubleClick}
                            onRefresh={handleRefresh}
                            onCreateItem={handleCreateItem}
                        />
                    ) : (
                        <PFCBacklog
                            items={filteredItems}
                            statuses={statuses}
                            selectedItemId={selectedId}
                            onItemSelect={handleItemSelect}
                            onItemDoubleClick={handleItemDoubleClick}
                            onCreateItem={handleCreateItem}
                        />
                    )}
                </div>
                {selectedItem && (
                    <aside className={`pfc-inspector-panel glass-panel ${isInspectorExpanded ? 'pfc-inspector-panel--expanded' : ''}`}>
                        <PFCInspector
                            item={selectedItem}
                            allItems={items}
                            statuses={statuses}
                            onUpdate={handleRefresh}
                            onDelete={() => setUrlParam('selected', null)}
                            isExpanded={isInspectorExpanded}
                            onToggleExpand={() => setIsInspectorExpanded(prev => !prev)}
                        />
                    </aside>
                )}
            </div>
        </div>
    );
}

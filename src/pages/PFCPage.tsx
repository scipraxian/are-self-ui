import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { ThreePanel } from '../components/ThreePanel';
import { PrefrontalCortex } from '../components/PrefrontalCortex';
import { PFCBacklog } from '../components/PFCBacklog';
import { PFCInspector } from '../components/PFCInspector';
import { PFCNavTree } from '../components/PFCNavTree';
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

    // Determine view from route
    const viewMode: ViewMode = location.pathname === '/pfc/backlog' ? 'backlog' : 'board';

    // URL-driven state
    const selectedId = searchParams.get('selected');
    const epicFilter = searchParams.get('epic');
    const storyFilter = searchParams.get('story');

    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);

    // Real-time subscriptions
    const pfcEpicEvent = useDendrite('PFCEpic', null);
    const pfcStoryEvent = useDendrite('PFCStory', null);
    const pfcTaskEvent = useDendrite('PFCTask', null);

    useEffect(() => {
        setCrumbs([{ label: 'Prefrontal Cortex', path: '/pfc' }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    // Fetch all PFC data
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
                        parent_name: s.epic?.name, parent_id: s.epic?.id
                    }))];
                }
                if (taskRes.ok) {
                    const data = await taskRes.json();
                    allItems = [...allItems, ...(data.results || data).map((t: any) => ({
                        ...t, item_type: 'TASK' as const,
                        parent_name: t.story?.name, parent_id: t.story?.id
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

    // URL update helpers
    const setUrlParam = useCallback((key: string, value: string | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (value) {
                next.set(key, value);
            } else {
                next.delete(key);
            }
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const handleItemSelect = useCallback((item: PFCAgileItem) => {
        setUrlParam('selected', item.id);
    }, [setUrlParam]);

    const handleFilterEpic = useCallback((epicId: string | null) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (epicId) {
                next.set('epic', epicId);
            } else {
                next.delete('epic');
            }
            next.delete('story');
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    const handleFilterStory = useCallback((storyId: string | null) => {
        setUrlParam('story', storyId);
    }, [setUrlParam]);

    const handleRefresh = useCallback(() => {
        // Force a refetch by triggering a synthetic state update.
        // In practice, dendrite events handle real-time updates.
        setItems(prev => [...prev]);
    }, []);

    const handleCreateItem = useCallback(async (
        name: string,
        type: 'EPIC' | 'STORY' | 'TASK',
        parentId?: string,
        statusId?: number
    ) => {
        const endpointMap: Record<string, string> = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[type];
        const backlogStatus = statuses.find(s => s.name.toLowerCase() === 'backlog') || statuses[0];

        const payload: Record<string, any> = {
            name,
            status: statusId || backlogStatus?.id
        };

        if (type === 'STORY' && parentId) payload.epic = parentId;
        if (type === 'TASK' && parentId) payload.story = parentId;

        const res = await apiFetch(`/api/v2/${endpoint}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Create failed');

        // The dendrite event will trigger a refetch automatically.
        // But also manually refetch for immediate feedback.
        handleRefresh();
    }, [statuses, handleRefresh]);

    const selectedItem = selectedId ? items.find(i => i.id === selectedId) || null : null;

    const handleViewChange = (mode: ViewMode) => {
        const target = mode === 'backlog' ? '/pfc/backlog' : '/pfc';
        const params = searchParams.toString();
        navigate(target + (params ? `?${params}` : ''), { replace: true });
    };

    if (isLoading && items.length === 0) {
        return (
            <div className="pfc-page-loader">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    return (
        <ThreePanel
            left={
                <PFCNavTree
                    items={items}
                    selectedItemId={selectedId}
                    filterEpicId={epicFilter}
                    filterStoryId={storyFilter}
                    onItemSelect={handleItemSelect}
                    onFilterEpic={handleFilterEpic}
                    onFilterStory={handleFilterStory}
                    onCreateItem={handleCreateItem}
                />
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <div className="pfc-page-mode-bar">
                        <button
                            className={`pfc-page-mode-tab ${viewMode === 'board' ? 'pfc-page-mode-tab--active' : ''}`}
                            onClick={() => handleViewChange('board')}
                        >
                            <LayoutGrid size={14} /> Board
                        </button>
                        <button
                            className={`pfc-page-mode-tab ${viewMode === 'backlog' ? 'pfc-page-mode-tab--active' : ''}`}
                            onClick={() => handleViewChange('backlog')}
                        >
                            <List size={14} /> Backlog
                        </button>
                    </div>
                    <div className="pfc-page-stage">
                        {viewMode === 'board' ? (
                            <PrefrontalCortex
                                items={items}
                                statuses={statuses}
                                selectedItemId={selectedId}
                                filterEpicId={epicFilter}
                                filterStoryId={storyFilter}
                                onItemSelect={handleItemSelect}
                                onRefresh={handleRefresh}
                                onCreateItem={handleCreateItem}
                            />
                        ) : (
                            <PFCBacklog
                                items={items}
                                statuses={statuses}
                                selectedItemId={selectedId}
                                filterEpicId={epicFilter}
                                filterStoryId={storyFilter}
                                onItemSelect={handleItemSelect}
                                onCreateItem={handleCreateItem}
                            />
                        )}
                    </div>
                </div>
            }
            right={
                selectedItem ? (
                    <PFCInspector
                        item={selectedItem}
                        allItems={items}
                        statuses={statuses}
                        onUpdate={handleRefresh}
                        onDelete={() => setUrlParam('selected', null)}
                        isExpanded={isInspectorExpanded}
                        onToggleExpand={() => setIsInspectorExpanded(prev => !prev)}
                    />
                ) : (
                    <>
                        <h2 className="glass-panel-title">TICKET INSPECTOR</h2>
                        <div className="layout-placeholder font-mono text-sm">
                            Select an Agile Ticket to view or edit its details.
                        </div>
                    </>
                )
            }
            rightClassName={isInspectorExpanded ? 'three-panel-right--expanded' : undefined}
        />
    );
}

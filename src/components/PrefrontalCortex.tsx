import { useRef, useState, useEffect, useMemo } from 'react';
import { Loader2, ChevronLeft, ChevronRight, BrainCircuit, ChevronsUp, ChevronUp, Minus, ChevronDown, Cpu, History, Globe, Plus } from 'lucide-react';
import './PrefrontalCortex.css';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';

interface PrefrontalCortexProps {
    onItemSelect?: (item: PFCAgileItem) => void;
    selectedItemId?: string | null;
    onItemsChange?: (items: PFCAgileItem[]) => void;
    filterEpicId?: string | null;
    createModalType?: 'EPIC' | 'STORY' | 'TASK' | null;
    onCreateModalChange?: (type: 'EPIC' | 'STORY' | 'TASK' | null) => void;
}

interface PFCItemStatus {
    id: number;
    name: string;
}

interface RawEpic extends Partial<PFCAgileItem> {}
interface RawStory extends Partial<PFCAgileItem> { epic?: { id: string; name: string } }
interface RawTask extends Partial<PFCAgileItem> { story?: { id: string; name: string } }

export const PrefrontalCortex = ({ onItemSelect, selectedItemId, onItemsChange, filterEpicId, createModalType, onCreateModalChange }: PrefrontalCortexProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [dragOverStatus, setDragOverStatus] = useState<number | null>(null);

    // Creation Modal State (local only if not controlled from parent)
    const [localCreateModalType, setLocalCreateModalType] = useState<'EPIC' | 'STORY' | 'TASK' | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [newItemParent, setNewItemParent] = useState("");

    // Use controlled or local modal type
    const activeModalType = createModalType !== undefined ? createModalType : localCreateModalType;
    const setActiveModalType = onCreateModalChange || setLocalCreateModalType;

    // Refs for stable closure access in fetchData
    const selectedItemIdRef = useRef(selectedItemId);
    selectedItemIdRef.current = selectedItemId;
    const onItemSelectRef = useRef(onItemSelect);
    onItemSelectRef.current = onItemSelect;
    const onItemsChangeRef = useRef(onItemsChange);
    onItemsChangeRef.current = onItemsChange;

    const checkScroll = () => {
        if (boardRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = boardRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
        }
    };

    const scrollBoard = (direction: 'left' | 'right') => {
        if (boardRef.current) {
            boardRef.current.scrollBy({ left: direction === 'left' ? -336 : 336, behavior: 'smooth' });
        }
    };

    const fetchData = async (isInitial = false) => {
        if (isInitial) setIsLoading(true);
        try {
            const [statusRes, epicRes, storyRes, taskRes] = await Promise.all([
                fetch('/api/v2/pre-frontal-item-status/'),
                fetch('/api/v2/pfc-epics/?full=true'),
                fetch('/api/v2/pfc-stories/?full=true'),
                fetch('/api/v2/pfc-tasks/?full=true')
            ]);

            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setStatuses(statusData.results || statusData);
            }

            let allItems: PFCAgileItem[] = [];
            if (epicRes.ok) {
                const data = await epicRes.json();
                const epics = (data.results || data).map((e: RawEpic) => ({ ...e, item_type: 'EPIC' })) as PFCAgileItem[];
                allItems = [...allItems, ...epics];
            }
            if (storyRes.ok) {
                const data = await storyRes.json();
                const stories = (data.results || data).map((s: RawStory) => ({ ...s, item_type: 'STORY', parent_name: s.epic?.name, parent_id: s.epic?.id })) as PFCAgileItem[];
                allItems = [...allItems, ...stories];
            }
            if (taskRes.ok) {
                const data = await taskRes.json();
                const tasks = (data.results || data).map((t: RawTask) => ({ ...t, item_type: 'TASK', parent_name: t.story?.name, parent_id: t.story?.id })) as PFCAgileItem[];
                allItems = [...allItems, ...tasks];
            }

            setItems(allItems);
            onItemsChangeRef.current?.(allItems);

            if (selectedItemIdRef.current && onItemSelectRef.current) {
                const updatedSelected = allItems.find(i => i.id === selectedItemIdRef.current);
                if (updatedSelected) onItemSelectRef.current(updatedSelected);
            }

        } catch (err) {
            console.error("Failed to fetch PFC data:", err);
        } finally {
            if (isInitial) setIsLoading(false);
        }
    };

    // Initial fetch — runs once on mount
    useEffect(() => {
        fetchData(true);
    }, []);

    // Refresh listener — no loading flash
    useEffect(() => {
        const handlePfcRefresh = () => fetchData(false);
        window.addEventListener('pfc-refresh', handlePfcRefresh);
        return () => window.removeEventListener('pfc-refresh', handlePfcRefresh);
    }, []);

    useEffect(() => {
        // Wait for DOM to render before measuring scroll dimensions
        const raf = requestAnimationFrame(() => checkScroll());
        window.addEventListener('resize', checkScroll);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', checkScroll);
        };
    }, [statuses, items]);

    // Filter items by epic when filterEpicId is set
    const displayItems = useMemo(() => {
        if (!filterEpicId) return items;
        const epicStoryIds = items
            .filter(i => i.item_type === 'STORY' && i.parent_id === filterEpicId)
            .map(s => s.id);
        return items.filter(i =>
            i.id === filterEpicId ||
            i.parent_id === filterEpicId ||
            (i.item_type === 'TASK' && epicStoryIds.includes(i.parent_id || ''))
        );
    }, [items, filterEpicId]);

    const getPriorityIcon = (priority?: number) => {
        switch (priority) {
            case 1: return <span title="P1: Critical"><ChevronsUp size={14} color="#ef4444" /></span>;
            case 2: return <span title="P2: High"><ChevronUp size={14} color="#f99f1b" /></span>;
            case 3: return <span title="P3: Normal"><Minus size={14} color="#94a3b8" /></span>;
            case 4: return <span title="P4: Low"><ChevronDown size={14} color="#64748b" /></span>;
            default: return null;
        }
    };

    const handleDragStart = (e: React.DragEvent, item: PFCAgileItem) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ id: item.id, item_type: item.item_type }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetStatusId: number) => {
        e.preventDefault();
        setDragOverStatus(null);

        const payloadStr = e.dataTransfer.getData('application/json');
        if (!payloadStr) return;

        const payload = JSON.parse(payloadStr);
        if (!payload.item_type) return;

        const { id, item_type } = payload;
        const endpointMap = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[item_type as keyof typeof endpointMap];

        const targetStatusObj = statuses.find(s => s.id === targetStatusId);
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: targetStatusObj || i.status } : i));

        try {
            await apiFetch(`/api/v2/${endpoint}/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatusId })
            });
            fetchData();
        } catch (err) {
            console.error("Failed to update status", err);
            fetchData();
        }
    };

    const handleCreateSubmit = async () => {
        if (!newItemName.trim() || !activeModalType) return;

        const endpointMap = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[activeModalType];
        const backlogStatus = statuses.find(s => s.name.toLowerCase() === 'backlog') || statuses[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
            name: newItemName.trim(),
            status: backlogStatus?.id
        };

        if (activeModalType === 'STORY') payload.epic = newItemParent;
        if (activeModalType === 'TASK') payload.story = newItemParent;

        try {
            const res = await apiFetch(`/api/v2/${endpoint}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newItem = await res.json();
                setActiveModalType(null);
                setNewItemName("");
                setNewItemParent("");
                fetchData();
                if (onItemSelect) {
                    onItemSelect({ ...newItem, item_type: activeModalType, status: backlogStatus } as PFCAgileItem);
                }
            }
        } catch (err) {
            console.error(`Failed to create ${activeModalType}`, err);
        }
    };

    if (isLoading && items.length === 0) {
        return (
            <div className="pfc-container loader-container">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    const typeClass = activeModalType?.toLowerCase() || '';
    const isSubmitDisabled = !newItemName.trim() || (activeModalType !== 'EPIC' && !newItemParent);

    return (
        <div className="pfc-container">
            {/* Create Modal Overlay */}
            {activeModalType && (
                <div className="pfc-modal-overlay">
                    <div className={`pfc-modal-body pfc-modal-body--${typeClass}`}>
                        <h3 className={`pfc-modal-title pfc-modal-title--${typeClass}`}>
                            <Plus size={18} /> CREATE {activeModalType}
                        </h3>

                        <input className="pfc-modal-input"
                            autoFocus
                            placeholder={`Enter ${activeModalType} Name...`}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                        />

                        {activeModalType === 'STORY' && (
                            <select
                                value={newItemParent}
                                onChange={(e) => setNewItemParent(e.target.value)}
                                className={`pfc-modal-select ${newItemParent ? 'pfc-modal-select--has-value' : ''}`}
                            >
                                <option value="" disabled>Select Parent Epic...</option>
                                {items.filter(i => i.item_type === 'EPIC').map(epic => (
                                    <option key={epic.id} value={epic.id}>{epic.name}</option>
                                ))}
                            </select>
                        )}

                        {activeModalType === 'TASK' && (
                            <select
                                value={newItemParent}
                                onChange={(e) => setNewItemParent(e.target.value)}
                                className={`pfc-modal-select ${newItemParent ? 'pfc-modal-select--has-value' : ''}`}
                            >
                                <option value="" disabled>Select Parent Story...</option>
                                {items.filter(i => i.item_type === 'STORY').map(story => (
                                    <option key={story.id} value={story.id}>{story.name} (from {story.parent_name})</option>
                                ))}
                            </select>
                        )}

                        <div className="pfc-modal-button-row">
                            <button className="pfc-modal-cancel-btn" onClick={() => { setActiveModalType(null); setNewItemName(""); setNewItemParent(""); }}>Cancel</button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={isSubmitDisabled}
                                className={`pfc-modal-submit-btn pfc-modal-submit-btn--${typeClass}`}
                            >
                                Create Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="pfc-header">
                <div className="pfc-header-content">
                    <h3 className="font-display heading-tracking text-base m-0 text-primary common-layout-15">
                        <BrainCircuit size={18} color="#ef4444" />
                        PREFRONTAL CORTEX (AGILE BOARD)
                    </h3>
                </div>
            </div>

            <div className="pfc-board-wrapper">
                {canScrollLeft ? <button className="pfc-scroll-btn" onClick={() => scrollBoard('left')}><ChevronLeft size={24} /></button> : <div className="common-layout-31" />}

                <div className="pfc-board" ref={boardRef} onScroll={checkScroll}>
                    {statuses.map(status => {
                        const columnItems = displayItems.filter(i => i.status && i.status.id === status.id);
                        const isDragOver = dragOverStatus === status.id;

                        return (
                            <div
                                key={status.id}
                                className={`pfc-column ${isDragOver ? 'active' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status.id); }}
                                onDragLeave={() => setDragOverStatus(null)}
                                onDrop={(e) => handleDrop(e, status.id)}
                            >
                                <div className="pfc-column-header">
                                    <span className={`pfc-column-title ${isDragOver ? 'pfc-column-title--drag-over' : ''}`}>{status.name}</span>
                                    <span className="pfc-column-stats">{columnItems.length}</span>
                                </div>

                                <div className="pfc-column-body">
                                    {columnItems.map(item => {
                                        const isSelected = selectedItemId === item.id;
                                        const itemTypeClass = item.item_type.toLowerCase();

                                        return (
                                            <div
                                                key={`${item.item_type}-${item.id}`}
                                                className={`pfc-card pfc-card--${itemTypeClass} ${isSelected ? 'pfc-card--selected' : ''}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item)}
                                                onClick={() => onItemSelect && onItemSelect(item)}
                                            >
                                                <div className="pfc-card-header">
                                                    <div>
                                                        <div className="pfc-card-type-row">
                                                            <span className={`font-mono text-xs pfc-type-label--${itemTypeClass}`}>[{item.item_type}]</span>
                                                            {item.parent_name && <span className="font-mono text-xs text-muted">of {item.parent_name.substring(0, 15)}...</span>}
                                                        </div>
                                                        <div className="pfc-card-title">{item.name}</div>
                                                    </div>
                                                </div>

                                                {item.description && (
                                                    <div className="font-mono text-xs text-muted pfc-card-description-clamp">
                                                        {item.description}
                                                    </div>
                                                )}

                                                <div className="pfc-card-meta">
                                                    {item.priority !== undefined && (
                                                        <div className="pfc-card-priority-icon">
                                                            {getPriorityIcon(item.priority)}
                                                        </div>
                                                    )}

                                                    {item.item_type === 'EPIC' && item.environment && (
                                                        <span className="pfc-tag font-mono pfc-card-environment" title={`Scoped to Environment: ${item.environment.name}`}>
                                                            <Globe size={10} /> {item.environment.name}
                                                        </span>
                                                    )}

                                                    {item.owning_disc ? (
                                                        <span className="pfc-tag font-mono pfc-card-owner">
                                                            <Cpu size={10} /> {item.owning_disc.name}
                                                        </span>
                                                    ) : (
                                                        <span className="pfc-tag font-mono pfc-card-unassigned">
                                                            <Cpu size={10} /> Unassigned
                                                        </span>
                                                    )}

                                                    {item.previous_owners && item.previous_owners.length > 0 && (
                                                        <span className="pfc-tag font-mono pfc-card-prev-owners" title={`Previously touched by: ${item.previous_owners.map(p => p.name).join(', ')}`}>
                                                            <History size={10} /> {item.previous_owners.length}
                                                        </span>
                                                    )}

                                                    {item.complexity !== undefined && item.complexity > 0 && (
                                                        <span className="pfc-tag font-mono pfc-card-complexity">CX: {item.complexity}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className={`pfc-drop-zone ${isDragOver ? 'drag-over' : ''}`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {canScrollRight ? <button className="pfc-scroll-btn" onClick={() => scrollBoard('right')}><ChevronRight size={24} /></button> : <div className="common-layout-31" />}
            </div>
        </div>
    );
};

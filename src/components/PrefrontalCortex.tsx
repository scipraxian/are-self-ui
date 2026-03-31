import { useRef, useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, BrainCircuit, ChevronsUp, ChevronUp, Minus, ChevronDown, Cpu, History, Globe } from 'lucide-react';
import { PFCInlineCreate } from './PFCInlineCreate';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import './PrefrontalCortex.css';

export interface PFCItemStatus {
    id: number;
    name: string;
}

interface PrefrontalCortexProps {
    items: PFCAgileItem[];
    statuses: PFCItemStatus[];
    selectedItemId?: string | null;
    filterEpicId?: string | null;
    filterStoryId?: string | null;
    onItemSelect: (item: PFCAgileItem) => void;
    onRefresh: () => void;
    onCreateItem: (name: string, type: 'EPIC' | 'STORY' | 'TASK', parentId?: string, statusId?: number) => Promise<void>;
}

export const PrefrontalCortex = ({
    items, statuses, selectedItemId, filterEpicId, filterStoryId,
    onItemSelect, onRefresh, onCreateItem
}: PrefrontalCortexProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [dragOverStatus, setDragOverStatus] = useState<number | null>(null);

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

    useEffect(() => {
        const raf = requestAnimationFrame(() => checkScroll());
        window.addEventListener('resize', checkScroll);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', checkScroll);
        };
    }, [statuses, items]);

    // Filter items by epic/story
    const displayItems = useMemo(() => {
        if (filterStoryId) {
            return items.filter(i =>
                i.id === filterStoryId ||
                (i.item_type === 'TASK' && i.parent_id === filterStoryId)
            );
        }
        if (filterEpicId) {
            const epicStoryIds = items
                .filter(i => i.item_type === 'STORY' && i.parent_id === filterEpicId)
                .map(s => s.id);
            return items.filter(i =>
                i.id === filterEpicId ||
                i.parent_id === filterEpicId ||
                (i.item_type === 'TASK' && epicStoryIds.includes(i.parent_id || ''))
            );
        }
        return items;
    }, [items, filterEpicId, filterStoryId]);

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
        const endpointMap: Record<string, string> = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[item_type];

        try {
            await apiFetch(`/api/v2/${endpoint}/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: targetStatusId })
            });
            onRefresh();
        } catch (err) {
            console.error("Failed to update status", err);
            onRefresh();
        }
    };

    // Determine the default parent for new tasks created in a column
    const getDefaultParent = (): string | undefined => {
        if (filterStoryId) return filterStoryId;
        // If filtering by epic, pick the first story of that epic
        if (filterEpicId) {
            const firstStory = items.find(i => i.item_type === 'STORY' && i.parent_id === filterEpicId);
            return firstStory?.id;
        }
        return undefined;
    };

    return (
        <div className="pfc-container">
            <div className="pfc-header">
                <div className="pfc-header-content">
                    <h3 className="font-display heading-tracking text-base m-0 text-primary common-layout-15">
                        <BrainCircuit size={18} color="#ef4444" />
                        AGILE BOARD
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
                                                onClick={() => onItemSelect(item)}
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
                                    <PFCInlineCreate
                                        itemType="TASK"
                                        parentId={getDefaultParent()}
                                        statusId={status.id}
                                        onSubmit={(name, parentId, statusId) => onCreateItem(name, 'TASK', parentId, statusId)}
                                        compact
                                    />
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

import { useRef, useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, BrainCircuit, ChevronsUp, ChevronUp, Minus, ChevronDown, Cpu, History, Globe, Plus } from 'lucide-react';
import './PrefrontalCortex.css';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';

interface PrefrontalCortexProps {
    onItemSelect?: (item: PFCAgileItem) => void;
    selectedItemId?: string | null;
}

interface PFCItemStatus {
    id: number;
    name: string;
}

interface RawEpic extends Partial<PFCAgileItem> {}
interface RawStory extends Partial<PFCAgileItem> { epic?: { name: string } }
interface RawTask extends Partial<PFCAgileItem> { story?: { name: string } }

export const PrefrontalCortex = ({ onItemSelect, selectedItemId }: PrefrontalCortexProps) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [dragOverStatus, setDragOverStatus] = useState<number | null>(null);

    // Creation Modal State
    const [createModalType, setCreateModalType] = useState<'EPIC' | 'STORY' | 'TASK' | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [newItemParent, setNewItemParent] = useState("");

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

    const fetchData = async () => {
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
                const stories = (data.results || data).map((s: RawStory) => ({ ...s, item_type: 'STORY', parent_name: s.epic?.name })) as PFCAgileItem[];
                allItems = [...allItems, ...stories];
            }
            if (taskRes.ok) {
                const data = await taskRes.json();
                const tasks = (data.results || data).map((t: RawTask) => ({ ...t, item_type: 'TASK', parent_name: t.story?.name })) as PFCAgileItem[];
                allItems = [...allItems, ...tasks];
            }

            setItems(allItems);

            if (selectedItemId && onItemSelect) {
                const updatedSelected = allItems.find(i => i.id === selectedItemId);
                if (updatedSelected) onItemSelect(updatedSelected);
            }

        } catch (err) {
            console.error("Failed to fetch PFC data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 3000);
        return () => clearInterval(intervalId);
    }, [selectedItemId]);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [statuses, items]);

    const getItemColor = (type: string | null) => {
        if (type === 'EPIC') return '#a855f7';
        if (type === 'STORY') return '#3b82f6';
        if (type === 'TASK') return '#4ade80';
        return '#cbd5e1';
    };

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
        if (!newItemName.trim() || !createModalType) return;

        const endpointMap = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
        const endpoint = endpointMap[createModalType];
        const backlogStatus = statuses.find(s => s.name.toLowerCase() === 'backlog') || statuses[0];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const payload: any = {
            name: newItemName.trim(),
            status: backlogStatus?.id
        };

        if (createModalType === 'STORY') payload.epic = newItemParent;
        if (createModalType === 'TASK') payload.story = newItemParent;

        try {
            const res = await apiFetch(`/api/v2/${endpoint}/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const newItem = await res.json();
                setCreateModalType(null);
                setNewItemName("");
                setNewItemParent("");
                fetchData();
                if (onItemSelect) {
                    onItemSelect({ ...newItem, item_type: createModalType, status: backlogStatus } as PFCAgileItem);
                }
            }
        } catch (err) {
            console.error(`Failed to create ${createModalType}`, err);
        }
    };

    if (isLoading && items.length === 0) {
        return (
            <div className="pfc-container loader-container">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    return (
        <div className="pfc-container">
            {/* Create Modal Overlay */}
            {createModalType && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: '#0f172a', border: `1px solid ${getItemColor(createModalType)}50`, padding: '24px', borderRadius: '12px', width: '400px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${getItemColor(createModalType)}20` }}>
                        <h3 style={{ margin: 0, color: getItemColor(createModalType), display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Outfit, sans-serif' }}>
                            <Plus size={18} /> CREATE {createModalType}
                        </h3>

                        <input
                            autoFocus
                            placeholder={`Enter ${createModalType} Name...`}
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            style={{ background: '#020617', border: '1px solid #334155', color: '#f8fafc', padding: '12px', borderRadius: '6px', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                        />

                        {createModalType === 'STORY' && (
                            <select
                                value={newItemParent}
                                onChange={(e) => setNewItemParent(e.target.value)}
                                style={{ background: '#020617', border: '1px solid #334155', color: newItemParent ? '#f8fafc' : '#64748b', padding: '12px', borderRadius: '6px', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                            >
                                <option value="" disabled>Select Parent Epic...</option>
                                {items.filter(i => i.item_type === 'EPIC').map(epic => (
                                    <option key={epic.id} value={epic.id}>{epic.name}</option>
                                ))}
                            </select>
                        )}

                        {createModalType === 'TASK' && (
                            <select
                                value={newItemParent}
                                onChange={(e) => setNewItemParent(e.target.value)}
                                style={{ background: '#020617', border: '1px solid #334155', color: newItemParent ? '#f8fafc' : '#64748b', padding: '12px', borderRadius: '6px', outline: 'none', fontFamily: 'Inter, sans-serif' }}
                            >
                                <option value="" disabled>Select Parent Story...</option>
                                {items.filter(i => i.item_type === 'STORY').map(story => (
                                    <option key={story.id} value={story.id}>{story.name} (from {story.parent_name})</option>
                                ))}
                            </select>
                        )}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                            <button onClick={() => { setCreateModalType(null); setNewItemName(""); setNewItemParent(""); }} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                            <button
                                onClick={handleCreateSubmit}
                                disabled={!newItemName.trim() || (createModalType !== 'EPIC' && !newItemParent)}
                                style={{ flex: 1, padding: '10px', background: getItemColor(createModalType), border: 'none', color: '#020617', fontWeight: 800, borderRadius: '6px', cursor: 'pointer', opacity: (!newItemName.trim() || (createModalType !== 'EPIC' && !newItemParent)) ? 0.5 : 1 }}
                            >
                                Create Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="pfc-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BrainCircuit size={18} color="#ef4444" />
                        PREFRONTAL CORTEX (AGILE BOARD)
                    </h3>

                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '16px' }}>
                        <button onClick={() => setCreateModalType('EPIC')} className="btn-ghost" style={{ borderColor: '#a855f720', color: '#a855f7', background: '#a855f710', padding: '4px 10px', fontSize: '0.75rem' }}><Plus size={12}/> EPIC</button>
                        <button onClick={() => setCreateModalType('STORY')} className="btn-ghost" style={{ borderColor: '#3b82f620', color: '#3b82f6', background: '#3b82f610', padding: '4px 10px', fontSize: '0.75rem' }}><Plus size={12}/> STORY</button>
                        <button onClick={() => setCreateModalType('TASK')} className="btn-ghost" style={{ borderColor: '#4ade8020', color: '#4ade80', background: '#4ade8010', padding: '4px 10px', fontSize: '0.75rem' }}><Plus size={12}/> TASK</button>
                    </div>
                </div>
            </div>

            <div className="pfc-board-wrapper">
                {canScrollLeft ? <button className="pfc-scroll-btn" onClick={() => scrollBoard('left')}><ChevronLeft size={24} /></button> : <div style={{ width: '36px', flexShrink: 0 }} />}

                <div className="pfc-board" ref={boardRef} onScroll={checkScroll}>
                    {statuses.map(status => {
                        const columnItems = items.filter(i => i.status && i.status.id === status.id);
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
                                    <span className="pfc-column-title" style={{ color: isDragOver ? 'var(--accent-purple)' : 'inherit' }}>{status.name}</span>
                                    <span className="pfc-column-stats">{columnItems.length}</span>
                                </div>

                                <div className="pfc-column-body">
                                    {columnItems.map(item => {
                                        const isSelected = selectedItemId === item.id;
                                        const itemColor = getItemColor(item.item_type);

                                        return (
                                            <div
                                                key={`${item.item_type}-${item.id}`}
                                                className="pfc-card"
                                                style={{
                                                    borderLeftColor: itemColor,
                                                    borderColor: isSelected ? itemColor : 'var(--border-glass-strong)',
                                                    boxShadow: isSelected ? `0 0 15px ${itemColor}40` : 'none'
                                                }}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, item)}
                                                onClick={() => onItemSelect && onItemSelect(item)}
                                            >
                                                <div className="pfc-card-header">
                                                    <div>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                                                            <span className="font-mono text-xs" style={{ color: itemColor, fontWeight: 800 }}>[{item.item_type}]</span>
                                                            {item.parent_name && <span className="font-mono text-xs text-muted">of {item.parent_name.substring(0, 15)}...</span>}
                                                        </div>
                                                        <div className="pfc-card-title">{item.name}</div>
                                                    </div>
                                                </div>

                                                {item.description && (
                                                    <div className="font-mono text-xs text-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        {item.description}
                                                    </div>
                                                )}

                                                <div className="pfc-card-meta">
                                                    {item.priority !== undefined && (
                                                        <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '2px', borderRadius: '4px' }}>
                                                            {getPriorityIcon(item.priority)}
                                                        </div>
                                                    )}

                                                    {item.item_type === 'EPIC' && item.environment && (
                                                        <span className="pfc-tag font-mono" title={`Scoped to Environment: ${item.environment.name}`} style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(56, 189, 248, 0.2)', background: 'rgba(56, 189, 248, 0.05)' }}>
                                                            <Globe size={10} /> {item.environment.name}
                                                        </span>
                                                    )}

                                                    {item.owning_disc ? (
                                                        <span className="pfc-tag font-mono" style={{ color: 'var(--bg-obsidian)', background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Cpu size={10} /> {item.owning_disc.name}
                                                        </span>
                                                    ) : (
                                                        <span className="pfc-tag font-mono" style={{ color: 'var(--text-muted)', borderStyle: 'dashed', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <Cpu size={10} /> Unassigned
                                                        </span>
                                                    )}

                                                    {item.previous_owners && item.previous_owners.length > 0 && (
                                                        <span className="pfc-tag font-mono" title={`Previously touched by: ${item.previous_owners.map(p => p.name).join(', ')}`} style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <History size={10} /> {item.previous_owners.length}
                                                        </span>
                                                    )}

                                                    {item.complexity !== undefined && item.complexity > 0 && (
                                                        <span className="pfc-tag font-mono" style={{ color: 'var(--accent-green)' }}>CX: {item.complexity}</span>
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
                {canScrollRight ? <button className="pfc-scroll-btn" onClick={() => scrollBoard('right')}><ChevronRight size={24} /></button> : <div style={{ width: '36px', flexShrink: 0 }} />}
            </div>
        </div>
    );
};
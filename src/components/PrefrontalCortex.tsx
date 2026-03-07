import { useRef, useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, BrainCircuit } from 'lucide-react';
import './PrefrontalCortex.css';

// --- STRICT TYPESCRIPT INTERFACES ---
interface PFCItemStatus {
    id: number;
    name: string;
}

interface PFCTag {
    id: number;
    name: string;
}

interface IdentityDisc {
    id: number;
    name: string;
    level: number;
    xp: number;
    available: boolean;
}

interface PFCEpic {
    id: string;
    name: string;
    description: string;
    status: PFCItemStatus;
    complexity: number;
    tags: PFCTag[];
    owning_disc: IdentityDisc | null;
}

interface PFCStory {
    id: string;
    name: string;
    description: string;
    status: PFCItemStatus;
    epic: PFCEpic;
    complexity: number;
    tags: PFCTag[];
    owning_disc: IdentityDisc | null;
}

// CSRF Helper
function getCookie(name: string): string | null {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Unified Interface
interface PFCAgileItem {
    id: string;
    item_type: 'EPIC' | 'STORY' | 'TASK';
    name: string;
    description: string;
    status: { id: number; name: string };
    complexity?: number;
    priority?: number;
    tags: { id: number; name: string }[];
    owning_disc: { id: number; name: string } | null;
    parent_name?: string;
}

export const PrefrontalCortex = () => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const [statuses, setStatuses] = useState<any[]>([]);
    const [items, setItems] = useState<PFCAgileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                const epics = (data.results || data).map((e: any) => ({ ...e, item_type: 'EPIC' }));
                allItems = [...allItems, ...epics];
            }
            if (storyRes.ok) {
                const data = await storyRes.json();
                const stories = (data.results || data).map((s: any) => ({ ...s, item_type: 'STORY', parent_name: s.epic?.name }));
                allItems = [...allItems, ...stories];
            }
            if (taskRes.ok) {
                const data = await taskRes.json();
                const tasks = (data.results || data).map((t: any) => ({ ...t, item_type: 'TASK', parent_name: t.story?.name }));
                allItems = [...allItems, ...tasks];
            }

            setItems(allItems);
        } catch (err) {
            console.error("Failed to fetch PFC data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Optional: Set an interval here to watch the PM work live!
        const intervalId = setInterval(fetchData, 3000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [statuses, items]);

    const getItemColor = (type: string) => {
        if (type === 'EPIC') return '#a855f7'; // Purple
        if (type === 'STORY') return '#3b82f6'; // Blue
        return '#4ade80'; // Green Task
    };

    if (isLoading) {
        return (
            <div className="pfc-container loader-container">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    return (
        <div className="pfc-container">
            <div className="pfc-header">
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BrainCircuit size={18} color="#ef4444" />
                        PREFRONTAL CORTEX (AGILE BOARD)
                    </h3>
                </div>
            </div>

            <div className="pfc-board-wrapper">
                {canScrollLeft ? <button className="pfc-scroll-btn" onClick={() => scrollBoard('left')}><ChevronLeft size={24} /></button> : <div style={{ width: '36px', flexShrink: 0 }} />}

                <div className="pfc-board" ref={boardRef} onScroll={checkScroll}>
                    {statuses.map(status => {
                        const columnItems = items.filter(i => i.status && i.status.id === status.id);

                        return (
                            <div key={status.id} className="pfc-column">
                                <div className="pfc-column-header">
                                    <span className="pfc-column-title">{status.name}</span>
                                    <span className="pfc-column-stats">{columnItems.length}</span>
                                </div>

                                <div className="pfc-column-body">
                                    {columnItems.map(item => (
                                        <div key={`${item.item_type}-${item.id}`} className="pfc-card" style={{ borderLeftColor: getItemColor(item.item_type) }}>
                                            <div className="pfc-card-header">
                                                <div>
                                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                                                        <span className="font-mono text-xs" style={{ color: getItemColor(item.item_type), fontWeight: 800 }}>[{item.item_type}]</span>
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
                                                {item.owning_disc && (
                                                    <span className="pfc-tag font-mono" style={{ color: 'var(--bg-obsidian)', background: 'var(--accent-gold)', borderColor: 'var(--accent-gold)' }}>
                                                        {item.owning_disc.name}
                                                    </span>
                                                )}
                                                {item.complexity !== undefined && item.complexity > 0 && (
                                                    <span className="pfc-tag font-mono" style={{ color: 'var(--accent-green)' }}>CX: {item.complexity}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
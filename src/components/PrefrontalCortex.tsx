import { useRef, useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight, BrainCircuit, MoreVertical } from 'lucide-react';
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

export const PrefrontalCortex = () => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // API State
    const [statuses, setStatuses] = useState<PFCItemStatus[]>([]);
    const [stories, setStories] = useState<PFCStory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
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
            const scrollAmount = 336;
            boardRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const fetchData = async () => {
        try {
            const [statusRes, storyRes] = await Promise.all([
                fetch('/api/v2/pre-frontal-item-status/'),
                fetch('/api/v2/pfc-stories/?full=true')
            ]);
            if (statusRes.ok) {
                const statusData = await statusRes.json();
                setStatuses(statusData.results || statusData);
            }
            if (storyRes.ok) {
                const storyData = await storyRes.json();
                setStories(storyData.results || storyData);
            }
        } catch (err) {
            console.error("Failed to fetch PFC data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [statuses, stories]);

    const handleDrop = async (e: React.DragEvent, statusId: number) => {
        e.preventDefault();
        setDragOverStatus(null);

        const payload = e.dataTransfer.getData('application/json');
        if (!payload) return;

        const { type, id: droppedStoryId } = JSON.parse(payload);
        if (type !== 'story') return;

        // Optimistic update
        setStories(prev => prev.map(s => {
            if (s.id === droppedStoryId) {
                const newStatus = statuses.find(st => st.id === statusId);
                return newStatus ? { ...s, status: newStatus } : s;
            }
            return s;
        }));

        const csrfToken = getCookie('csrftoken');
        try {
            const res = await fetch(`/api/v2/pfc-stories/${droppedStoryId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
                body: JSON.stringify({ status: statusId })
            });

            if (!res.ok) {
                console.error("Failed to update story status");
                // Revert fetch on failure
                fetchData();
            }
        } catch (err) {
            console.error("Network error during drop:", err);
            fetchData();
        }
    };

    const handleDragStart = (e: React.DragEvent, story: PFCStory) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'story', id: story.id }));
        e.dataTransfer.effectAllowed = 'move';
    };

    if (isLoading) {
        return (
            <div className="pfc-container loader-container">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    if (statuses.length === 0) {
        return (
            <div className="pfc-container loader-container">
                <BrainCircuit size={48} className="text-muted" style={{ opacity: 0.2 }} />
                <h2 className="font-display heading-tracking text-lg m-0 text-primary">Prefrontal Cortex</h2>
                <p className="text-muted font-mono text-sm m-0">No item statuses defined.</p>
            </div>
        );
    }

    return (
        <div className="pfc-container">
            <div className="pfc-header">
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BrainCircuit size={18} color="#a855f7" />
                        PREFRONTAL CORTEX (LOGIC & PLANNING)
                    </h3>
                    <div className="font-mono text-xs text-muted" style={{ marginTop: '4px' }}>
                        Active Strategies & Tactics
                    </div>
                </div>
            </div>

            <div className="pfc-board-wrapper">
                {canScrollLeft ? (
                    <button className="pfc-scroll-btn" onClick={() => scrollBoard('left')}>
                        <ChevronLeft size={24} />
                    </button>
                ) : <div style={{ width: '36px', flexShrink: 0 }} />}

                <div className="pfc-board" ref={boardRef} onScroll={checkScroll}>

                    {statuses.map(status => {
                        const columnStories = stories.filter(s => s.status && s.status.id === status.id);

                        return (
                            <div key={status.id} className="pfc-column">
                                <div className="pfc-column-header">
                                    <span className="pfc-column-title">
                                        {status.name}
                                    </span>
                                    <span className="pfc-column-stats" title="Items">{columnStories.length}</span>
                                </div>

                                <div
                                    className={`pfc-column-body ${dragOverStatus === status.id ? 'drag-over' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverStatus(status.id); }}
                                    onDragLeave={() => setDragOverStatus(null)}
                                    onDrop={(e) => handleDrop(e, status.id)}
                                >
                                    {columnStories.map(story => (
                                        <div
                                            key={story.id}
                                            className="pfc-card"
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, story)}
                                        >
                                            <div className="pfc-card-header">
                                                <div>
                                                    {story.epic && (
                                                        <div className="pfc-card-epic-name">{story.epic.name}</div>
                                                    )}
                                                    <div className="pfc-card-title">{story.name}</div>
                                                </div>
                                                <button
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    title="Options"
                                                >
                                                    <MoreVertical size={14} className="text-muted" style={{ transition: 'color 0.2s' }}
                                                        onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-purple)'}
                                                        onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    />
                                                </button>
                                            </div>

                                            {story.description && (
                                                <div className="font-mono text-xs text-muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {story.description}
                                                </div>
                                            )}

                                            <div className="pfc-card-meta">
                                                {story.complexity > 0 && (
                                                    <span className="pfc-tag font-mono" style={{ color: 'var(--accent-green)', borderColor: 'rgba(74, 222, 128, 0.3)' }}>
                                                        CX: {story.complexity}
                                                    </span>
                                                )}
                                                {story.owning_disc && (
                                                    <span className="pfc-tag font-mono" style={{ color: 'var(--accent-blue)', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
                                                        {story.owning_disc.name}
                                                    </span>
                                                )}
                                                {story.tags && story.tags.map(tag => (
                                                    <span key={tag.id} className="pfc-tag">
                                                        {tag.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pfc-drop-zone"></div>
                                </div>
                            </div>
                        );
                    })}

                </div>

                {canScrollRight ? (
                    <button className="pfc-scroll-btn" onClick={() => scrollBoard('right')}>
                        <ChevronRight size={24} />
                    </button>
                ) : <div style={{ width: '36px', flexShrink: 0 }} />}
            </div>
        </div>
    );
};

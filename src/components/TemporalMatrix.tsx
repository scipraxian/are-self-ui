import { useRef, useState, useEffect } from 'react';
import { Play, MoreVertical, ChevronLeft, ChevronRight, Loader2, Network } from 'lucide-react';
import './TemporalMatrix.css';

// --- STRICT TYPESCRIPT INTERFACES ---
interface DiscData {
    id: number;
    name: string;
    level: number;
    xp: number;
    available: boolean;
}

interface ParticipantData {
    id: number;
    disc: DiscData;
}

interface ShiftData {
    id: number;
    name: string;
    turn_limit: number;
    participants: ParticipantData[];
}

interface IterationData {
    id: number;
    name: string;
    definition_name: string;
    status_name: string;
    current_shift: number | null;
    turns_consumed_in_shift: number;
    shifts: ShiftData[];
}

interface BlueprintData {
    id: number;
    name: string;
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

export const TemporalMatrix = () => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // API State using Strict Types
    const [iteration, setIteration] = useState<IterationData | null>(null);
    const [blueprints, setBlueprints] = useState<BlueprintData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isGestating, setIsGestating] = useState(false);
    const [dragOverShift, setDragOverShift] = useState<number | null>(null);

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

    useEffect(() => {
        fetch('/api/v2/iterations/')
            .then(res => res.json())
            .then(data => {
                const results: IterationData[] = data.results || data;
                if (results.length > 0) {
                    setIteration(results[0]);
                } else {
                    fetch('/api/v2/iteration-definitions/')
                        .then(res => res.json())
                        .then(defData => setBlueprints(defData.results || defData));
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Temporal fetch failed:", err);
                setIsLoading(false);
            });
    }, []);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [iteration]);

    const handleIncept = async (definitionId: number) => {
        setIsGestating(true);
        const csrfToken = getCookie('csrftoken');

        try {
            const res = await fetch('/api/v2/iterations/incept/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
                body: JSON.stringify({ definition_id: definitionId })
            });

            if (res.ok) {
                const newIteration: IterationData = await res.json();
                setIteration(newIteration);
            } else {
                console.error("Failed to incept.");
            }
        } catch (err) {
            console.error("Network error:", err);
        } finally {
            setIsGestating(false);
        }
    };

    const handleRemoveWorker = async (shiftId: number, discId: number) => {
        if (!iteration) return;
        const csrfToken = getCookie('csrftoken');

        try {
            const res = await fetch(`/api/v2/iterations/${iteration.id}/remove_disc/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
                body: JSON.stringify({ shift_id: shiftId, disc_id: discId })
            });
            if (res.ok) {
                const updatedIteration: IterationData = await res.json();
                setIteration(updatedIteration);
                window.dispatchEvent(new Event('sync-roster'));
            }
        } catch (err) {
            console.error("Failed to remove worker:", err);
        }
    };

    const handleDrop = async (e: React.DragEvent, shiftId: number) => {
        e.preventDefault();
        setDragOverShift(null);
        if (!iteration) return;

        const payload = e.dataTransfer.getData('application/json');
        if (!payload) return;

        const { type, id: droppedId } = JSON.parse(payload);

        const payloadBody: Record<string, number> = { shift_id: shiftId };
        if (type === 'disc') payloadBody.disc_id = droppedId;
        if (type === 'base') payloadBody.base_id = droppedId;

        const csrfToken = getCookie('csrftoken');

        try {
            const res = await fetch(`/api/v2/iterations/${iteration.id}/slot_disc/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
                body: JSON.stringify(payloadBody)
            });

            if (res.ok) {
                const updatedIteration: IterationData = await res.json();
                setIteration(updatedIteration);
                window.dispatchEvent(new Event('sync-roster'));
            }
        } catch (err) {
            console.error("Neural slotting failed:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="temporal-matrix-container gestation-chamber">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    if (!iteration) {
        return (
            <div className="temporal-matrix-container gestation-chamber">
                <Network size={48} className="text-muted" style={{ opacity: 0.2 }} />
                <h2 className="font-display heading-tracking text-lg m-0 text-primary">Gestation Chamber</h2>
                <p className="text-muted font-mono text-sm m-0">No active timelines. Select a structural blueprint to incept.</p>

                <div className="gestation-blueprints">
                    {blueprints.map(bp => (
                        <button
                            key={bp.id}
                            className="btn-ghost"
                            onClick={() => handleIncept(bp.id)}
                            disabled={isGestating}
                        >
                            {isGestating ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                            INCEPT: {bp.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="temporal-matrix-container">
            <div className="matrix-header">
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary">
                        {iteration.definition_name || 'Standard Iteration'}
                    </h3>
                    <div className="font-mono text-xs text-muted" style={{ marginTop: '4px' }}>
                        Iteration ID: {iteration.id} | Status: {iteration.status_name}
                    </div>
                </div>
                <button className="btn-action">
                    <Play size={14} fill="currentColor" />
                    INITIATE
                </button>
            </div>

            <div className="matrix-board-wrapper">
                {canScrollLeft ? (
                    <button className="matrix-scroll-btn" onClick={() => scrollBoard('left')}>
                        <ChevronLeft size={24} />
                    </button>
                ) : <div style={{ width: '36px', flexShrink: 0 }} />}

                <div className="matrix-board" ref={boardRef} onScroll={checkScroll}>

                    {iteration.shifts?.map((shift: ShiftData, index: number) => {
                        const isActive = iteration.current_shift === shift.id;

                        return (
                            <div key={shift.id} className={`matrix-column ${isActive ? 'active' : ''}`}>
                                <div className="matrix-column-header">
                                    <span className={`matrix-column-title ${isActive ? 'active-text' : ''}`}>
                                        {index + 1}. {shift.name}
                                    </span>
                                    <span className="matrix-column-stats" title="Turn Limit">0 / {shift.turn_limit}</span>
                                </div>

                                <div
                                    className={`matrix-column-body ${dragOverShift === shift.id ? 'drag-over' : ''}`}
                                    onDragOver={(e) => { e.preventDefault(); setDragOverShift(shift.id); }}
                                    onDragLeave={() => setDragOverShift(null)}
                                    onDrop={(e) => handleDrop(e, shift.id)}
                                >

                                    {shift.participants?.map((participant: ParticipantData) => (
                                        <div key={participant.id} className="slotted-card">
                                            <div className="slotted-card-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="slotted-card-title">{participant.disc.name}</span>
                                                    {isActive && <span className="status-dot status-active-pulse"></span>}
                                                </div>
                                                <button
                                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveWorker(shift.id, participant.disc.id);
                                                    }}
                                                    title="Remove from Shift"
                                                >
                                                    <MoreVertical size={14} className="text-muted" style={{ transition: 'color 0.2s' }}
                                                                  onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                                                                  onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                    />
                                                </button>
                                            </div>
                                            <div className="font-mono text-xs text-secondary" style={{ display: 'flex', gap: '12px' }}>
                                                <span>Lvl {participant.disc.level}</span>
                                                <span>XP: {participant.disc.xp}</span>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="matrix-drop-zone"></div>
                                </div>
                            </div>
                        );
                    })}

                </div>

                {canScrollRight ? (
                    <button className="matrix-scroll-btn" onClick={() => scrollBoard('right')}>
                        <ChevronRight size={24} />
                    </button>
                ) : <div style={{ width: '36px', flexShrink: 0 }} />}
            </div>
        </div>
    );
};
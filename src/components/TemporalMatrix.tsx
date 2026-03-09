import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, MoreVertical, ChevronLeft, ChevronRight, Loader2, Network, Plus } from 'lucide-react';
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
    environment: string | null;
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

interface TemporalMatrixProps {
    onSelectionChange?: (hasSelection: boolean) => void;
}

export const TemporalMatrix = ({ onSelectionChange }: TemporalMatrixProps = {}) => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // API State using Strict Types
    const [iterations, setIterations] = useState<IterationData[]>([]);
    const [selectedIterationId, setSelectedIterationId] = useState<number | null>(null);
    const [blueprints, setBlueprints] = useState<BlueprintData[]>([]);
    const [environments, setEnvironments] = useState<{ id: string, name: string }[]>([]);
    const [selectedGestationEnvironmentId, setSelectedGestationEnvironmentId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isGestating, setIsGestating] = useState(false);
    const [dragOverShift, setDragOverShift] = useState<number | null>(null);

    const iteration = iterations.find(it => it.id === selectedIterationId) || null;

    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedIterationId !== null);
        }
    }, [selectedIterationId, onSelectionChange]);

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setPortalTarget(document.getElementById('bbb-iteration-roster-portal'));
    }, [selectedIterationId]);


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
        setIsLoading(true);
        Promise.all([
            fetch('/api/v2/iterations/').then(res => res.json()),
            fetch('/api/v2/iteration-definitions/').then(res => res.json()),
            fetch('/api/v1/environments/').then(res => res.json())
        ]).then(([iterData, defData, envData]) => {
            const results: IterationData[] = iterData.results || iterData;
            setIterations(results);
            if (results.length > 0) {
                setSelectedIterationId(results[0].id);
            }
            setBlueprints(defData.results || defData);
            setEnvironments(envData.results || envData);
            setIsLoading(false);
        }).catch(err => {
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
                body: JSON.stringify({
                    definition_id: definitionId,
                    environment_id: selectedGestationEnvironmentId
                })
            });

            if (res.ok) {
                const newIteration: IterationData = await res.json();
                setIterations(prev => [newIteration, ...prev]);
                setSelectedIterationId(newIteration.id);
            } else {
                console.error("Failed to incept.");
            }
        } catch (err) {
            console.error("Network error:", err);
        } finally {
            setIsGestating(false);
        }
    };

    const updateIterationState = (updatedIteration: IterationData) => {
        setIterations(prev => prev.map(it => it.id === updatedIteration.id ? updatedIteration : it));
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
                updateIterationState(updatedIteration);
                window.dispatchEvent(new Event('sync-roster'));
            }
        } catch (err) {
            console.error("Failed to remove worker:", err);
        }
    };
    const handleInitiate = async () => {
        if (!iteration) return;
        if (iteration.status_name !== 'Waiting') return;
        const csrfToken = getCookie('csrftoken');
        try {
            const res = await fetch(`/api/v2/iterations/${iteration.id}/initiate/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' }
            });
            if (res.ok) {
                const updatedIteration: IterationData = await res.json();
                updateIterationState(updatedIteration);
            } else {
                console.error("Failed to initiate.");
            }
        } catch (err) {
            console.error("Network error:", err);
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
                updateIterationState(updatedIteration);
                window.dispatchEvent(new Event('sync-roster'));
            }
        } catch (err) {
            console.error("Neural slotting failed:", err);
        }
    };

    if (isLoading) {
        return (
            <div className="temporal-matrix-layout">
                <div className="temporal-matrix-container gestation-chamber">
                    <Loader2 className="animate-spin text-muted" size={32} />
                </div>
            </div>
        );
    }

    const iterationRosterSidebar = (
        <div className="iteration-roster-sidebar" style={{ borderRight: 'none', background: 'transparent', width: '100%', padding: '0 0 16px 0' }}>
            <button
                className="btn-new-iteration"
                onClick={() => setSelectedIterationId(null)}
                style={{ marginBottom: '16px' }}
            >
                <Plus size={16} /> New Iteration
            </button>
            <div className="roster-list">
                {iterations.map(it => (
                    <div
                        key={it.id}
                        className={`roster-item ${it.id === selectedIterationId ? 'active' : ''}`}
                        onClick={() => setSelectedIterationId(it.id)}
                    >
                        <div className="roster-item-title">{it.name || `Iteration ${it.id}`}</div>
                        <div className="roster-item-status">{it.status_name}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="temporal-matrix-layout">
            {portalTarget && !selectedIterationId && createPortal(iterationRosterSidebar, portalTarget)}

            <div className="temporal-matrix-main" style={{ padding: selectedIterationId ? '24px' : '0' }}>
                {!iteration ? (
                    <div className="temporal-matrix-container gestation-chamber">
                        <Network size={48} className="text-muted temporalmatrix-ui-210" />
                        <h2 className="font-display heading-tracking text-lg m-0 text-primary">Gestation Chamber</h2>
                        <p className="text-muted font-mono text-sm m-0">No active timelines. Select an environment and blueprint to incept.</p>

                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                            <label className="font-mono text-xs text-muted">TARGET ENVIRONMENT</label>
                            <select
                                value={selectedGestationEnvironmentId}
                                onChange={(e) => setSelectedGestationEnvironmentId(e.target.value)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid var(--border-glass-strong)',
                                    color: 'var(--text-primary)',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    fontFamily: 'var(--font-mono)',
                                    minWidth: '250px',
                                    outline: 'none'
                                }}
                            >
                                <option value="" disabled>-- Select Environment --</option>
                                {environments.map(env => (
                                    <option key={env.id} value={env.id}>{env.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="gestation-blueprints">
                            {blueprints.map(bp => (
                                <button
                                    key={bp.id}
                                    className="btn-ghost blueprint-card"
                                    onClick={() => handleIncept(bp.id)}
                                    disabled={isGestating || !selectedGestationEnvironmentId}
                                    style={{ opacity: !selectedGestationEnvironmentId ? 0.5 : 1 }}
                                >
                                    {isGestating ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                                    <div className="blueprint-name">{bp.name}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="temporal-matrix-container active-matrix">
                        <div className="matrix-header">
                            <div>
                                <h3 className="font-display heading-tracking text-base m-0 text-primary">
                                    {iteration.name || iteration.definition_name || 'Standard Iteration'}
                                </h3>
                                <div className="font-mono text-xs text-muted common-layout-27" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Iteration ID: {iteration.id}</span>
                                    <span>|</span>
                                    <span>Status: {iteration.status_name}</span>
                                    {iteration.environment && environments.find(e => e.id === iteration.environment) && (
                                        <>
                                            <span>|</span>
                                            <span style={{ color: 'var(--accent-gold)' }}>
                                                Env: {environments.find(e => e.id === iteration.environment)?.name}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    className="btn-ghost"
                                    onClick={() => setSelectedIterationId(null)}
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    ✕ Close Iteration
                                </button>
                                <button
                                    className="btn-action initiate-btn"
                                    onClick={handleInitiate}
                                    disabled={iteration.status_name !== 'Waiting'}
                                    style={{
                                        opacity: iteration.status_name !== 'Waiting' ? 0.5 : 1,
                                        cursor: iteration.status_name !== 'Waiting' ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Play size={14} fill="currentColor" />
                                    INITIATE
                                </button>
                            </div>
                        </div>

                        <div className="matrix-board-wrapper">
                            {canScrollLeft ? (
                                <button className="matrix-scroll-btn" onClick={() => scrollBoard('left')}>
                                    <ChevronLeft size={24} />
                                </button>
                            ) : <div className="common-layout-31" />}

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
                                                            <div className="common-layout-15">
                                                                <span className="slotted-card-title">{participant.disc.name}</span>
                                                                {isActive && <span className="status-dot status-active-pulse"></span>}
                                                            </div>
                                                            <button className="temporalmatrix-ui-209"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveWorker(shift.id, participant.disc.id);
                                                                }}
                                                                title="Remove from Shift"
                                                            >
                                                                <MoreVertical size={14} className="text-muted temporalmatrix-ui-208"
                                                                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                                                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                                                />
                                                            </button>
                                                        </div>
                                                        <div className="font-mono text-xs text-secondary temporalmatrix-ui-207">
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
                            ) : <div className="common-layout-31" />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
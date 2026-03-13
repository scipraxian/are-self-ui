import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, MoreVertical, ChevronLeft, ChevronRight, Loader2, Network, Plus, Trash2 } from 'lucide-react';
import { apiFetch, getCookie } from '../api';
import { IdentityRoster } from './IdentityRoster';
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

// Iteration definition detail (from IterationDefinitionSerializer)
interface DefinitionParticipantDetail {
    id: number;
    shift_definition: number;
    identity_disc: string;
    participant_detail: {
        id: string;
        name: string;
        available: boolean;
        level: number;
        xp: number;
    };
}

interface ShiftLite {
    id: number;
    name: string;
    default_turn_limit: number;
}

interface ShiftDefinitionData {
    id: number;
    definition: number;
    shift: ShiftLite;
    order: number;
    turn_limit: number;
    participants: DefinitionParticipantDetail[];
}

interface IterationDefinitionDetail {
    id: number;
    name: string;
    shift_definitions: ShiftDefinitionData[];
}

function DefinitionEditor({
    definition,
    environments,
    selectedEnvironmentId,
    onEnvironmentChange,
    onNameSave,
    onDelete,
    onRemoveDisc,
    onSlotDisc,
    onIncept,
    onTurnLimitChange,
    onClose,
    isGestating
}: {
    definition: IterationDefinitionDetail;
    environments: { id: string; name: string }[];
    selectedEnvironmentId: string;
    onEnvironmentChange: (id: string) => void;
    onNameSave: (name: string) => void;
    onDelete: () => void;
    onRemoveDisc: (shiftDefinitionId: number, participantId: number | string) => void;
    onSlotDisc: (shiftDefinitionId: number, payload: { disc_id?: string | number; base_id?: number }) => void;
    onIncept: (environmentId: string, customName?: string) => void;
    onClose: () => void;
    isGestating: boolean;
    onTurnLimitChange: (shiftDefinitionId: number, turnLimit: number) => void;
}) {
    const [editingName, setEditingName] = useState(definition.name);
    const [dragOverShiftId, setDragOverShiftId] = useState<number | null>(null);
    const boardRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    useEffect(() => {
        setEditingName(definition.name);
    }, [definition.id, definition.name]);

    const handleDropOnDefinitionShift = (e: React.DragEvent, shiftDefinitionId: number) => {
        e.preventDefault();
        setDragOverShiftId(null);
        const payload = e.dataTransfer.getData('application/json');
        if (!payload) return;
        try {
            const { type, id } = JSON.parse(payload);
            const body: { disc_id?: string | number; base_id?: number } = {};
            if (type === 'disc') body.disc_id = id;
            if (type === 'base') body.base_id = id;
            if (!body.disc_id && !body.base_id) return;
            onSlotDisc(shiftDefinitionId, body);
        } catch (err) {
            console.error('Invalid drag payload for definition shift:', err);
        }
    };

    const checkScroll = () => {
        if (!boardRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = boardRef.current;
        setCanScrollLeft(scrollLeft > 0);
        setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    };

    const scrollBoard = (direction: 'left' | 'right') => {
        if (!boardRef.current) return;
        const scrollAmount = 336;
        boardRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [definition.id, definition.shift_definitions]);

    const sortedShifts = [...(definition.shift_definitions || [])].sort((a, b) => a.order - b.order);

    return (
        <div className="temporal-matrix-container active-matrix definition-editor">
            <div className="matrix-header definition-header">
                <div className="definition-header-left">
                    <input
                        className="font-display heading-tracking text-base definition-name-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => { if (editingName.trim() !== definition.name) onNameSave(editingName.trim() || definition.name); }}
                    />
                    <div className="definition-id-label font-mono text-xs text-muted">Definition ID: {definition.id}</div>
                </div>
                <div className="definition-header-right">
                    <button className="btn-ghost definition-close-btn" onClick={onClose}>✕ Close</button>
                    <button className="btn-ghost definition-delete-btn" onClick={onDelete} title="Delete definition">
                        <Trash2 size={14} />
                    </button>
                    <label className="definition-env-label font-mono text-xs text-muted">
                        <span>Environment</span>
                        <select
                            className="definition-env-select"
                            value={selectedEnvironmentId}
                            onChange={(e) => onEnvironmentChange(e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
                        </select>
                    </label>
                    <button
                        className="btn-action initiate-btn definition-incept-btn"
                        onClick={() => onIncept(selectedEnvironmentId)}
                        disabled={isGestating || !selectedEnvironmentId}
                    >
                        {isGestating ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} fill="currentColor" />}
                        INCEPT
                    </button>
                </div>
            </div>
            <div className="matrix-board-wrapper">
                {canScrollLeft ? (
                    <button className="matrix-scroll-btn" onClick={() => scrollBoard('left')}>
                        <ChevronLeft size={24} />
                    </button>
                ) : (
                    <div className="scroll-placeholder" />
                )}
                <div className="matrix-board" ref={boardRef} onScroll={checkScroll}>
                    {sortedShifts.map((shiftDef, index) => (
                        <div key={shiftDef.id} className="matrix-column">
                            <div className="matrix-column-header">
                                <span className="matrix-column-title">{shiftDef.shift?.name || `Shift ${index + 1}`}</span>
                                <div className="matrix-column-stats definition-turn-editor">
                                    <span className="definition-turn-label">Turns</span>
                                    <input
                                        key={shiftDef.turn_limit}
                                        className="definition-turn-input"
                                        type="number"
                                        min={1}
                                        defaultValue={shiftDef.turn_limit}
                                        onBlur={(e) => {
                                            const raw = e.target.value;
                                            const parsed = parseInt(raw, 10);
                                            if (!Number.isNaN(parsed) && parsed !== shiftDef.turn_limit) {
                                                onTurnLimitChange(shiftDef.id, parsed);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <div
                                className={`matrix-column-body ${dragOverShiftId === shiftDef.id ? 'drag-over' : ''}`}
                                onDragOver={(e) => { e.preventDefault(); setDragOverShiftId(shiftDef.id); }}
                                onDragLeave={() => setDragOverShiftId(null)}
                                onDrop={(e) => handleDropOnDefinitionShift(e, shiftDef.id)}
                            >
                                {shiftDef.participants?.map((p) => (
                                    <div key={p.id} className="slotted-card">
                                        <div className="slotted-card-header">
                                            <span className="slotted-card-title">{p.participant_detail?.name ?? `Disc ${p.identity_disc}`}</span>
                                            <button
                                                type="button"
                                                className="temporalmatrix-ui-209"
                                                onClick={() => onRemoveDisc(shiftDef.id, p.identity_disc)}
                                                title="Remove from shift"
                                            >
                                                <MoreVertical size={14} className="text-muted" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {canScrollRight ? (
                    <button className="matrix-scroll-btn" onClick={() => scrollBoard('right')}>
                        <ChevronRight size={24} />
                    </button>
                ) : (
                    <div className="scroll-placeholder" />
                )}
            </div>
        </div>
    );
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
    const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);
    const [definitionDetail, setDefinitionDetail] = useState<IterationDefinitionDetail | null>(null);
    const [definitionDetailLoading, setDefinitionDetailLoading] = useState(false);
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
    }, [selectedIterationId, selectedDefinitionId]);


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

    const refetchDefinitions = () => {
        fetch('/api/v2/iteration-definitions/').then(res => res.json()).then(data => {
            setBlueprints(data.results || data);
        }).catch(err => console.error('Failed to refetch definitions', err));
    };

    useEffect(() => {
        if (selectedDefinitionId == null) {
            setDefinitionDetail(null);
            return;
        }
        setDefinitionDetailLoading(true);
        fetch(`/api/v2/iteration-definitions/${selectedDefinitionId}/`)
            .then(res => res.ok ? res.json() : Promise.reject(new Error('Failed to load definition')))
            .then((data: IterationDefinitionDetail) => {
                setDefinitionDetail(data);
            })
            .catch(err => {
                console.error('Definition fetch failed:', err);
                setDefinitionDetail(null);
            })
            .finally(() => setDefinitionDetailLoading(false));
    }, [selectedDefinitionId]);

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [iteration]);

    // Poll selected iteration so status/board update while running
    useEffect(() => {
        if (!selectedIterationId) return;
        let cancelled = false;
        let intervalId: number | null = null;

        const poll = async () => {
            try {
                const res = await apiFetch(`/api/v2/iterations/${selectedIterationId}/`);
                if (!res.ok) return;
                const data: IterationData = await res.json();
                if (cancelled) return;
                updateIterationState(data);
                // Stop polling when status is Finished (3), Cancelled (4), or Error (6)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const statusId = (data as any).status as number | undefined;
                if (statusId === 3 || statusId === 4 || statusId === 6) {
                    if (intervalId !== null) {
                        window.clearInterval(intervalId);
                    }
                    cancelled = true;
                }
            } catch {
                // ignore transient errors
            }
        };

        poll();
        intervalId = window.setInterval(poll, 5000);
        return () => {
            cancelled = true;
            if (intervalId !== null) {
                window.clearInterval(intervalId);
            }
        };
    }, [selectedIterationId]);

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

    const createDefinition = async () => {
        try {
            const res = await apiFetch('/api/v2/iteration-definitions/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Definition' })
            });
            if (res.ok) {
                const created = await res.json();
                refetchDefinitions();
                setSelectedDefinitionId(created.id);
                setSelectedIterationId(null);
            } else {
                console.error('Failed to create definition');
            }
        } catch (err) {
            console.error('Create definition failed:', err);
        }
    };

    const patchDefinitionName = async (id: number, name: string) => {
        try {
            const res = await apiFetch(`/api/v2/iteration-definitions/${id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.ok) {
                const updated = await res.json();
                setDefinitionDetail(prev => prev && prev.id === id ? { ...prev, name: updated.name } : prev);
                refetchDefinitions();
            }
        } catch (err) {
            console.error('Patch definition failed:', err);
        }
    };

    const deleteDefinition = async (id: number) => {
        try {
            const res = await apiFetch(`/api/v2/iteration-definitions/${id}/`, { method: 'DELETE' });
            if (res.ok) {
                setSelectedDefinitionId(null);
                setDefinitionDetail(null);
                refetchDefinitions();
            } else {
                console.error('Failed to delete definition');
            }
        } catch (err) {
            console.error('Delete definition failed:', err);
        }
    };

    const updateShiftDefinitionTurnLimit = async (shiftDefinitionId: number, turnLimit: number) => {
        try {
            const res = await apiFetch(`/api/v2/iteration-shift-definitions/${shiftDefinitionId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turn_limit: turnLimit })
            });
            if (res.ok) {
                const updated = await res.json();
                // Some backends return the updated shift-definition, not the full definition.
                // Only set definition detail if the payload looks like a definition; otherwise refetch the active definition.
                if (updated && typeof updated === 'object' && 'shift_definitions' in updated) {
                    setDefinitionDetail(updated as IterationDefinitionDetail);
                } else if (selectedDefinitionId) {
                    const defRes = await apiFetch(`/api/v2/iteration-definitions/${selectedDefinitionId}/`);
                    if (defRes.ok) {
                        const defData: IterationDefinitionDetail = await defRes.json();
                        setDefinitionDetail(defData);
                    }
                }
            } else {
                console.error('Failed to update shift definition turn_limit');
            }
        } catch (err) {
            console.error('Update shift definition turn_limit failed:', err);
        }
    };

    const definitionSlotDisc = async (definitionId: number, shiftDefinitionId: number, payload: { disc_id?: string | number; base_id?: number }) => {
        try {
            const res = await apiFetch(`/api/v2/iteration-definitions/${definitionId}/slot_disc/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shift_definition_id: shiftDefinitionId, ...payload })
            });
            if (res.ok) {
                const updated = await res.json();
                setDefinitionDetail(updated);
            } else {
                console.error('Definition slot_disc failed');
            }
        } catch (err) {
            console.error('Definition slot_disc failed:', err);
        }
    };

    const definitionRemoveDisc = async (definitionId: number, shiftDefinitionId: number, participantId: number | string) => {
        try {
            const res = await apiFetch(`/api/v2/iteration-definitions/${definitionId}/remove_disc/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shift_definition_id: shiftDefinitionId, disc_id: participantId })
            });
            if (res.ok) {
                const updated = await res.json();
                setDefinitionDetail(updated);
            } else {
                console.error('Definition remove_disc failed');
            }
        } catch (err) {
            console.error('Definition remove_disc failed:', err);
        }
    };

    const definitionIncept = async (definitionId: number, environmentId: string, customName?: string) => {
        setIsGestating(true);
        try {
            const res = await apiFetch(`/api/v2/iteration-definitions/${definitionId}/incept/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ environment_id: environmentId || undefined, custom_name: customName || undefined })
            });
            if (res.ok) {
                const newIteration: IterationData = await res.json();
                setIterations(prev => [newIteration, ...prev]);
                setSelectedIterationId(newIteration.id);
                setSelectedDefinitionId(null);
                setDefinitionDetail(null);
            } else {
                console.error('Incept failed');
            }
        } catch (err) {
            console.error('Incept failed:', err);
        } finally {
            setIsGestating(false);
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
            <div className="roster-section">
                <h3 className="roster-section-title">Definitions</h3>
                <button
                    className="btn-new-iteration"
                    onClick={createDefinition}
                    style={{ marginBottom: '8px' }}
                >
                    <Plus size={16} /> New Definition
                </button>
                <div className="roster-list">
                    {blueprints.map(bp => (
                        <div
                            key={bp.id}
                            className={`roster-item ${bp.id === selectedDefinitionId ? 'active' : ''}`}
                            onClick={() => { setSelectedDefinitionId(bp.id); setSelectedIterationId(null); }}
                        >
                            <div className="roster-item-title">{bp.name || `Definition ${bp.id}`}</div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="roster-section">
                <h3 className="roster-section-title">Iterations</h3>
                <button
                    className="btn-new-iteration btn-ghost-secondary"
                    onClick={() => { setSelectedIterationId(null); setSelectedDefinitionId(null); }}
                    style={{ marginBottom: '8px' }}
                >
                    Gestation Chamber
                </button>
                <div className="roster-list">
                    {iterations.map(it => (
                        <div
                            key={it.id}
                            className={`roster-item ${it.id === selectedIterationId ? 'active' : ''}`}
                            onClick={() => { setSelectedIterationId(it.id); setSelectedDefinitionId(null); }}
                        >
                            <div className="roster-item-title">{it.name || `Iteration ${it.id}`}</div>
                            <div className="roster-item-status">{it.status_name}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const sidebarContent = selectedDefinitionId && definitionDetail
        ? (
            <IdentityRoster onSelectIdentity={() => { }} />
        )
        : iterationRosterSidebar;

    return (
        <div className="temporal-matrix-layout">
            {portalTarget && createPortal(sidebarContent, portalTarget)}

            <div className="temporal-matrix-main" style={{ padding: (selectedIterationId || selectedDefinitionId) ? '24px' : '0' }}>
                {definitionDetailLoading && selectedDefinitionId ? (
                    <div className="temporal-matrix-container gestation-chamber">
                        <Loader2 className="animate-spin text-muted" size={32} />
                    </div>
                ) : definitionDetail && selectedDefinitionId ? (
                    <DefinitionEditor
                        definition={definitionDetail}
                        environments={environments}
                        selectedEnvironmentId={selectedGestationEnvironmentId}
                        onEnvironmentChange={setSelectedGestationEnvironmentId}
                        onNameSave={(name) => patchDefinitionName(definitionDetail.id, name)}
                        onDelete={() => deleteDefinition(definitionDetail.id)}
                        onRemoveDisc={(shiftDefId, participantId) => definitionRemoveDisc(definitionDetail.id, shiftDefId, participantId)}
                        onSlotDisc={(shiftDefId, payload) => definitionSlotDisc(definitionDetail.id, shiftDefId, payload)}
                        onIncept={(envId, customName) => definitionIncept(definitionDetail.id, envId, customName)}
                        onTurnLimitChange={(shiftDefId, turnLimit) => updateShiftDefinitionTurnLimit(shiftDefId, turnLimit)}
                        onClose={() => { setSelectedDefinitionId(null); setDefinitionDetail(null); }}
                        isGestating={isGestating}
                    />
                ) : !iteration ? (
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
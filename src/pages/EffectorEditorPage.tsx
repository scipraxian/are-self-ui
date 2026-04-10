import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Terminal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { apiFetch } from '../api';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { ThreePanel } from '../components/ThreePanel';
import './EffectorEditorPage.css';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EffectorLight {
    id: number;
    name: string;
    description: string;
    distribution_mode: number;
}

interface ExecutableDetail {
    id: number;
    name: string;
    description: string;
    executable: string;
    internal: boolean;
    log: string;
    switches_detail: SwitchDetail[];
    argument_assignments: ArgAssignment[];
    rendered_executable: string;
}

interface SwitchDetail {
    id: number;
    name: string;
    flag: string;
    value: string;
}

interface ArgAssignment {
    id: number;
    order: number;
    argument: number;
    argument_detail: { id: number; name: string; argument: string };
}

interface ContextEntry {
    id: number;
    effector: number;
    key: string;
    value: string;
}

interface DistributionMode {
    id: number;
    name: string;
    description: string;
}

interface ArgumentDef {
    id: number;
    name: string;
    argument: string;
}

interface EffectorFull {
    id: number;
    name: string;
    description: string;
    executable: number;
    executable_detail: ExecutableDetail;
    switches: number[];
    switches_detail: SwitchDetail[];
    distribution_mode: number;
    distribution_mode_detail: DistributionMode;
    argument_assignments: ArgAssignment[];
    context_entries: ContextEntry[];
    tags: { id: number; name: string }[];
    is_favorite: boolean;
    rendered_full_command: string[];
}

interface ExecutableLight {
    id: number;
    name: string;
    executable: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EffectorEditorPage() {
    const { effectorId: routeEffectorId } = useParams<{ effectorId: string }>();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    // List state
    const [effectors, setEffectors] = useState<EffectorLight[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(
        routeEffectorId ? Number(routeEffectorId) : null
    );

    // Detail state
    const [detail, setDetail] = useState<EffectorFull | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [distributionMode, setDistributionMode] = useState<number>(1);
    const [executableId, setExecutableId] = useState<number>(1);

    // Lookup data
    const [distributionModes, setDistributionModes] = useState<DistributionMode[]>([]);
    const [allExecutables, setAllExecutables] = useState<ExecutableLight[]>([]);
    const [allArguments, setAllArguments] = useState<ArgumentDef[]>([]);

    // Executable inline editing
    const [editingExecutable, setEditingExecutable] = useState(false);
    const [exeName, setExeName] = useState('');
    const [exeDescription, setExeDescription] = useState('');
    const [exePath, setExePath] = useState('');
    const [exeLog, setExeLog] = useState('');

    // Context entries
    const [contextEntries, setContextEntries] = useState<ContextEntry[]>([]);
    const [newCtxKey, setNewCtxKey] = useState('');
    const [newCtxValue, setNewCtxValue] = useState('');

    // Add-argument forms
    const [addingExeArg, setAddingExeArg] = useState(false);
    const [newExeArgId, setNewExeArgId] = useState<number>(0);
    const [newExeArgOrder, setNewExeArgOrder] = useState<number>(10);
    const [addingEffArg, setAddingEffArg] = useState(false);
    const [newEffArgId, setNewEffArgId] = useState<number>(0);
    const [newEffArgOrder, setNewEffArgOrder] = useState<number>(10);

    // New argument creation
    const [creatingArg, setCreatingArg] = useState(false);
    const [newArgName, setNewArgName] = useState('');
    const [newArgValue, setNewArgValue] = useState('');

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([
            { label: 'Central Nervous System', path: '/cns' },
            {
                label: 'Effector Editor',
                path: '/cns/effector',
                tip: 'Effectors are the runnable units neurons fire — prompts, tools, scripts, MCP calls. Configure inputs, outputs, and arguments here.',
                doc: 'docs/ui/cns-editor',
            },
            ...(detail
                ? [{
                    label: detail.name,
                    path: `/cns/effector/${detail.id}/edit`,
                    tip: 'Edit this effector — its prompt template, arguments, output schema, and which neurons use it.',
                    doc: 'docs/ui/cns-editor',
                }]
                : []),
        ]);
        return () => setCrumbs([]);
    }, [detail, setCrumbs]);

    // Sync route param
    useEffect(() => {
        if (routeEffectorId) {
            setSelectedId(Number(routeEffectorId));
        }
    }, [routeEffectorId]);

    // Fetch effector list
    const fetchEffectors = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v2/effectors/');
            if (!res.ok) return;
            const data = await res.json();
            const items = Array.isArray(data) ? data : data.results ?? [];
            setEffectors(items);
        } catch (err) {
            console.error('Failed to fetch effectors', err);
        }
    }, []);

    useEffect(() => { fetchEffectors(); }, [fetchEffectors]);

    // Fetch lookup data (distribution modes, executables, arguments)
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [modesRes, exeRes, argsRes] = await Promise.all([
                    apiFetch('/api/v2/distribution-modes/'),
                    apiFetch('/api/v2/executables/'),
                    apiFetch('/api/v2/executable-arguments/'),
                ]);
                if (cancelled) return;

                if (modesRes.ok) {
                    const data = await modesRes.json();
                    if (!cancelled) setDistributionModes(Array.isArray(data) ? data : data.results ?? []);
                }
                if (exeRes.ok) {
                    const data = await exeRes.json();
                    if (!cancelled) setAllExecutables(Array.isArray(data) ? data : data.results ?? []);
                }
                if (argsRes.ok) {
                    const data = await argsRes.json();
                    if (!cancelled) setAllArguments(Array.isArray(data) ? data : data.results ?? []);
                }
            } catch (err) {
                console.error('Failed to fetch lookups', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    // Imperative fetch — can be called after mutations to refresh detail in-place
    const fetchDetail = useCallback(async (id?: number) => {
        const targetId = id ?? selectedId;
        if (!targetId) {
            setDetail(null);
            return;
        }
        try {
            const res = await apiFetch(`/api/v2/effectors/${targetId}/`);
            if (!res.ok) return;
            const data: EffectorFull = await res.json();
            setDetail(data);
            setName(data.name);
            setDescription(data.description ?? '');
            setDistributionMode(data.distribution_mode);
            setExecutableId(data.executable);
            setContextEntries(data.context_entries ?? []);

            if (data.executable_detail) {
                setExeName(data.executable_detail.name);
                setExeDescription(data.executable_detail.description ?? '');
                setExePath(data.executable_detail.executable);
                setExeLog(data.executable_detail.log ?? '');
            }
        } catch (err) {
            console.error('Failed to fetch effector detail', err);
        }
    }, [selectedId]);

    // Auto-fetch when selectedId changes
    useEffect(() => { fetchDetail(); }, [selectedId]);

    /* -------------------------------------------------------------- */
    /*  Effector Field Handlers                                        */
    /* -------------------------------------------------------------- */

    const handleSave = async () => {
        if (!detail) return;
        try {
            await apiFetch(`/api/v2/effectors/${detail.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description }),
            });
            fetchEffectors();
        } catch (err) {
            console.error('Failed to save effector', err);
        }
    };

    const handleDistributionModeChange = async (modeId: number) => {
        if (!detail) return;
        setDistributionMode(modeId);
        try {
            await apiFetch(`/api/v2/effectors/${detail.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ distribution_mode: modeId }),
            });
        } catch (err) {
            console.error('Failed to update distribution mode', err);
        }
    };

    const handleExecutableChange = async (newExeId: number) => {
        if (!detail) return;
        setExecutableId(newExeId);
        try {
            await apiFetch(`/api/v2/effectors/${detail.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ executable: newExeId }),
            });
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to update executable', err);
        }
    };

    /* -------------------------------------------------------------- */
    /*  Executable Inline Editor                                       */
    /* -------------------------------------------------------------- */

    const handleExecutableSave = async () => {
        if (!detail?.executable_detail) return;
        try {
            await apiFetch(`/api/v2/executables/${detail.executable_detail.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: exeName,
                    description: exeDescription,
                    executable: exePath,
                    log: exeLog,
                }),
            });
            await fetchDetail(detail.id);
            fetchEffectors();
        } catch (err) {
            console.error('Failed to save executable', err);
        }
    };

    const handleCreateExecutable = async () => {
        try {
            const res = await apiFetch('/api/v2/executables/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Executable', executable: '/path/to/executable' }),
            });
            if (!res.ok) return;
            const created = await res.json();
            setAllExecutables(prev => [...prev, created]);
            if (detail) handleExecutableChange(created.id);
        } catch (err) {
            console.error('Failed to create executable', err);
        }
    };

    /* -------------------------------------------------------------- */
    /*  Executable Argument Assignment CRUD                            */
    /* -------------------------------------------------------------- */

    const handleAddExeArgAssignment = async () => {
        if (!detail?.executable_detail || !newExeArgId) return;
        try {
            const res = await apiFetch('/api/v2/executable-argument-assignments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    executable: detail.executable_detail.id,
                    argument: newExeArgId,
                    order: newExeArgOrder,
                }),
            });
            if (!res.ok) return;
            setAddingExeArg(false);
            setNewExeArgId(0);
            setNewExeArgOrder(10);
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to add exe arg assignment', err);
        }
    };

    const handleDeleteExeArgAssignment = async (assignmentId: number) => {
        if (!detail) return;
        try {
            await apiFetch(`/api/v2/executable-argument-assignments/${assignmentId}/`, { method: 'DELETE' });
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to delete exe arg assignment', err);
        }
    };

    const handleReorderExeArg = async (assignmentId: number, newOrder: number) => {
        if (!detail) return;
        try {
            await apiFetch(`/api/v2/executable-argument-assignments/${assignmentId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newOrder }),
            });
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to reorder exe arg', err);
        }
    };

    /* -------------------------------------------------------------- */
    /*  Effector Argument Assignment CRUD                              */
    /* -------------------------------------------------------------- */

    const handleAddEffArgAssignment = async () => {
        if (!detail || !newEffArgId) return;
        try {
            const res = await apiFetch('/api/v2/effector-argument-assignments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    effector: detail.id,
                    argument: newEffArgId,
                    order: newEffArgOrder,
                }),
            });
            if (!res.ok) return;
            setAddingEffArg(false);
            setNewEffArgId(0);
            setNewEffArgOrder(10);
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to add effector arg assignment', err);
        }
    };

    const handleDeleteEffArgAssignment = async (assignmentId: number) => {
        if (!detail) return;
        try {
            await apiFetch(`/api/v2/effector-argument-assignments/${assignmentId}/`, { method: 'DELETE' });
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to delete effector arg assignment', err);
        }
    };

    const handleReorderEffArg = async (assignmentId: number, newOrder: number) => {
        if (!detail) return;
        try {
            await apiFetch(`/api/v2/effector-argument-assignments/${assignmentId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: newOrder }),
            });
            await fetchDetail(detail.id);
        } catch (err) {
            console.error('Failed to reorder effector arg', err);
        }
    };

    /* -------------------------------------------------------------- */
    /*  Argument Definition CRUD (create new reusable args)            */
    /* -------------------------------------------------------------- */

    const handleCreateArgument = async () => {
        if (!newArgName.trim() || !newArgValue.trim()) return;
        try {
            const res = await apiFetch('/api/v2/executable-arguments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newArgName, argument: newArgValue }),
            });
            if (!res.ok) return;
            const created: ArgumentDef = await res.json();
            setAllArguments(prev => [...prev, created]);
            setCreatingArg(false);
            setNewArgName('');
            setNewArgValue('');
        } catch (err) {
            console.error('Failed to create argument', err);
        }
    };

    /* -------------------------------------------------------------- */
    /*  Context Entry CRUD                                             */
    /* -------------------------------------------------------------- */

    const handleContextAdd = async () => {
        if (!detail || !newCtxKey.trim()) return;
        try {
            const res = await apiFetch('/api/v2/effector-contexts/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ effector: detail.id, key: newCtxKey, value: newCtxValue }),
            });
            if (!res.ok) return;
            const created: ContextEntry = await res.json();
            setContextEntries(prev => [...prev, created]);
            setNewCtxKey('');
            setNewCtxValue('');
        } catch (err) {
            console.error('Failed to add context', err);
        }
    };

    const handleContextUpdate = async (entry: ContextEntry) => {
        try {
            await apiFetch(`/api/v2/effector-contexts/${entry.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: entry.value }),
            });
        } catch (err) {
            console.error('Failed to update context', err);
        }
    };

    const handleContextDelete = async (entryId: number) => {
        try {
            await apiFetch(`/api/v2/effector-contexts/${entryId}/`, { method: 'DELETE' });
            setContextEntries(prev => prev.filter(e => e.id !== entryId));
        } catch (err) {
            console.error('Failed to delete context', err);
        }
    };

    /* -------------------------------------------------------------- */
    /*  Create / Delete Effector                                       */
    /* -------------------------------------------------------------- */

    const handleCreate = async () => {
        try {
            const res = await apiFetch('/api/v2/effectors/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Effector', executable: 1, distribution_mode: 1 }),
            });
            if (!res.ok) return;
            const created = await res.json();
            fetchEffectors();
            setSelectedId(created.id);
            navigate(`/cns/effector/${created.id}/edit`, { replace: true });
        } catch (err) {
            console.error('Failed to create effector', err);
        }
    };

    const handleDelete = async () => {
        if (!detail) return;
        if (!confirm(`Delete effector "${detail.name}"? This cannot be undone.`)) return;
        try {
            await apiFetch(`/api/v2/effectors/${detail.id}/`, { method: 'DELETE' });
            setSelectedId(null);
            setDetail(null);
            fetchEffectors();
            navigate('/cns/effector', { replace: true });
        } catch (err) {
            console.error('Failed to delete effector', err);
        }
    };

    const handleSelectEffector = (id: number) => {
        setSelectedId(id);
        navigate(`/cns/effector/${id}/edit`, { replace: true });
    };

    /* -------------------------------------------------------------- */
    /*  Argument Selector (shared component)                           */
    /* -------------------------------------------------------------- */

    const renderArgSelector = (
        selectedArgId: number,
        onSelectArg: (id: number) => void,
    ) => (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
                className="eff-editor-select"
                value={selectedArgId}
                onChange={(e) => onSelectArg(Number(e.target.value))}
                style={{ flex: 1 }}
            >
                <option value={0}>Select argument...</option>
                {allArguments.map(a => (
                    <option key={a.id} value={a.id}>{a.name} — {a.argument}</option>
                ))}
            </select>
            <button
                className="eff-editor-btn-small"
                onClick={() => setCreatingArg(true)}
                title="Create new argument definition"
            >
                + Arg
            </button>
        </div>
    );

    /* -------------------------------------------------------------- */
    /*  Argument Table (shared component)                              */
    /* -------------------------------------------------------------- */

    const renderArgTable = (
        assignments: ArgAssignment[],
        onDelete: (id: number) => Promise<void>,
        onReorder: (id: number, newOrder: number) => Promise<void>,
        addingState: boolean,
        setAddingState: (v: boolean) => void,
        selectedArgId: number,
        setSelectedArgId: (v: number) => void,
        orderValue: number,
        setOrderValue: (v: number) => void,
        onAdd: () => void,
    ) => (
        <>
            <table className="eff-editor-table">
                <thead>
                    <tr><th>#</th><th>NAME</th><th>ARGUMENT</th><th></th></tr>
                </thead>
                <tbody>
                    {assignments.map((aa, idx) => (
                        <tr key={aa.id}>
                            <td>
                                <input
                                    key={`${aa.id}-${aa.order}`}
                                    className="eff-editor-table-input"
                                    type="number"
                                    defaultValue={aa.order}
                                    onBlur={(e) => {
                                        const newVal = Number(e.target.value);
                                        if (newVal !== aa.order) onReorder(aa.id, newVal);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            (e.target as HTMLInputElement).blur();
                                        }
                                    }}
                                    style={{ width: '50px' }}
                                />
                            </td>
                            <td>
                                <input
                                    key={`${aa.id}-name-${aa.argument_detail?.name}`}
                                    className="eff-editor-table-input"
                                    defaultValue={aa.argument_detail?.name ?? ''}
                                    onBlur={async (e) => {
                                        const newVal = e.target.value;
                                        if (aa.argument_detail && newVal !== aa.argument_detail.name) {
                                            try {
                                                await apiFetch(`/api/v2/executable-arguments/${aa.argument_detail.id}/`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ name: newVal }),
                                                });
                                                if (detail) await fetchDetail(detail.id);
                                            } catch (err) {
                                                console.error('Failed to update argument name', err);
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                />
                            </td>
                            <td>
                                <input
                                    key={`${aa.id}-arg-${aa.argument_detail?.argument}`}
                                    className="eff-editor-table-input"
                                    defaultValue={aa.argument_detail?.argument ?? ''}
                                    onBlur={async (e) => {
                                        const newVal = e.target.value;
                                        if (aa.argument_detail && newVal !== aa.argument_detail.argument) {
                                            try {
                                                await apiFetch(`/api/v2/executable-arguments/${aa.argument_detail.id}/`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ argument: newVal }),
                                                });
                                                if (detail) await fetchDetail(detail.id);
                                            } catch (err) {
                                                console.error('Failed to update argument text', err);
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                />
                            </td>
                            <td style={{ display: 'flex', gap: '2px' }}>
                                {idx > 0 && (
                                    <button
                                        className="eff-editor-btn-delete"
                                        title="Move up"
                                        onClick={async () => {
                                            const prevOrder = assignments[idx - 1].order;
                                            await onReorder(aa.id, prevOrder - 1);
                                        }}
                                    >
                                        <ChevronUp size={14} />
                                    </button>
                                )}
                                {idx < assignments.length - 1 && (
                                    <button
                                        className="eff-editor-btn-delete"
                                        title="Move down"
                                        onClick={async () => {
                                            const nextOrder = assignments[idx + 1].order;
                                            await onReorder(aa.id, nextOrder + 1);
                                        }}
                                    >
                                        <ChevronDown size={14} />
                                    </button>
                                )}
                                <button
                                    className="eff-editor-btn-delete"
                                    title="Remove"
                                    onClick={() => onDelete(aa.id)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {addingState ? (
                <div className="eff-editor-add-row">
                    {renderArgSelector(selectedArgId, setSelectedArgId)}
                    <input
                        className="eff-editor-table-input"
                        type="number"
                        value={orderValue}
                        onChange={(e) => setOrderValue(Number(e.target.value))}
                        style={{ width: '60px' }}
                        placeholder="Order"
                    />
                    <button className="eff-editor-btn-small" onClick={onAdd} disabled={!selectedArgId}>
                        Save
                    </button>
                    <button className="eff-editor-btn-delete" onClick={() => setAddingState(false)}>
                        &times;
                    </button>
                </div>
            ) : (
                <button className="eff-editor-btn-small" onClick={() => setAddingState(true)}>
                    + Add Argument
                </button>
            )}
        </>
    );

    /* -------------------------------------------------------------- */
    /*  Left Panel                                                     */
    /* -------------------------------------------------------------- */

    const left = (
        <div className="eff-editor-list">
            <button className="eff-editor-back-btn" onClick={() => navigate(-1)}>
                <ArrowLeft size={14} /> Back
            </button>
            <button className="eff-editor-new-btn" onClick={handleCreate}>+ New Effector</button>
            {effectors.map(eff => (
                <div
                    key={eff.id}
                    className={`eff-editor-list-item${selectedId === eff.id ? ' active' : ''}`}
                    onClick={() => handleSelectEffector(eff.id)}
                >
                    <div className="eff-editor-list-item-name">{eff.name}</div>
                    <div className="eff-editor-list-item-meta">
                        <span>#{eff.id}</span>
                    </div>
                </div>
            ))}
        </div>
    );

    /* -------------------------------------------------------------- */
    /*  Center Panel                                                   */
    /* -------------------------------------------------------------- */

    const center = detail ? (
        <div className="eff-editor-detail glass-surface">
            {/* Header */}
            <div className="eff-editor-detail-header">
                <h2 className="eff-editor-detail-title">
                    <Zap size={18} style={{ color: '#facc15', marginRight: '8px', verticalAlign: 'middle' }} />
                    {detail.name}
                </h2>
                <span className="eff-editor-list-item-meta">ID: {detail.id}</span>
            </div>

            {/* Full Command Preview — the real thing with all args + switches */}
            {detail.rendered_full_command?.length > 0 && (
                <div className="eff-editor-section">
                    <h3 className="eff-editor-section-title">FULL COMMAND</h3>
                    <div className="eff-editor-command-preview">
                        {detail.rendered_full_command.join(' ')}
                    </div>
                </div>
            )}

            {/* Core Fields */}
            <div className="eff-editor-form">
                <label className="eff-editor-label">NAME</label>
                <input
                    className="eff-editor-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                />

                <label className="eff-editor-label">DESCRIPTION</label>
                <textarea
                    className="eff-editor-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                />

                <label className="eff-editor-label">DISTRIBUTION MODE</label>
                <select
                    className="eff-editor-select"
                    value={distributionMode}
                    onChange={(e) => handleDistributionModeChange(Number(e.target.value))}
                >
                    {distributionModes.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            {/* Executable Section */}
            <div className="eff-editor-section">
                <div className="eff-editor-section-header">
                    <h3 className="eff-editor-section-title">
                        <Terminal size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        EXECUTABLE
                    </h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            className="eff-editor-btn-small"
                            onClick={() => setEditingExecutable(!editingExecutable)}
                        >
                            {editingExecutable ? 'Collapse' : 'Edit'}
                        </button>
                        <button className="eff-editor-btn-small" onClick={handleCreateExecutable}>
                            + New
                        </button>
                    </div>
                </div>

                <label className="eff-editor-label">SELECT EXECUTABLE</label>
                <select
                    className="eff-editor-select"
                    value={executableId}
                    onChange={(e) => handleExecutableChange(Number(e.target.value))}
                >
                    {allExecutables.map(exe => (
                        <option key={exe.id} value={exe.id}>{exe.name}</option>
                    ))}
                </select>

                {/* Inline Executable Editor */}
                {editingExecutable && detail.executable_detail && (
                    <div className="eff-editor-executable-card">
                        <div className="eff-editor-executable-header">
                            <h4 className="eff-editor-executable-title">
                                Editing: {detail.executable_detail.name}
                            </h4>
                        </div>

                        <label className="eff-editor-label">NAME</label>
                        <input className="eff-editor-input" value={exeName} onChange={(e) => setExeName(e.target.value)} />

                        <label className="eff-editor-label">DESCRIPTION</label>
                        <textarea className="eff-editor-textarea" value={exeDescription} onChange={(e) => setExeDescription(e.target.value)} />

                        <label className="eff-editor-label">EXECUTABLE PATH</label>
                        <input className="eff-editor-input" value={exePath} onChange={(e) => setExePath(e.target.value)} />

                        <label className="eff-editor-label">LOG PATH</label>
                        <input className="eff-editor-input" value={exeLog} onChange={(e) => setExeLog(e.target.value)} />

                        {/* Executable Switches */}
                        {detail.executable_detail.switches_detail?.length > 0 && (
                            <>
                                <label className="eff-editor-label">SWITCHES</label>
                                <table className="eff-editor-table">
                                    <thead><tr><th>FLAG</th><th>VALUE</th></tr></thead>
                                    <tbody>
                                        {detail.executable_detail.switches_detail.map(sw => (
                                            <tr key={sw.id}><td>{sw.flag}</td><td>{sw.value || '—'}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}

                        {/* Executable Arguments — EDITABLE */}
                        <label className="eff-editor-label">EXECUTABLE ARGUMENTS</label>
                        {renderArgTable(
                            detail.executable_detail.argument_assignments ?? [],
                            handleDeleteExeArgAssignment,
                            handleReorderExeArg,
                            addingExeArg,
                            setAddingExeArg,
                            newExeArgId,
                            setNewExeArgId,
                            newExeArgOrder,
                            setNewExeArgOrder,
                            handleAddExeArgAssignment,
                        )}

                        <button className="eff-editor-btn-action" onClick={handleExecutableSave} style={{ marginTop: '8px' }}>
                            Save Executable
                        </button>
                    </div>
                )}
            </div>

            {/* Effector Switches (read for now — M2M management is complex) */}
            {detail.switches_detail?.length > 0 && (
                <div className="eff-editor-section">
                    <h3 className="eff-editor-section-title">EFFECTOR SWITCHES</h3>
                    <table className="eff-editor-table">
                        <thead><tr><th>FLAG</th><th>VALUE</th></tr></thead>
                        <tbody>
                            {detail.switches_detail.map(sw => (
                                <tr key={sw.id}><td>{sw.flag}</td><td>{sw.value || '—'}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Effector Arguments — EDITABLE */}
            <div className="eff-editor-section">
                <div className="eff-editor-section-header">
                    <h3 className="eff-editor-section-title">EFFECTOR ARGUMENTS</h3>
                </div>
                {renderArgTable(
                    detail.argument_assignments ?? [],
                    handleDeleteEffArgAssignment,
                    handleReorderEffArg,
                    addingEffArg,
                    setAddingEffArg,
                    newEffArgId,
                    setNewEffArgId,
                    newEffArgOrder,
                    setNewEffArgOrder,
                    handleAddEffArgAssignment,
                )}
            </div>

            {/* New Argument Definition Form (shared) */}
            {creatingArg && (
                <div className="eff-editor-section">
                    <h3 className="eff-editor-section-title">CREATE NEW ARGUMENT DEFINITION</h3>
                    <div className="eff-editor-add-row" style={{ flexWrap: 'wrap' }}>
                        <input
                            className="eff-editor-input"
                            value={newArgName}
                            onChange={(e) => setNewArgName(e.target.value)}
                            placeholder="Name (e.g. project_path)"
                            style={{ flex: 1, minWidth: '120px' }}
                        />
                        <input
                            className="eff-editor-input"
                            value={newArgValue}
                            onChange={(e) => setNewArgValue(e.target.value)}
                            placeholder="Argument (e.g. {{project_path}})"
                            style={{ flex: 2, minWidth: '200px' }}
                        />
                        <button className="eff-editor-btn-action" onClick={handleCreateArgument}>Create</button>
                        <button className="eff-editor-btn-delete" onClick={() => setCreatingArg(false)}>&times;</button>
                    </div>
                </div>
            )}

            {/* Context Entries */}
            <div className="eff-editor-section">
                <div className="eff-editor-section-header">
                    <h3 className="eff-editor-section-title">CONTEXT ENTRIES</h3>
                </div>
                <table className="eff-editor-table">
                    <thead><tr><th>KEY</th><th>VALUE</th><th></th></tr></thead>
                    <tbody>
                        {contextEntries.map(entry => (
                            <tr key={entry.id}>
                                <td className="eff-editor-context-key">{entry.key}</td>
                                <td>
                                    <input
                                        className="eff-editor-table-input"
                                        value={entry.value}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setContextEntries(prev =>
                                                prev.map(ce => ce.id === entry.id ? { ...ce, value: val } : ce)
                                            );
                                        }}
                                        onBlur={() => handleContextUpdate(entry)}
                                    />
                                </td>
                                <td>
                                    <button className="eff-editor-btn-delete" onClick={() => handleContextDelete(entry.id)}>
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        ))}
                        <tr>
                            <td>
                                <input className="eff-editor-table-input" value={newCtxKey} onChange={(e) => setNewCtxKey(e.target.value)} placeholder="key..." />
                            </td>
                            <td>
                                <input className="eff-editor-table-input" value={newCtxValue} onChange={(e) => setNewCtxValue(e.target.value)} placeholder="value..." />
                            </td>
                            <td>
                                <button className="eff-editor-btn-small" onClick={handleContextAdd} disabled={!newCtxKey.trim()}>Add</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Danger Zone */}
            <div className="eff-editor-danger">
                <button className="eff-editor-btn-danger" onClick={handleDelete}>Delete Effector</button>
            </div>
        </div>
    ) : (
        <div className="eff-editor-empty">
            <p>Select an effector to edit, or create a new one</p>
        </div>
    );

    return <ThreePanel left={left} center={center} />;
}

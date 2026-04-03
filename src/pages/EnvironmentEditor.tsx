import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { apiFetch } from '../api';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useEnvironment } from '../context/EnvironmentProvider';
import type { ContextVariable, Environment } from '../context/EnvironmentProvider';
import { ThreePanel } from '../components/ThreePanel';
import './EnvironmentEditor.css';

interface EnvironmentType {
    id: number;
    name: string;
}

interface EnvironmentStatus {
    id: number;
    name: string;
}

interface ContextKey {
    id: number;
    name: string;
}

export function EnvironmentEditor() {
    const { setCrumbs } = useBreadcrumbs();
    const { environments, selectEnvironment, refreshEnvironments } = useEnvironment();

    const [selectedEnvId, setSelectedEnvId] = useState('');
    const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [typeId, setTypeId] = useState<number>(1);
    const [statusId, setStatusId] = useState<number>(1);
    const [available, setAvailable] = useState(false);
    const [contextVars, setContextVars] = useState<ContextVariable[]>([]);

    const [types, setTypes] = useState<EnvironmentType[]>([]);
    const [statuses, setStatuses] = useState<EnvironmentStatus[]>([]);
    const [contextKeys, setContextKeys] = useState<ContextKey[]>([]);

    const [addingVar, setAddingVar] = useState(false);
    const [newVarKeyId, setNewVarKeyId] = useState<number>(0);
    const [newVarValue, setNewVarValue] = useState('');
    const [selectError, setSelectError] = useState('');

    useEffect(() => {
        setCrumbs([{ label: 'Environments', path: '/environments' }]);
    }, [setCrumbs]);

    // Fetch lookup data
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [typesRes, statusesRes, keysRes] = await Promise.all([
                    apiFetch('/api/v2/environment-types/'),
                    apiFetch('/api/v2/environment-statuses/'),
                    apiFetch('/api/v2/context-keys/'),
                ]);

                if (cancelled) return;

                if (typesRes.ok) {
                    const data = await typesRes.json();
                    const items = Array.isArray(data) ? data : data.results ?? [];
                    if (!cancelled) setTypes(items);
                }
                if (statusesRes.ok) {
                    const data = await statusesRes.json();
                    const items = Array.isArray(data) ? data : data.results ?? [];
                    if (!cancelled) setStatuses(items);
                }
                if (keysRes.ok) {
                    const data = await keysRes.json();
                    const items = Array.isArray(data) ? data : data.results ?? [];
                    if (!cancelled) setContextKeys(items);
                }
            } catch (err) {
                console.error('Failed to fetch lookup data', err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    // Load environment detail when selected
    useEffect(() => {
        if (!selectedEnvId) {
            setEditingEnv(null);
            return;
        }

        let cancelled = false;

        const load = async () => {
            try {
                const res = await apiFetch(`/api/v2/environments/${selectedEnvId}/`);
                if (!res.ok || cancelled) return;
                const data: Environment = await res.json();
                if (cancelled) return;
                setEditingEnv(data);
                setName(data.name);
                setDescription(data.description ?? '');
                setTypeId(data.type);
                setStatusId(data.status);
                setAvailable(data.available);
                setContextVars(data.contexts);
            } catch (err) {
                console.error('Failed to fetch environment detail', err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [selectedEnvId]);

    const handleSave = async () => {
        if (!editingEnv) return;
        try {
            await apiFetch(`/api/v2/environments/${editingEnv.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, type: typeId, status: statusId, available }),
            });
            refreshEnvironments();
        } catch (err) {
            console.error('Failed to save environment', err);
        }
    };

    const handleFieldChange = async (field: string, value: number | boolean) => {
        if (!editingEnv) return;
        try {
            await apiFetch(`/api/v2/environments/${editingEnv.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value }),
            });
            if (field === 'type') setTypeId(value as number);
            if (field === 'status') setStatusId(value as number);
            if (field === 'available') setAvailable(value as boolean);
            refreshEnvironments();
        } catch (err) {
            console.error('Failed to save environment', err);
        }
    };

    const handleSetActive = async () => {
        if (!editingEnv) return;
        setSelectError('');
        try {
            const res = await apiFetch(`/api/v2/environments/${editingEnv.id}/select/`, { method: 'POST' });
            if (!res.ok) {
                if (res.status === 409) {
                    const data = await res.json().catch(() => null);
                    setSelectError(data?.detail ?? data?.error ?? 'Environment is not available');
                } else {
                    setSelectError('Failed to set as active');
                }
                return;
            }
            selectEnvironment(editingEnv.id);
            refreshEnvironments();
            setEditingEnv(prev => prev ? { ...prev, selected: true } : null);
        } catch (err) {
            console.error('Failed to select environment', err);
            setSelectError('Failed to set as active');
        }
    };

    const handleCreate = async () => {
        try {
            const res = await apiFetch('/api/v2/environments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'New Environment',
                    type: types[0]?.id ?? 1,
                    status: statuses[0]?.id ?? 1,
                    available: false,
                    selected: false,
                }),
            });
            if (!res.ok) return;
            const created: Environment = await res.json();
            refreshEnvironments();
            setSelectedEnvId(created.id);
        } catch (err) {
            console.error('Failed to create environment', err);
        }
    };

    const handleDelete = async () => {
        if (!editingEnv) return;
        const msg = editingEnv.selected
            ? `"${editingEnv.name}" is the ACTIVE environment. Deleting it will leave no active environment. Continue?`
            : `Delete "${editingEnv.name}"?`;
        if (!confirm(msg)) return;
        try {
            await apiFetch(`/api/v2/environments/${editingEnv.id}/`, { method: 'DELETE' });
            setSelectedEnvId('');
            setEditingEnv(null);
            refreshEnvironments();
        } catch (err) {
            console.error('Failed to delete environment', err);
        }
    };

    const handleVarValueChange = (varId: number, value: string) => {
        setContextVars(prev => prev.map(cv => cv.id === varId ? { ...cv, value } : cv));
    };

    const handleVarSave = async (cv: ContextVariable) => {
        try {
            await apiFetch(`/api/v2/context-variables/${cv.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: cv.value }),
            });
        } catch (err) {
            console.error('Failed to save context variable', err);
        }
    };

    const handleVarDelete = async (varId: number) => {
        if (!confirm('Delete this variable?')) return;
        try {
            await apiFetch(`/api/v2/context-variables/${varId}/`, { method: 'DELETE' });
            setContextVars(prev => prev.filter(cv => cv.id !== varId));
        } catch (err) {
            console.error('Failed to delete context variable', err);
        }
    };

    const handleVarAdd = async () => {
        if (!editingEnv || !newVarKeyId) return;
        try {
            const res = await apiFetch('/api/v2/context-variables/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    environment: editingEnv.id,
                    key: newVarKeyId,
                    value: newVarValue,
                }),
            });
            if (!res.ok) return;
            const created: ContextVariable = await res.json();
            setContextVars(prev => [...prev, created]);
            setAddingVar(false);
            setNewVarKeyId(0);
            setNewVarValue('');
        } catch (err) {
            console.error('Failed to add context variable', err);
        }
    };

    const left = (
        <div className="env-editor-list">
            <button className="env-editor-new-btn" onClick={handleCreate}>+ New Environment</button>
            {environments.map(env => (
                <div
                    key={env.id}
                    className={`env-editor-list-item${selectedEnvId === env.id ? ' active' : ''}${env.selected ? ' is-active-env' : ''}`}
                    onClick={() => setSelectedEnvId(env.id)}
                >
                    <div className="env-editor-list-item-name">{env.name}</div>
                    <div className="env-editor-list-item-meta">
                        <span className="env-editor-list-item-type">{env.type_name}</span>
                        <span className="env-editor-list-item-status">{env.status_name}</span>
                    </div>
                    {env.selected && <span className="env-editor-list-item-active-badge">ACTIVE</span>}
                </div>
            ))}
        </div>
    );

    const center = editingEnv ? (
        <div className="env-editor-detail glass-surface">
            <div className="env-editor-detail-header">
                <h2 className="env-editor-detail-title">
                    <Settings size={18} style={{ color: '#94a3b8', marginRight: '8px', verticalAlign: 'middle' }} />
                    {editingEnv.name}
                </h2>
                {!editingEnv.selected ? (
                    <button className="env-editor-btn-action" onClick={handleSetActive}>Set as Active</button>
                ) : (
                    <span className="env-editor-active-badge">&check; ACTIVE ENVIRONMENT</span>
                )}
            </div>
            {selectError && <div className="env-editor-error">{selectError}</div>}

            <div className="env-editor-form">
                <label className="env-editor-label">NAME</label>
                <input
                    className="env-editor-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={handleSave}
                />

                <label className="env-editor-label">DESCRIPTION</label>
                <textarea
                    className="env-editor-textarea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleSave}
                />

                <label className="env-editor-label">TYPE</label>
                <select
                    className="env-editor-select"
                    value={typeId}
                    onChange={(e) => handleFieldChange('type', Number(e.target.value))}
                >
                    {types.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                <label className="env-editor-label">STATUS</label>
                <select
                    className="env-editor-select"
                    value={statusId}
                    onChange={(e) => handleFieldChange('status', Number(e.target.value))}
                >
                    {statuses.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>

                <label className="env-editor-label env-editor-label-inline">
                    AVAILABLE
                    <input
                        type="checkbox"
                        className="env-editor-checkbox"
                        checked={available}
                        onChange={(e) => handleFieldChange('available', e.target.checked)}
                    />
                </label>
            </div>

            <div className="env-editor-contexts">
                <div className="env-editor-contexts-header">
                    <h3 className="env-editor-contexts-title">CONTEXT VARIABLES</h3>
                    <button className="env-editor-btn-small" onClick={() => setAddingVar(true)}>+ Add Variable</button>
                </div>

                <table className="env-editor-contexts-table">
                    <thead>
                        <tr>
                            <th>KEY</th>
                            <th>VALUE</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contextVars.map(cv => (
                            <tr key={cv.id}>
                                <td className="env-editor-contexts-key">{cv.key_name}</td>
                                <td>
                                    <input
                                        className="env-editor-contexts-value"
                                        value={cv.value}
                                        onChange={(e) => handleVarValueChange(cv.id, e.target.value)}
                                        onBlur={() => handleVarSave(cv)}
                                    />
                                </td>
                                <td>
                                    <button className="env-editor-btn-delete" onClick={() => handleVarDelete(cv.id)}>&times;</button>
                                </td>
                            </tr>
                        ))}
                        {addingVar && (
                            <tr className="env-editor-contexts-add-row">
                                <td>
                                    <select
                                        className="env-editor-select"
                                        value={newVarKeyId}
                                        onChange={(e) => setNewVarKeyId(Number(e.target.value))}
                                    >
                                        <option value={0}>Select key...</option>
                                        {contextKeys.map(k => (
                                            <option key={k.id} value={k.id}>{k.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <input
                                        className="env-editor-contexts-value"
                                        value={newVarValue}
                                        onChange={(e) => setNewVarValue(e.target.value)}
                                        placeholder="Value..."
                                    />
                                </td>
                                <td className="env-editor-contexts-add-actions">
                                    <button className="env-editor-btn-small" onClick={handleVarAdd}>Save</button>
                                    <button className="env-editor-btn-delete" onClick={() => { setAddingVar(false); setNewVarKeyId(0); setNewVarValue(''); }}>&times;</button>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="env-editor-danger">
                <button className="env-editor-btn-danger" onClick={handleDelete}>Delete Environment</button>
            </div>
        </div>
    ) : (
        <div className="env-editor-empty">
            <p>Select an environment to edit</p>
        </div>
    );

    return <ThreePanel left={left} center={center} />;
}

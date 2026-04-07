import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../api';
import './AddonEditor.css';

interface AddonPhase {
    id: number;
    name: string;
}

interface Addon {
    id: number | string;
    name: string;
    description: string;
    phase: number | AddonPhase | null;
    function_slug: string | null;
}

interface AddonEditorProps {
    onRefresh?: () => void;
}

/* Phase constants — fixed in backend (IdentityAddonPhase has no API endpoint) */
const PHASES: AddonPhase[] = [
    { id: 1, name: 'IDENTIFY' },
    { id: 2, name: 'CONTEXT' },
    { id: 3, name: 'HISTORY' },
    { id: 4, name: 'TERMINAL' },
];

const PHASE_LABELS: Record<number, string> = {
    1: 'IDENTIFY',
    2: 'CONTEXT',
    3: 'HISTORY',
    4: 'TERMINAL',
};

const PHASE_COLORS: Record<number, string> = {
    1: 'var(--accent-blue)',
    2: 'var(--accent-green)',
    3: 'var(--accent-yellow)',
    4: 'var(--accent-red)',
};

const resolvePhaseId = (phase: number | AddonPhase | null): number | null => {
    if (phase === null || phase === undefined) return null;
    if (typeof phase === 'object') return phase.id;
    return phase;
};

export const AddonEditor = ({ onRefresh }: AddonEditorProps) => {
    const [addons, setAddons] = useState<Addon[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Create form state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [createPhase, setCreatePhase] = useState<number | ''>('');
    const [createSlug, setCreateSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Inline edit state
    const [editingField, setEditingField] = useState<{ addonId: string | number; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Delete confirm state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

    // Fetch addons (phases are hardcoded constants — no API endpoint)
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/identity_addons/');
                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setAddons(data.results ?? data);
                }
            } catch (err) {
                console.error('Failed to fetch addons', err);
            } finally {
                if (!cancelled) setIsLoaded(true);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const patchAddon = async (addonId: string | number, payload: Record<string, unknown>) => {
        setSavingId(addonId);
        try {
            const res = await apiFetch(`/api/v2/identity_addons/${addonId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Patch failed (${res.status})`);
            const updated: Addon = await res.json();
            setAddons(prev => prev.map(a => a.id === addonId ? updated : a));
        } catch (err) {
            console.error('Addon patch failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleBlurField = (addon: Addon, field: 'name' | 'description' | 'function_slug') => {
        setEditingField(null);
        const currentVal = field === 'function_slug' ? (addon.function_slug ?? '') : addon[field];
        if (editValue === currentVal) return;
        patchAddon(addon.id, { [field]: editValue || null });
    };

    const handlePhaseChange = (addon: Addon, newPhaseId: number | null) => {
        patchAddon(addon.id, { phase: newPhaseId });
    };

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await apiFetch('/api/v2/identity_addons/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDesc.trim(),
                    phase: createPhase || null,
                    function_slug: createSlug.trim() || null,
                }),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created: Addon = await res.json();
            setAddons(prev => [created, ...prev]);
            setShowCreate(false);
            setCreateName('');
            setCreateDesc('');
            setCreatePhase('');
            setCreateSlug('');
            onRefresh?.();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create addon.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (addon: Addon) => {
        setSavingId(addon.id);
        try {
            const res = await apiFetch(`/api/v2/identity_addons/${addon.id}/`, {
                method: 'DELETE',
            });
            if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
            setAddons(prev => prev.filter(a => a.id !== addon.id));
            setConfirmDeleteId(null);
            onRefresh?.();
        } catch (err) {
            console.error('Delete failed', err);
        } finally {
            setSavingId(null);
        }
    };

    if (!isLoaded) {
        return (
            <div className="addon-editor">
                <div className="addon-empty">
                    <Loader2 className="animate-spin" size={16} />
                </div>
            </div>
        );
    }

    return (
        <div className="addon-editor">
            {/* Action buttons */}
            {!showCreate ? (
                <div className="addon-action-bar">
                    <button
                        type="button"
                        className="addon-create-toggle"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus size={14} /> New Addon
                    </button>
                </div>
            ) : (
                <div className="addon-create-form">
                    <div>
                        <div className="addon-create-field-label">Name</div>
                        <input
                            className="addon-create-input"
                            type="text"
                            value={createName}
                            onChange={e => setCreateName(e.target.value)}
                            placeholder="Addon name..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <div className="addon-create-field-label">Description</div>
                        <textarea
                            className="addon-create-textarea"
                            value={createDesc}
                            onChange={e => setCreateDesc(e.target.value)}
                            placeholder="What does this addon do?..."
                        />
                    </div>
                    <div>
                        <div className="addon-create-field-label">Phase</div>
                        <select
                            className="addon-create-select"
                            value={createPhase}
                            onChange={e => setCreatePhase(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">No phase</option>
                            {PHASES.map(p => (
                                <option key={p.id} value={p.id}>
                                    {PHASE_LABELS[p.id] ?? p.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <div className="addon-create-field-label">Function Slug</div>
                        <input
                            className="addon-create-input"
                            type="text"
                            value={createSlug}
                            onChange={e => setCreateSlug(e.target.value)}
                            placeholder="e.g. river_of_six_addon"
                        />
                    </div>
                    {createError && (
                        <span className="font-mono text-xs" style={{ color: 'var(--accent-red)' }}>{createError}</span>
                    )}
                    <div className="addon-create-form-actions">
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleCreate}
                            disabled={isCreating || !createName.trim()}
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={12} /> : 'Create'}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary-outline"
                            onClick={() => { setShowCreate(false); setCreateError(null); }}
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Addon card list */}
            {addons.length === 0 ? (
                <div className="addon-empty">No addons in catalog yet.</div>
            ) : (
                <div className="addon-card-list">
                    {addons.map(addon => {
                        const isSaving = savingId === addon.id;
                        const isDeleting = confirmDeleteId === addon.id;
                        const phaseId = resolvePhaseId(addon.phase);

                        return (
                            <div key={addon.id} className="addon-card">
                                {/* Header: title + phase badge + controls */}
                                <div className="addon-card-header">
                                    {editingField?.addonId === addon.id && editingField.field === 'name' ? (
                                        <input
                                            className="addon-card-title-input"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onBlur={() => handleBlurField(addon, 'name')}
                                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="addon-card-title"
                                            onClick={() => { setEditingField({ addonId: addon.id, field: 'name' }); setEditValue(addon.name); }}
                                        >
                                            {addon.name || 'Untitled'}
                                        </span>
                                    )}

                                    <div className="addon-card-controls">
                                        {isSaving && <span className="addon-saving">saving...</span>}

                                        {/* Phase selector */}
                                        <select
                                            className="addon-phase-select"
                                            value={phaseId ?? ''}
                                            onChange={e => handlePhaseChange(addon, e.target.value ? Number(e.target.value) : null)}
                                            style={phaseId ? { borderColor: PHASE_COLORS[phaseId], color: PHASE_COLORS[phaseId] } : undefined}
                                        >
                                            <option value="">—</option>
                                            {PHASES.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {PHASE_LABELS[p.id] ?? p.name}
                                                </option>
                                            ))}
                                        </select>

                                        {isDeleting && (
                                            <div className="addon-delete-confirm">
                                                <span className="font-mono text-xs" style={{ color: 'var(--accent-red)' }}>Delete?</span>
                                                <button
                                                    type="button"
                                                    className="addon-confirm-btn addon-confirm-yes"
                                                    onClick={() => handleDelete(addon)}
                                                    disabled={isSaving}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    className="addon-confirm-btn addon-confirm-no"
                                                    onClick={() => setConfirmDeleteId(null)}
                                                    disabled={isSaving}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        )}
                                        {!isDeleting && (
                                            <button
                                                type="button"
                                                className="addon-delete-btn"
                                                onClick={() => setConfirmDeleteId(addon.id)}
                                                title="Delete addon"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Function slug */}
                                {editingField?.addonId === addon.id && editingField.field === 'function_slug' ? (
                                    <input
                                        className="addon-card-slug-input"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleBlurField(addon, 'function_slug')}
                                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                        placeholder="function_slug..."
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={`addon-card-slug ${!addon.function_slug ? 'addon-card-slug-empty' : ''}`}
                                        onClick={() => {
                                            setEditingField({ addonId: addon.id, field: 'function_slug' });
                                            setEditValue(addon.function_slug ?? '');
                                        }}
                                        title="Function slug — maps to addon registry"
                                    >
                                        {addon.function_slug
                                            ? <><span className="addon-slug-label">fn:</span> {addon.function_slug}</>
                                            : 'Click to set function slug...'
                                        }
                                    </div>
                                )}

                                {/* Description */}
                                {editingField?.addonId === addon.id && editingField.field === 'description' ? (
                                    <textarea
                                        className="addon-card-description-input"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleBlurField(addon, 'description')}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={`addon-card-description ${!addon.description ? 'addon-card-description-empty' : ''}`}
                                        onClick={() => { setEditingField({ addonId: addon.id, field: 'description' }); setEditValue(addon.description ?? ''); }}
                                    >
                                        {addon.description || 'Click to add description...'}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

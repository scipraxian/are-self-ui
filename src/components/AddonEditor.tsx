import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../api';
import './AddonEditor.css';

interface Addon {
    id: number | string;
    name: string;
    description: string;
}

interface AddonEditorProps {
    onRefresh?: () => void;
}

export const AddonEditor = ({ onRefresh }: AddonEditorProps) => {
    const [addons, setAddons] = useState<Addon[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Create form state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Inline edit state
    const [editingField, setEditingField] = useState<{ addonId: string | number; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Delete confirm state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

    // Fetch all addons
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

    const handleBlurField = (addon: Addon, field: 'name' | 'description') => {
        setEditingField(null);
        if (editValue === addon[field]) return;
        patchAddon(addon.id, { [field]: editValue });
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
                }),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created: Addon = await res.json();
            setAddons(prev => [created, ...prev]);
            setShowCreate(false);
            setCreateName('');
            setCreateDesc('');
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

                        return (
                            <div key={addon.id} className="addon-card">
                                {/* Header: title + controls */}
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

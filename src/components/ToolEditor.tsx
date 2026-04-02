import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../api';
import './ToolEditor.css';

interface Tool {
    id: number | string;
    name: string;
    description: string;
    is_async: boolean;
}

interface ToolEditorProps {
    onRefresh?: () => void;
}

export const ToolEditor = ({ onRefresh }: ToolEditorProps) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Create form state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [createIsAsync, setCreateIsAsync] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Inline edit state
    const [editingField, setEditingField] = useState<{ toolId: string | number; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Delete confirm state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

    // Fetch all tools
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/tool-definitions/');
                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) setTools(data.results ?? data);
                }
            } catch (err) {
                console.error('Failed to fetch tools', err);
            } finally {
                if (!cancelled) setIsLoaded(true);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const patchTool = async (toolId: string | number, payload: Record<string, unknown>) => {
        setSavingId(toolId);
        try {
            const res = await apiFetch(`/api/v2/tool-definitions/${toolId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Patch failed (${res.status})`);
            const updated: Tool = await res.json();
            setTools(prev => prev.map(t => t.id === toolId ? updated : t));
        } catch (err) {
            console.error('Tool patch failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleBlurField = (tool: Tool, field: 'name' | 'description') => {
        setEditingField(null);
        if (editValue === tool[field]) return;
        patchTool(tool.id, { [field]: editValue });
    };

    const handleToggleAsync = (tool: Tool) => {
        patchTool(tool.id, { is_async: !tool.is_async });
    };

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await apiFetch('/api/v2/tool-definitions/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDesc.trim(),
                    is_async: createIsAsync,
                }),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created: Tool = await res.json();
            setTools(prev => [created, ...prev]);
            setShowCreate(false);
            setCreateName('');
            setCreateDesc('');
            setCreateIsAsync(false);
            onRefresh?.();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create tool.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (tool: Tool) => {
        setSavingId(tool.id);
        try {
            const res = await apiFetch(`/api/v2/tool-definitions/${tool.id}/`, {
                method: 'DELETE',
            });
            if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
            setTools(prev => prev.filter(t => t.id !== tool.id));
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
            <div className="tool-editor">
                <div className="tool-empty">
                    <Loader2 className="animate-spin" size={16} />
                </div>
            </div>
        );
    }

    return (
        <div className="tool-editor">
            {/* Action buttons */}
            {!showCreate ? (
                <div className="tool-action-bar">
                    <button
                        type="button"
                        className="tool-create-toggle"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus size={14} /> New Tool
                    </button>
                </div>
            ) : (
                <div className="tool-create-form">
                    <div>
                        <div className="tool-create-field-label">Name</div>
                        <input
                            className="tool-create-input"
                            type="text"
                            value={createName}
                            onChange={e => setCreateName(e.target.value)}
                            placeholder="Tool name..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <div className="tool-create-field-label">Description</div>
                        <textarea
                            className="tool-create-textarea"
                            value={createDesc}
                            onChange={e => setCreateDesc(e.target.value)}
                            placeholder="Tool description..."
                        />
                    </div>
                    <div>
                        <label className="tool-checkbox-label">
                            <input
                                type="checkbox"
                                checked={createIsAsync}
                                onChange={e => setCreateIsAsync(e.target.checked)}
                            />
                            Async execution
                        </label>
                    </div>
                    {createError && (
                        <span className="font-mono text-xs" style={{ color: 'var(--accent-red)' }}>{createError}</span>
                    )}
                    <div className="tool-create-form-actions">
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

            {/* Tool card list */}
            {tools.length === 0 ? (
                <div className="tool-empty">No tools in registry yet.</div>
            ) : (
                <div className="tool-card-list">
                    {tools.map(tool => {
                        const isSaving = savingId === tool.id;
                        const isDeleting = confirmDeleteId === tool.id;

                        return (
                            <div key={tool.id} className="tool-card">
                                {/* Header: title + controls */}
                                <div className="tool-card-header">
                                    {editingField?.toolId === tool.id && editingField.field === 'name' ? (
                                        <input
                                            className="tool-card-title-input"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onBlur={() => handleBlurField(tool, 'name')}
                                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="tool-card-title"
                                            onClick={() => { setEditingField({ toolId: tool.id, field: 'name' }); setEditValue(tool.name); }}
                                        >
                                            {tool.name || 'Untitled'}
                                        </span>
                                    )}

                                    <div className="tool-card-controls">
                                        {isSaving && <span className="tool-saving">saving...</span>}
                                        <div className="tool-card-async-indicator">
                                            <button
                                                type="button"
                                                className={`tool-async-badge ${tool.is_async ? 'tool-async-active' : ''}`}
                                                onClick={() => handleToggleAsync(tool)}
                                                title={tool.is_async ? 'Async enabled' : 'Sync only'}
                                            >
                                                {tool.is_async ? 'ASYNC' : 'SYNC'}
                                            </button>
                                        </div>
                                        {isDeleting && (
                                            <div className="tool-delete-confirm">
                                                <span className="font-mono text-xs" style={{ color: 'var(--accent-red)' }}>Delete?</span>
                                                <button
                                                    type="button"
                                                    className="tool-confirm-btn tool-confirm-yes"
                                                    onClick={() => handleDelete(tool)}
                                                    disabled={isSaving}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    className="tool-confirm-btn tool-confirm-no"
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
                                                className="tool-delete-btn"
                                                onClick={() => setConfirmDeleteId(tool.id)}
                                                title="Delete tool"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                {editingField?.toolId === tool.id && editingField.field === 'description' ? (
                                    <textarea
                                        className="tool-card-description-input"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleBlurField(tool, 'description')}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={`tool-card-description ${!tool.description ? 'tool-card-description-empty' : ''}`}
                                        onClick={() => { setEditingField({ toolId: tool.id, field: 'description' }); setEditValue(tool.description ?? ''); }}
                                    >
                                        {tool.description || 'Click to add description...'}
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

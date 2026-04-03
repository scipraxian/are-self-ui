import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Plus, Trash2, X } from 'lucide-react';
import { apiFetch } from '../api';
import './ToolEditor.css';

interface ToolUseType {
    id: number | string;
    name: string;
    description: string;
    focus_modifier: number;
    xp_reward: number;
}

interface ToolParameterType {
    id: number | string;
    name: string;
}

interface ToolParameter {
    id: number | string;
    name: string;
    description: string;
    type: number | ToolParameterType;
}

interface ParameterAssignment {
    id: number | string;
    tool: number | string;
    parameter: number | string | ToolParameter;
    required: boolean;
    prune_after_turns: number;
}

interface ParameterEnum {
    id: number | string;
    parameter: number | string;
    value: string;
}

interface Tool {
    id: number | string;
    name: string;
    description: string;
    is_async: boolean;
    use_type: number | ToolUseType | null;
}

interface ToolEditorProps {
    onRefresh?: () => void;
}

const resolveParamName = (param: number | string | ToolParameter): string => {
    if (typeof param === 'object' && param !== null) return param.name;
    return String(param);
};

const resolveParamTypeName = (param: number | string | ToolParameter): string => {
    if (typeof param === 'object' && param !== null) {
        const t = param.type;
        if (typeof t === 'object' && t !== null) return t.name;
        return String(t);
    }
    return '';
};

const resolveUseTypeId = (useType: number | ToolUseType | null): number | string | null => {
    if (useType === null || useType === undefined) return null;
    if (typeof useType === 'object') return useType.id;
    return useType;
};

export const ToolEditor = ({ onRefresh }: ToolEditorProps) => {
    const [tools, setTools] = useState<Tool[]>([]);
    const [useTypes, setUseTypes] = useState<ToolUseType[]>([]);
    const [allParams, setAllParams] = useState<ToolParameter[]>([]);
    const [assignments, setAssignments] = useState<ParameterAssignment[]>([]);
    const [paramEnums, setParamEnums] = useState<ParameterEnum[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Create form state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [createIsAsync, setCreateIsAsync] = useState(false);
    const [createUseType, setCreateUseType] = useState<number | string | ''>('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Inline edit state
    const [editingField, setEditingField] = useState<{ toolId: string | number; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Delete confirm state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

    // Expanded tool (shows parameter panel)
    const [expandedToolId, setExpandedToolId] = useState<string | number | null>(null);

    // Add parameter state
    const [addingParamToolId, setAddingParamToolId] = useState<string | number | null>(null);
    const [addParamId, setAddParamId] = useState<number | string | ''>('');
    const [addParamRequired, setAddParamRequired] = useState(true);

    // Fetch tools + use types + params + assignments
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [toolsRes, useTypesRes, paramsRes, assignRes, enumsRes] = await Promise.all([
                    apiFetch('/api/v2/tool-definitions/'),
                    apiFetch('/api/v2/tool-use-types/'),
                    apiFetch('/api/v2/tool-parameters/'),
                    apiFetch('/api/v2/tool-parameter-assignments/'),
                    apiFetch('/api/v2/parameter-enums/'),
                ]);
                if (cancelled) return;

                if (toolsRes.ok) {
                    const data = await toolsRes.json();
                    if (!cancelled) setTools(data.results ?? data);
                }
                if (useTypesRes.ok) {
                    const data = await useTypesRes.json();
                    if (!cancelled) setUseTypes(data.results ?? data);
                }
                if (paramsRes.ok) {
                    const data = await paramsRes.json();
                    if (!cancelled) setAllParams(data.results ?? data);
                }
                if (assignRes.ok) {
                    const data = await assignRes.json();
                    if (!cancelled) setAssignments(data.results ?? data);
                }
                if (enumsRes.ok) {
                    const data = await enumsRes.json();
                    if (!cancelled) setParamEnums(data.results ?? data);
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

    const handleUseTypeChange = (tool: Tool, newTypeId: number | string | null) => {
        patchTool(tool.id, { use_type: newTypeId });
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
                    use_type: createUseType || null,
                }),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created: Tool = await res.json();
            setTools(prev => [created, ...prev]);
            setShowCreate(false);
            setCreateName('');
            setCreateDesc('');
            setCreateIsAsync(false);
            setCreateUseType('');
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

    /* Parameter assignment CRUD */
    const handleAddParam = async (toolId: string | number) => {
        if (!addParamId) return;
        setSavingId(toolId);
        try {
            const res = await apiFetch('/api/v2/tool-parameter-assignments/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tool: toolId,
                    parameter: addParamId,
                    required: addParamRequired,
                    prune_after_turns: 0,
                }),
            });
            if (!res.ok) throw new Error(`Add param failed (${res.status})`);
            const created: ParameterAssignment = await res.json();
            setAssignments(prev => [...prev, created]);
            setAddingParamToolId(null);
            setAddParamId('');
            setAddParamRequired(true);
        } catch (err) {
            console.error('Add param failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleToggleRequired = async (assignment: ParameterAssignment) => {
        setSavingId(assignment.id);
        try {
            const res = await apiFetch(`/api/v2/tool-parameter-assignments/${assignment.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ required: !assignment.required }),
            });
            if (!res.ok) throw new Error(`Toggle failed (${res.status})`);
            const updated: ParameterAssignment = await res.json();
            setAssignments(prev => prev.map(a => a.id === assignment.id ? updated : a));
        } catch (err) {
            console.error('Toggle required failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleRemoveParam = async (assignmentId: string | number) => {
        setSavingId(assignmentId);
        try {
            const res = await apiFetch(`/api/v2/tool-parameter-assignments/${assignmentId}/`, {
                method: 'DELETE',
            });
            if (!res.ok && res.status !== 204) throw new Error(`Remove failed (${res.status})`);
            setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        } catch (err) {
            console.error('Remove param failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const getToolAssignments = (toolId: string | number): ParameterAssignment[] => {
        return assignments.filter(a => {
            const aToolId = typeof a.tool === 'object' ? (a.tool as unknown as { id: number | string }).id : a.tool;
            return String(aToolId) === String(toolId);
        });
    };

    const getParamEnums = (paramId: string | number): ParameterEnum[] => {
        return paramEnums.filter(e => {
            const ePId = typeof e.parameter === 'object' ? (e.parameter as unknown as { id: number | string }).id : e.parameter;
            return String(ePId) === String(paramId);
        });
    };

    const getUnassignedParams = (toolId: string | number): ToolParameter[] => {
        const assigned = new Set(
            getToolAssignments(toolId).map(a => {
                const p = a.parameter;
                return String(typeof p === 'object' ? (p as ToolParameter).id : p);
            })
        );
        return allParams.filter(p => !assigned.has(String(p.id)));
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
                        <div className="tool-create-field-label">Use Type</div>
                        <select
                            className="tool-create-select"
                            value={createUseType}
                            onChange={e => setCreateUseType(e.target.value ? Number(e.target.value) : '')}
                        >
                            <option value="">No use type</option>
                            {useTypes.map(ut => (
                                <option key={ut.id} value={ut.id}>
                                    {ut.name} (XP:{ut.xp_reward} Focus:{ut.focus_modifier})
                                </option>
                            ))}
                        </select>
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
                        const isExpanded = expandedToolId === tool.id;
                        const toolAssignments = getToolAssignments(tool.id);
                        const useTypeId = resolveUseTypeId(tool.use_type);

                        return (
                            <div key={tool.id} className={`tool-card ${isExpanded ? 'tool-card-expanded' : ''}`}>
                                {/* Header: title + controls */}
                                <div className="tool-card-header">
                                    {/* Expand chevron */}
                                    <button
                                        type="button"
                                        className="tool-expand-btn"
                                        onClick={() => setExpandedToolId(isExpanded ? null : tool.id)}
                                        title={isExpanded ? 'Collapse' : 'Show parameters'}
                                    >
                                        {isExpanded
                                            ? <ChevronDown size={14} />
                                            : <ChevronRight size={14} />
                                        }
                                    </button>

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

                                        {/* Use type selector */}
                                        <select
                                            className="tool-usetype-select"
                                            value={useTypeId ?? ''}
                                            onChange={e => handleUseTypeChange(tool, e.target.value ? Number(e.target.value) : null)}
                                        >
                                            <option value="">—</option>
                                            {useTypes.map(ut => (
                                                <option key={ut.id} value={ut.id}>{ut.name}</option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            className={`tool-async-badge ${tool.is_async ? 'tool-async-active' : ''}`}
                                            onClick={() => handleToggleAsync(tool)}
                                            title={tool.is_async ? 'Async enabled' : 'Sync only'}
                                        >
                                            {tool.is_async ? 'ASYNC' : 'SYNC'}
                                        </button>

                                        {/* Param count badge */}
                                        {toolAssignments.length > 0 && (
                                            <span className="tool-param-count" title={`${toolAssignments.length} parameters`}>
                                                {toolAssignments.length}p
                                            </span>
                                        )}

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

                                {/* Expanded: Parameter assignments */}
                                {isExpanded && (
                                    <div className="tool-params-panel">
                                        <div className="tool-params-header">
                                            <span className="tool-params-title">Parameters</span>
                                            <button
                                                type="button"
                                                className="tool-param-add-btn"
                                                onClick={() => setAddingParamToolId(addingParamToolId === tool.id ? null : tool.id)}
                                            >
                                                <Plus size={12} /> Add
                                            </button>
                                        </div>

                                        {/* Add parameter form */}
                                        {addingParamToolId === tool.id && (
                                            <div className="tool-param-add-form">
                                                <select
                                                    className="tool-param-add-select"
                                                    value={addParamId}
                                                    onChange={e => setAddParamId(e.target.value ? Number(e.target.value) : '')}
                                                >
                                                    <option value="">Select parameter...</option>
                                                    {getUnassignedParams(tool.id).map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({resolveParamTypeName(p) || '?'})
                                                        </option>
                                                    ))}
                                                </select>
                                                <label className="tool-checkbox-label tool-param-req-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={addParamRequired}
                                                        onChange={e => setAddParamRequired(e.target.checked)}
                                                    />
                                                    Required
                                                </label>
                                                <button
                                                    type="button"
                                                    className="btn-primary tool-param-add-confirm"
                                                    onClick={() => handleAddParam(tool.id)}
                                                    disabled={!addParamId}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        )}

                                        {/* Parameter list */}
                                        {toolAssignments.length === 0 ? (
                                            <div className="tool-params-empty">No parameters assigned.</div>
                                        ) : (
                                            <div className="tool-params-list">
                                                {toolAssignments.map(assignment => {
                                                    const paramId = typeof assignment.parameter === 'object'
                                                        ? (assignment.parameter as ToolParameter).id
                                                        : assignment.parameter;
                                                    const enums = getParamEnums(paramId);

                                                    return (
                                                        <div key={assignment.id} className="tool-param-row">
                                                            <span className="tool-param-name">
                                                                {resolveParamName(assignment.parameter)}
                                                            </span>
                                                            <span className="tool-param-type">
                                                                {resolveParamTypeName(assignment.parameter as ToolParameter)}
                                                            </span>
                                                            {enums.length > 0 && (
                                                                <span className="tool-param-enums" title={enums.map(e => e.value).join(', ')}>
                                                                    [{enums.length} vals]
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className={`tool-param-required-badge ${assignment.required ? 'tool-param-required-active' : ''}`}
                                                                onClick={() => handleToggleRequired(assignment)}
                                                                title={assignment.required ? 'Required — click to make optional' : 'Optional — click to make required'}
                                                            >
                                                                {assignment.required ? 'REQ' : 'OPT'}
                                                            </button>
                                                            {assignment.prune_after_turns > 0 && (
                                                                <span className="tool-param-prune" title={`Pruned after ${assignment.prune_after_turns} turns`}>
                                                                    ~{assignment.prune_after_turns}t
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                className="tool-param-remove-btn"
                                                                onClick={() => handleRemoveParam(assignment.id)}
                                                                title="Remove parameter"
                                                            >
                                                                <X size={10} />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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

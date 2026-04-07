import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { apiFetch } from '../api';
import './SelectionFilterEditor.css';

interface SelectionFilter {
    id: string | number;
    name: string;
    failover_strategy?: { id: string | number; name: string } | null;
    preferred_model?: { id: string | number; provider: { name: string }; ai_model: { name: string } } | null;
    local_failover?: { id: string | number; provider: { name: string }; ai_model: { name: string } } | null;
    required_capabilities?: Array<{ id: string | number; name: string }>;
    banned_providers?: Array<{ id: string | number; name: string }>;
    preferred_categories?: Array<{ id: string | number; name: string }>;
    preferred_tags?: Array<{ id: string | number; name: string }>;
    preferred_roles?: Array<{ id: string | number; name: string }>;
}

interface FailoverStrategy {
    id: string | number;
    name: string;
}

interface AIModelProvider {
    id: string | number;
    ai_model: { name: string };
    provider: { name: string };
}

interface SelectionFilterEditorProps {
    onRefresh?: () => void;
}

export const SelectionFilterEditor = ({ onRefresh }: SelectionFilterEditorProps) => {
    const [filters, setFilters] = useState<SelectionFilter[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Dropdown data
    const [failoverStrategies, setFailoverStrategies] = useState<FailoverStrategy[]>([]);
    const [modelProviders, setModelProviders] = useState<AIModelProvider[]>([]);
    const [capabilities, setCapabilities] = useState<Array<{ id: string | number; name: string }>>([]);
    const [providers, setProviders] = useState<Array<{ id: string | number; name: string }>>([]);
    const [categories, setCategories] = useState<Array<{ id: string | number; name: string }>>([]);
    const [tags, setTags] = useState<Array<{ id: string | number; name: string }>>([]);
    const [roles, setRoles] = useState<Array<{ id: string | number; name: string }>>([]);

    // Create form state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Delete confirm state
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);

    // Fetch all data
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [
                    filterRes,
                    stratRes,
                    provRes,
                    capRes,
                    llmProvRes,
                    catRes,
                    tagRes,
                    roleRes
                ] = await Promise.all([
                    apiFetch('/api/v2/selection-filters/'),
                    apiFetch('/api/v2/failover-strategies/'),
                    apiFetch('/api/v2/model-providers/'),
                    apiFetch('/api/v2/model-capabilities/'),
                    apiFetch('/api/v2/llm-providers/'),
                    apiFetch('/api/v2/model-categories/'),
                    apiFetch('/api/v2/model-tags/'),
                    apiFetch('/api/v2/model-roles/'),
                ]);

                if (!cancelled) {
                    if (filterRes.ok) {
                        const data = await filterRes.json();
                        setFilters(data.results ?? data);
                    }
                    if (stratRes.ok) {
                        const data = await stratRes.json();
                        setFailoverStrategies(data.results ?? data);
                    }
                    if (provRes.ok) {
                        const data = await provRes.json();
                        setModelProviders(data.results ?? data);
                    }
                    if (capRes.ok) {
                        const data = await capRes.json();
                        setCapabilities(data.results ?? data);
                    }
                    if (llmProvRes.ok) {
                        const data = await llmProvRes.json();
                        setProviders(data.results ?? data);
                    }
                    if (catRes.ok) {
                        const data = await catRes.json();
                        setCategories(data.results ?? data);
                    }
                    if (tagRes.ok) {
                        const data = await tagRes.json();
                        setTags(data.results ?? data);
                    }
                    if (roleRes.ok) {
                        const data = await roleRes.json();
                        setRoles(data.results ?? data);
                    }
                    setIsLoaded(true);
                }
            } catch (err) {
                console.error('Failed to fetch data', err);
                if (!cancelled) setIsLoaded(true);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const patchFilter = async (filterId: string | number, payload: Record<string, unknown>) => {
        setSavingId(filterId);
        try {
            const res = await apiFetch(`/api/v2/selection-filters/${filterId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Patch failed (${res.status})`);
            const updated: SelectionFilter = await res.json();
            setFilters(prev => prev.map(f => f.id === filterId ? updated : f));
            if (onRefresh) onRefresh();
        } catch (err) {
            console.error('Filter patch failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await apiFetch('/api/v2/selection-filters/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName.trim(),
                }),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created: SelectionFilter = await res.json();
            setFilters(prev => [created, ...prev]);
            setShowCreate(false);
            setCreateName('');
            if (onRefresh) onRefresh();
        } catch (err: any) {
            setCreateError(err.message ?? 'Failed to create filter');
            console.error('Create failed', err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (filterId: string | number) => {
        try {
            const res = await apiFetch(`/api/v2/selection-filters/${filterId}/`, {
                method: 'DELETE',
            });
            if (!res.ok && res.status !== 204) {
                throw new Error(`Delete failed (${res.status})`);
            }
            setFilters(prev => prev.filter(f => f.id !== filterId));
            setConfirmDeleteId(null);
            if (onRefresh) onRefresh();
        } catch (err: any) {
            console.error('Delete failed', err);
        }
    };

    const toggleIdInSet = (currentIds: (string | number)[] | undefined, id: string | number) => {
        const current = currentIds ?? [];
        return current.includes(id)
            ? current.filter(x => x !== id)
            : [...current, id];
    };

    if (!isLoaded) {
        return (
            <div className="selection-filter-editor">
                <div className="filter-loading">
                    <Loader2 className="animate-spin" size={20} />
                    <span className="font-mono text-xs">Loading routing engines...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="selection-filter-editor">
            {!showCreate && (
                <button
                    type="button"
                    className="filter-create-toggle"
                    onClick={() => setShowCreate(true)}
                >
                    <Plus size={12} />
                    New Filter
                </button>
            )}

            {showCreate && (
                <div className="filter-create-form">
                    <div>
                        <label className="filter-create-field-label">Filter Name</label>
                        <input
                            type="text"
                            className="filter-create-input"
                            placeholder="e.g., Local Coding Expert"
                            value={createName}
                            onChange={e => setCreateName(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && createName.trim()) {
                                    handleCreate();
                                }
                            }}
                        />
                    </div>
                    {createError && (
                        <div className="filter-create-error">
                            <span className="font-mono text-xs">{createError}</span>
                        </div>
                    )}
                    <div className="filter-create-form-actions">
                        <button
                            type="button"
                            className="filter-btn-create"
                            onClick={handleCreate}
                            disabled={!createName.trim() || isCreating}
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={12} /> : <Plus size={12} />}
                            Create
                        </button>
                        <button
                            type="button"
                            className="filter-btn-cancel"
                            onClick={() => {
                                setShowCreate(false);
                                setCreateName('');
                                setCreateError(null);
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {filters.length === 0 && !showCreate ? (
                <div className="filter-empty">
                    No selection filters configured. Create one to customize model routing.
                </div>
            ) : (
                <div className="filter-card-list">
                    {filters.map(filter => (
                        <div key={filter.id} className="filter-card">
                            <div className="filter-card-header">
                                <div className="filter-card-title">{filter.name}</div>
                                <div className="filter-card-controls">
                                    {savingId === filter.id && (
                                        <span className="filter-saving">Saving...</span>
                                    )}
                                    {confirmDeleteId === filter.id ? (
                                        <div className="filter-delete-confirm">
                                            <button
                                                type="button"
                                                className="filter-confirm-btn filter-confirm-yes"
                                                onClick={() => handleDelete(filter.id)}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                type="button"
                                                className="filter-confirm-btn filter-confirm-no"
                                                onClick={() => setConfirmDeleteId(null)}
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="filter-delete-btn"
                                            onClick={() => setConfirmDeleteId(filter.id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Failover Strategy */}
                            <div className="filter-field">
                                <label className="filter-field-label">Failover Strategy</label>
                                <select
                                    className="filter-field-select"
                                    value={filter.failover_strategy?.id ?? ''}
                                    onChange={e => patchFilter(filter.id, {
                                        failover_strategy_id: e.target.value === '' ? null : e.target.value,
                                    })}
                                >
                                    <option value="">None</option>
                                    {failoverStrategies.map(st => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Preferred Model */}
                            <div className="filter-field">
                                <label className="filter-field-label">Preferred Model</label>
                                <select
                                    className="filter-field-select"
                                    value={filter.preferred_model?.id ?? ''}
                                    onChange={e => patchFilter(filter.id, {
                                        preferred_model_id: e.target.value === '' ? null : e.target.value,
                                    })}
                                >
                                    <option value="">None (use vector search)</option>
                                    {modelProviders.map(mp => (
                                        <option key={mp.id} value={mp.id}>
                                            {mp.ai_model.name} (via {mp.provider.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Local Failover Model */}
                            <div className="filter-field">
                                <label className="filter-field-label">Local Failover Model</label>
                                <select
                                    className="filter-field-select"
                                    value={filter.local_failover?.id ?? ''}
                                    onChange={e => patchFilter(filter.id, {
                                        local_failover_id: e.target.value === '' ? null : e.target.value,
                                    })}
                                >
                                    <option value="">None</option>
                                    {modelProviders.map(mp => (
                                        <option key={mp.id} value={mp.id}>
                                            {mp.ai_model.name} (via {mp.provider.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Required Capabilities */}
                            <div className="filter-field">
                                <label className="filter-field-label">Required Capabilities (hard requirement)</label>
                                <div className="filter-pill-container">
                                    {capabilities.map(cap => {
                                        const isSelected = filter.required_capabilities?.some(c => c.id === cap.id);
                                        return (
                                            <button
                                                key={cap.id}
                                                type="button"
                                                className={`filter-pill ${isSelected ? 'filter-pill-selected' : ''}`}
                                                onClick={() => patchFilter(filter.id, {
                                                    required_capabilities_ids: toggleIdInSet(
                                                        filter.required_capabilities?.map(c => c.id),
                                                        cap.id
                                                    ),
                                                })}
                                            >
                                                {cap.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Banned Providers */}
                            <div className="filter-field">
                                <label className="filter-field-label">Banned Providers (never route to)</label>
                                <div className="filter-pill-container">
                                    {providers.map(prov => {
                                        const isSelected = filter.banned_providers?.some(p => p.id === prov.id);
                                        return (
                                            <button
                                                key={prov.id}
                                                type="button"
                                                className={`filter-pill ${isSelected ? 'filter-pill-selected' : ''}`}
                                                onClick={() => patchFilter(filter.id, {
                                                    banned_providers_ids: toggleIdInSet(
                                                        filter.banned_providers?.map(p => p.id),
                                                        prov.id
                                                    ),
                                                })}
                                            >
                                                {prov.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preferred Categories */}
                            <div className="filter-field">
                                <label className="filter-field-label">Preferred Categories (soft bias)</label>
                                <div className="filter-pill-container">
                                    {categories.map(cat => {
                                        const isSelected = filter.preferred_categories?.some(c => c.id === cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                className={`filter-pill filter-pill-soft ${isSelected ? 'filter-pill-selected' : ''}`}
                                                onClick={() => patchFilter(filter.id, {
                                                    preferred_categories_ids: toggleIdInSet(
                                                        filter.preferred_categories?.map(c => c.id),
                                                        cat.id
                                                    ),
                                                })}
                                            >
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preferred Tags */}
                            <div className="filter-field">
                                <label className="filter-field-label">Preferred Tags (soft bias)</label>
                                <div className="filter-pill-container">
                                    {tags.map(tag => {
                                        const isSelected = filter.preferred_tags?.some(t => t.id === tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                className={`filter-pill filter-pill-soft ${isSelected ? 'filter-pill-selected' : ''}`}
                                                onClick={() => patchFilter(filter.id, {
                                                    preferred_tags_ids: toggleIdInSet(
                                                        filter.preferred_tags?.map(t => t.id),
                                                        tag.id
                                                    ),
                                                })}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preferred Roles */}
                            <div className="filter-field">
                                <label className="filter-field-label">Preferred Roles (soft bias)</label>
                                <div className="filter-pill-container">
                                    {roles.map(role => {
                                        const isSelected = filter.preferred_roles?.some(r => r.id === role.id);
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                className={`filter-pill filter-pill-soft ${isSelected ? 'filter-pill-selected' : ''}`}
                                                onClick={() => patchFilter(filter.id, {
                                                    preferred_roles_ids: toggleIdInSet(
                                                        filter.preferred_roles?.map(r => r.id),
                                                        role.id
                                                    ),
                                                })}
                                            >
                                                {role.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

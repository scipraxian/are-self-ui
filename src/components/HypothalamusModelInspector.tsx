import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';

import { apiFetch } from '../api';

/* ── Types ────────────────────────────────────────── */

type NameOrString = string | { name: string; id?: string };

interface AIModel {
    id: string;
    name: string;
    enabled: boolean;
    current_description: string | null;
    creator: { id: string; name: string } | null;
    family: { id: string; name: string } | null;
    parameter_size: string;
    context_length: number;
    mode: string;
    capabilities: NameOrString[];
    roles: NameOrString[];
    quantizations: NameOrString[];
    input_cost_per_token: string;
    output_cost_per_token: string;
}

interface ModelProvider {
    id: string;
    provider_unique_model_id: string;
    provider: { id: string; name: string; key: string };
    is_enabled: boolean;
    rate_limit_counter: number;
    rate_limit_reset_time: string | null;
    total_failures: number;
    last_failure_time: string | null;
}

interface DescriptionRecord {
    id: string;
    description: string;
    ai_models: { id: string; name: string }[];
    families: { id: string; name: string }[];
    tags: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    is_family_level?: boolean;
}

interface ModelFamily {
    id: string;
    name: string;
}

export interface ModelInspectorProps {
    model: AIModel;
    provider: ModelProvider | null;
    models: AIModel[];
    families: ModelFamily[];
    pulling: boolean;
    onClose: () => void;
    onToggleEnabled: (modelId: string) => void;
    onPull: (modelId: string) => void;
    onRemove: (modelId: string) => void;
    onResetBreaker: (providerId: string) => void;
    onToggleProviderEnabled: (providerId: string) => void;
}

/* ── Helpers ──────────────────────────────────────── */

function label(v: NameOrString): string {
    if (typeof v === 'string') return v;
    return v.name ?? String(v);
}

function labelKey(v: NameOrString): string {
    if (typeof v === 'string') return v;
    return v.id != null ? String(v.id) : v.name;
}

function isFree(model: AIModel): boolean {
    return parseFloat(model.input_cost_per_token) === 0 &&
           parseFloat(model.output_cost_per_token) === 0;
}

function isBreakerTripped(prov: ModelProvider): boolean {
    if (prov.rate_limit_counter <= 0) return false;
    if (!prov.rate_limit_reset_time) return false;
    return new Date(prov.rate_limit_reset_time) > new Date();
}

function formatCtx(ctx: number): string {
    if (!ctx) return '—';
    if (ctx >= 1000) return `${Math.round(ctx / 1000)}K`;
    return String(ctx);
}

function formatCost(cost: string | null | undefined): string {
    if (!cost) return 'Free';
    const n = parseFloat(cost);
    if (n === 0) return 'Free';
    if (n < 0.000001) return `$${n.toExponential(1)}/tok`;
    return `$${n.toFixed(6)}/tok`;
}

function getModelStatus(model: AIModel, prov: ModelProvider | null): string {
    if (!model.enabled) return 'disabled';
    if (prov && isBreakerTripped(prov)) return 'breaker';
    if (prov && prov.is_enabled) return 'installed';
    return 'available';
}

/* ── Component ────────────────────────────────────── */

export function HypothalamusModelInspector({
    model, provider, models, families, pulling,
    onClose, onToggleEnabled, onPull, onRemove, onResetBreaker, onToggleProviderEnabled,
}: ModelInspectorProps) {
    const status = getModelStatus(model, provider);

    // Description editing state
    const [descRecord, setDescRecord] = useState<DescriptionRecord | null>(null);
    const [descLoading, setDescLoading] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [editDescText, setEditDescText] = useState('');
    const [descSaving, setDescSaving] = useState(false);

    // Relationships panel
    const [showRelationships, setShowRelationships] = useState(false);
    const [relSaving, setRelSaving] = useState(false);

    // Add-model dropdown state
    const [showAddModel, setShowAddModel] = useState(false);
    const [addModelSearch, setAddModelSearch] = useState('');

    // Add-family dropdown state
    const [showAddFamily, setShowAddFamily] = useState(false);

    // Add-tag state
    const [showAddTag, setShowAddTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');

    // Add-category state
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // All tags + categories for dropdowns
    const [allTags, setAllTags] = useState<{ id: string; name: string }[]>([]);
    const [allCategories, setAllCategories] = useState<{ id: string; name: string }[]>([]);

    // Fetch description record for this model
    useEffect(() => {
        let cancelled = false;
        setDescRecord(null);
        setIsEditingDesc(false);

        const load = async () => {
            setDescLoading(true);
            try {
                const res = await apiFetch(`/api/v2/model-descriptions/?ai_models=${model.id}`);
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json();
                    const results = data.results ?? data;
                    if (results.length > 0) {
                        setDescRecord(results[0]);
                    } else {
                        // Try fetching by family
                        if (model.family) {
                            const famRes = await apiFetch(`/api/v2/model-descriptions/?families=${model.family.id}`);
                            if (cancelled) return;
                            if (famRes.ok) {
                                const famData = await famRes.json();
                                const famResults = famData.results ?? famData;
                                if (famResults.length > 0) {
                                    setDescRecord({ ...famResults[0], is_family_level: true });
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch model description', err);
            } finally {
                if (!cancelled) setDescLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [model.id, model.family]);

    // Fetch reference data when relationships panel opens
    useEffect(() => {
        if (!showRelationships) return;
        let cancelled = false;

        const load = async () => {
            try {
                const [tagRes, catRes] = await Promise.all([
                    apiFetch('/api/v2/model-tags/'),
                    apiFetch('/api/v2/model-categories/'),
                ]);
                if (cancelled) return;
                if (tagRes.ok) {
                    const d = await tagRes.json();
                    setAllTags(d.results ?? d);
                }
                if (catRes.ok) {
                    const d = await catRes.json();
                    setAllCategories(d.results ?? d);
                }
            } catch (err) {
                console.error('Failed to fetch reference data', err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [showRelationships]);

    // Description save handler
    const handleSaveDescription = async () => {
        setDescSaving(true);
        try {
            if (descRecord && !descRecord.is_family_level) {
                // PATCH existing model-specific description
                const res = await apiFetch(`/api/v2/model-descriptions/${descRecord.id}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description: editDescText }),
                });
                if (res.ok) {
                    const updated = await res.json();
                    setDescRecord(updated);
                    setIsEditingDesc(false);
                }
            } else {
                // POST new model-specific description
                const res = await apiFetch('/api/v2/model-descriptions/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        description: editDescText,
                        ai_model_ids: [model.id],
                    }),
                });
                if (res.ok) {
                    const created = await res.json();
                    setDescRecord(created);
                    setIsEditingDesc(false);
                }
            }
        } catch (err) {
            console.error('Failed to save description', err);
        } finally {
            setDescSaving(false);
        }
    };

    // Relationship PATCH helper
    const patchRelationships = async (payload: Record<string, unknown>) => {
        if (!descRecord) return;
        setRelSaving(true);
        try {
            const res = await apiFetch(`/api/v2/model-descriptions/${descRecord.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const updated = await res.json();
                setDescRecord(updated);
            }
        } catch (err) {
            console.error('Failed to update relationships', err);
        } finally {
            setRelSaving(false);
        }
    };

    const removeLinkedModel = (modelId: string) => {
        if (!descRecord) return;
        const ids = descRecord.ai_models.filter(m => m.id !== modelId).map(m => m.id);
        patchRelationships({ ai_model_ids: ids });
    };

    const addLinkedModel = (modelId: string) => {
        if (!descRecord) return;
        const ids = [...descRecord.ai_models.map(m => m.id), modelId];
        patchRelationships({ ai_model_ids: ids });
        setShowAddModel(false);
        setAddModelSearch('');
    };

    const removeLinkedFamily = (famId: string) => {
        if (!descRecord) return;
        const ids = descRecord.families.filter(f => f.id !== famId).map(f => f.id);
        patchRelationships({ family_ids: ids });
    };

    const addLinkedFamily = (famId: string) => {
        if (!descRecord) return;
        const ids = [...descRecord.families.map(f => f.id), famId];
        patchRelationships({ family_ids: ids });
        setShowAddFamily(false);
    };

    const removeTag = (tagId: string) => {
        if (!descRecord) return;
        const ids = descRecord.tags.filter(t => t.id !== tagId).map(t => t.id);
        patchRelationships({ tag_ids: ids });
    };

    const addTag = (tagId: string) => {
        if (!descRecord) return;
        const ids = [...descRecord.tags.map(t => t.id), tagId];
        patchRelationships({ tag_ids: ids });
        setShowAddTag(false);
        setNewTagName('');
    };

    const removeCategory = (catId: string) => {
        if (!descRecord) return;
        const ids = descRecord.categories.filter(c => c.id !== catId).map(c => c.id);
        patchRelationships({ category_ids: ids });
    };

    const addCategory = (catId: string) => {
        if (!descRecord) return;
        const ids = [...descRecord.categories.map(c => c.id), catId];
        patchRelationships({ category_ids: ids });
        setShowAddCategory(false);
        setNewCategoryName('');
    };

    // Filtered add-model options
    const addModelOptions = models.filter(m => {
        if (!descRecord) return false;
        if (descRecord.ai_models.some(dm => dm.id === m.id)) return false;
        if (!addModelSearch.trim()) return true;
        return m.name.toLowerCase().includes(addModelSearch.toLowerCase());
    }).slice(0, 10);

    // Filtered add-family options
    const addFamilyOptions = families.filter(f => {
        if (!descRecord) return false;
        return !descRecord.families.some(df => df.id === f.id);
    });

    // Filtered add-tag options
    const addTagOptions = allTags.filter(t => {
        if (!descRecord) return false;
        if (descRecord.tags.some(dt => dt.id === t.id)) return false;
        if (!newTagName.trim()) return true;
        return t.name.toLowerCase().includes(newTagName.toLowerCase());
    });

    // Filtered add-category options
    const addCategoryOptions = allCategories.filter(c => {
        if (!descRecord) return false;
        if (descRecord.categories.some(dc => dc.id === c.id)) return false;
        if (!newCategoryName.trim()) return true;
        return c.name.toLowerCase().includes(newCategoryName.toLowerCase());
    });

    return (
        <div className="hypothalamus-inspector">
            <button type="button" className="hypothalamus-inspector-close" onClick={onClose}>
                ✕
            </button>

            <div className="hypothalamus-inspector-header">
                <span className="hypothalamus-inspector-name">{model.name}</span>
                <span className="hypothalamus-inspector-subtitle">
                    {[model.creator?.name, model.family?.name].filter(Boolean).join(' · ')}
                </span>
            </div>

            {/* Enabled toggle */}
            <div className="hypothalamus-inspector-toggle-row">
                <span className="hypothalamus-inspector-label">Enabled</span>
                <button
                    type="button"
                    className={`hypothalamus-toggle ${model.enabled ? 'hypothalamus-toggle-active' : ''}`}
                    onClick={() => onToggleEnabled(model.id)}
                >
                    <span className="hypothalamus-toggle-knob" />
                </button>
            </div>

            {/* Description section — editable */}
            <div className="hypothalamus-inspector-section">
                <div className="hypothalamus-inspector-section-header">
                    <span className="hypothalamus-inspector-section-title">Description</span>
                    {!isEditingDesc && (
                        <button
                            type="button"
                            className="hypothalamus-inline-btn"
                            onClick={() => {
                                setEditDescText(model.current_description || descRecord?.description || '');
                                setIsEditingDesc(true);
                            }}
                        >
                            Edit
                        </button>
                    )}
                </div>

                {isEditingDesc ? (
                    <div className="hypothalamus-desc-edit">
                        <textarea
                            className="hypothalamus-desc-textarea"
                            value={editDescText}
                            onChange={e => setEditDescText(e.target.value)}
                            rows={4}
                        />
                        <div className="hypothalamus-desc-edit-actions">
                            <button
                                type="button"
                                className="hypothalamus-inline-btn hypothalamus-inline-btn-save"
                                onClick={handleSaveDescription}
                                disabled={descSaving}
                            >
                                {descSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                className="hypothalamus-inline-btn"
                                onClick={() => setIsEditingDesc(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <span className="hypothalamus-inspector-subtitle">
                            {model.current_description || 'No description'}
                        </span>
                        {descRecord && (
                            <span className="hypothalamus-desc-source">
                                {descRecord.is_family_level
                                    ? `(from family: ${descRecord.families?.[0]?.name || 'inherited'})`
                                    : '(model-specific)'}
                            </span>
                        )}
                        {descLoading && <span className="hypothalamus-desc-source">Loading...</span>}
                    </>
                )}
            </div>

            {/* Description Relationships — collapsible */}
            {descRecord && (
                <div className="hypothalamus-inspector-section">
                    <button
                        type="button"
                        className="hypothalamus-collapse-toggle"
                        onClick={() => setShowRelationships(!showRelationships)}
                    >
                        {showRelationships ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span>Description Relationships</span>
                        {relSaving && <span className="hypothalamus-spinner" />}
                    </button>

                    {showRelationships && (
                        <div className="hypothalamus-relationships">
                            {/* Linked Models */}
                            <div className="hypothalamus-rel-group">
                                <span className="hypothalamus-rel-label">Linked Models</span>
                                <div className="hypothalamus-rel-pills">
                                    {descRecord.ai_models.map(m => (
                                        <span key={m.id} className="hypothalamus-rel-pill">
                                            {m.name}
                                            <button
                                                type="button"
                                                className="hypothalamus-rel-pill-remove"
                                                onClick={() => removeLinkedModel(m.id)}
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    <div className="hypothalamus-rel-add-wrap">
                                        <button
                                            type="button"
                                            className="hypothalamus-rel-add-btn"
                                            onClick={() => setShowAddModel(!showAddModel)}
                                        >
                                            <Plus size={12} />
                                        </button>
                                        {showAddModel && (
                                            <div className="hypothalamus-rel-dropdown">
                                                <input
                                                    className="hypothalamus-rel-dropdown-search"
                                                    type="text"
                                                    placeholder="Search models..."
                                                    value={addModelSearch}
                                                    onChange={e => setAddModelSearch(e.target.value)}
                                                    autoFocus
                                                />
                                                {addModelOptions.map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        className="hypothalamus-rel-dropdown-item"
                                                        onClick={() => addLinkedModel(m.id)}
                                                    >
                                                        {m.name}
                                                    </button>
                                                ))}
                                                {addModelOptions.length === 0 && (
                                                    <span className="hypothalamus-rel-dropdown-empty">No models</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Linked Families */}
                            <div className="hypothalamus-rel-group">
                                <span className="hypothalamus-rel-label">Linked Families</span>
                                <div className="hypothalamus-rel-pills">
                                    {descRecord.families.map(f => (
                                        <span key={f.id} className="hypothalamus-rel-pill">
                                            {f.name}
                                            <button
                                                type="button"
                                                className="hypothalamus-rel-pill-remove"
                                                onClick={() => removeLinkedFamily(f.id)}
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    <div className="hypothalamus-rel-add-wrap">
                                        <button
                                            type="button"
                                            className="hypothalamus-rel-add-btn"
                                            onClick={() => setShowAddFamily(!showAddFamily)}
                                        >
                                            <Plus size={12} />
                                        </button>
                                        {showAddFamily && (
                                            <div className="hypothalamus-rel-dropdown">
                                                {addFamilyOptions.map(f => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        className="hypothalamus-rel-dropdown-item"
                                                        onClick={() => addLinkedFamily(f.id)}
                                                    >
                                                        {f.name}
                                                    </button>
                                                ))}
                                                {addFamilyOptions.length === 0 && (
                                                    <span className="hypothalamus-rel-dropdown-empty">No families</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="hypothalamus-rel-group">
                                <span className="hypothalamus-rel-label">Tags</span>
                                <div className="hypothalamus-rel-pills">
                                    {descRecord.tags.map(t => (
                                        <span key={t.id} className="hypothalamus-rel-pill">
                                            {t.name}
                                            <button
                                                type="button"
                                                className="hypothalamus-rel-pill-remove"
                                                onClick={() => removeTag(t.id)}
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    <div className="hypothalamus-rel-add-wrap">
                                        <button
                                            type="button"
                                            className="hypothalamus-rel-add-btn"
                                            onClick={() => setShowAddTag(!showAddTag)}
                                        >
                                            <Plus size={12} />
                                        </button>
                                        {showAddTag && (
                                            <div className="hypothalamus-rel-dropdown">
                                                <input
                                                    className="hypothalamus-rel-dropdown-search"
                                                    type="text"
                                                    placeholder="Search or add tag..."
                                                    value={newTagName}
                                                    onChange={e => setNewTagName(e.target.value)}
                                                    autoFocus
                                                />
                                                {addTagOptions.map(t => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        className="hypothalamus-rel-dropdown-item"
                                                        onClick={() => addTag(t.id)}
                                                    >
                                                        {t.name}
                                                    </button>
                                                ))}
                                                {addTagOptions.length === 0 && (
                                                    <span className="hypothalamus-rel-dropdown-empty">No tags</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="hypothalamus-rel-group">
                                <span className="hypothalamus-rel-label">Categories</span>
                                <div className="hypothalamus-rel-pills">
                                    {descRecord.categories.map(c => (
                                        <span key={c.id} className="hypothalamus-rel-pill">
                                            {c.name}
                                            <button
                                                type="button"
                                                className="hypothalamus-rel-pill-remove"
                                                onClick={() => removeCategory(c.id)}
                                            >
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                    <div className="hypothalamus-rel-add-wrap">
                                        <button
                                            type="button"
                                            className="hypothalamus-rel-add-btn"
                                            onClick={() => setShowAddCategory(!showAddCategory)}
                                        >
                                            <Plus size={12} />
                                        </button>
                                        {showAddCategory && (
                                            <div className="hypothalamus-rel-dropdown">
                                                <input
                                                    className="hypothalamus-rel-dropdown-search"
                                                    type="text"
                                                    placeholder="Search categories..."
                                                    value={newCategoryName}
                                                    onChange={e => setNewCategoryName(e.target.value)}
                                                    autoFocus
                                                />
                                                {addCategoryOptions.map(c => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        className="hypothalamus-rel-dropdown-item"
                                                        onClick={() => addCategory(c.id)}
                                                    >
                                                        {c.name}
                                                    </button>
                                                ))}
                                                {addCategoryOptions.length === 0 && (
                                                    <span className="hypothalamus-rel-dropdown-empty">No categories</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Stats</span>
                <div className="hypothalamus-stats-grid">
                    <div className="hypothalamus-stat-item">
                        <span className="hypothalamus-stat-value">{model.parameter_size || '—'}</span>
                        <span className="hypothalamus-stat-label">Parameters</span>
                    </div>
                    <div className="hypothalamus-stat-item">
                        <span className="hypothalamus-stat-value">{formatCtx(model.context_length)}</span>
                        <span className="hypothalamus-stat-label">Context</span>
                    </div>
                    <div className="hypothalamus-stat-item">
                        <span className="hypothalamus-stat-value">{model.mode || '—'}</span>
                        <span className="hypothalamus-stat-label">Mode</span>
                    </div>
                </div>
            </div>

            {/* Capabilities & Roles */}
            {(model.capabilities?.length > 0 || model.roles?.length > 0 || model.quantizations?.length > 0) && (
                <div className="hypothalamus-inspector-section">
                    <span className="hypothalamus-inspector-section-title">Capabilities & Roles</span>
                    <div className="hypothalamus-inspector-pills">
                        {model.capabilities?.map(c => (
                            <span key={labelKey(c)} className="hypothalamus-pill">{label(c).replace('_', ' ')}</span>
                        ))}
                        {model.roles?.map(r => (
                            <span key={labelKey(r)} className="hypothalamus-pill hypothalamus-pill-role">{label(r)}</span>
                        ))}
                        {model.quantizations?.map(q => (
                            <span key={labelKey(q)} className="hypothalamus-pill">{label(q)}</span>
                        ))}
                    </div>
                </div>
            )}

            {/* Provider section */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Provider</span>
                <div className="hypothalamus-provider-status">
                    {provider ? (
                        <>
                            <div className="hypothalamus-provider-row">
                                <span>Status</span>
                                <span className="hypothalamus-provider-value">
                                    <span
                                        className={`hypothalamus-status-dot hypothalamus-dot-${status}`}
                                        style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }}
                                    />
                                    {status === 'installed' && 'Active'}
                                    {status === 'breaker' && 'Circuit breaker tripped'}
                                    {status === 'disabled' && 'Disabled'}
                                    {status === 'available' && 'Removed'}
                                </span>
                            </div>
                            <div className="hypothalamus-provider-row">
                                <span>Model ID</span>
                                <span className="hypothalamus-provider-value">{provider.provider_unique_model_id}</span>
                            </div>
                            <div className="hypothalamus-provider-row">
                                <span>Provider</span>
                                <span className="hypothalamus-provider-value">{provider.provider.name}</span>
                            </div>

                            {/* Provider enable/disable toggle */}
                            <div className="hypothalamus-inspector-toggle-row">
                                <span className="hypothalamus-inspector-label">Provider Enabled</span>
                                <button
                                    type="button"
                                    className={`hypothalamus-toggle ${provider.is_enabled ? 'hypothalamus-toggle-active' : ''}`}
                                    onClick={() => onToggleProviderEnabled(provider.id)}
                                >
                                    <span className="hypothalamus-toggle-knob" />
                                </button>
                            </div>

                            {(provider.rate_limit_counter > 0 || provider.total_failures > 0) && (
                                <div className="hypothalamus-breaker-panel">
                                    <span className="hypothalamus-breaker-title">Circuit Breaker</span>
                                    <div className="hypothalamus-breaker-row">
                                        <span>Failures</span>
                                        <span className="hypothalamus-breaker-value">{provider.total_failures}</span>
                                    </div>
                                    <div className="hypothalamus-breaker-row">
                                        <span>Rate limit counter</span>
                                        <span className="hypothalamus-breaker-value">{provider.rate_limit_counter}</span>
                                    </div>
                                    {provider.last_failure_time && (
                                        <div className="hypothalamus-breaker-row">
                                            <span>Last failure</span>
                                            <span className="hypothalamus-breaker-value">
                                                {new Date(provider.last_failure_time).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    {provider.rate_limit_reset_time && isBreakerTripped(provider) && (
                                        <div className="hypothalamus-breaker-row">
                                            <span>Resets at</span>
                                            <span className="hypothalamus-breaker-value">
                                                {new Date(provider.rate_limit_reset_time).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        className="hypothalamus-action-btn hypothalamus-action-btn-reset"
                                        onClick={() => onResetBreaker(provider.id)}
                                    >
                                        Reset Circuit Breaker
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="hypothalamus-provider-row">
                            <span>Not installed</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Pricing */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Pricing</span>
                {isFree(model) ? (
                    <span className="hypothalamus-free-badge">FREE</span>
                ) : (
                    <>
                        <div className="hypothalamus-pricing-row">
                            <span>Input</span>
                            <span className="hypothalamus-pricing-value">{formatCost(model.input_cost_per_token)}</span>
                        </div>
                        <div className="hypothalamus-pricing-row">
                            <span>Output</span>
                            <span className="hypothalamus-pricing-value">{formatCost(model.output_cost_per_token)}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Pull / Remove action */}
            <div className="hypothalamus-inspector-section">
                {status === 'available' || !provider ? (
                    <button
                        type="button"
                        className="hypothalamus-inspector-action hypothalamus-inspector-action-pull"
                        onClick={() => onPull(model.id)}
                        disabled={pulling}
                    >
                        {pulling ? 'Pulling...' : 'Pull Model'}
                    </button>
                ) : (
                    <button
                        type="button"
                        className="hypothalamus-inspector-action hypothalamus-inspector-action-remove"
                        onClick={() => onRemove(model.id)}
                    >
                        Remove Model
                    </button>
                )}
            </div>
        </div>
    );
}

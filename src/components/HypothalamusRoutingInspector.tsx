import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';

import { apiFetch } from '../api';

/* ── Types ────────────────────────────────────────── */

type NameOrString = string | { name: string; id?: string };

interface NestedProvider {
    id: string;
    ai_model: { id: string; name: string; [key: string]: unknown } | null;
    provider: { id: string; name: string; key: string };
    [key: string]: unknown;
}

interface FailoverStep {
    id: string;
    order: number;
    failover_type: { id: string; name: string; description?: string };
}

interface FailoverStrategy {
    id: string;
    name: string;
    steps: FailoverStep[];
}

interface SelectionFilter {
    id: string;
    name: string;
    failover_strategy: FailoverStrategy | null;
    preferred_model: NestedProvider | null;
    local_failover: NestedProvider | null;
    required_capabilities: NameOrString[];
    banned_providers: string[];
    banned_provider_names: string[];
    preferred_categories: NameOrString[];
    preferred_tags: NameOrString[];
    preferred_roles: NameOrString[];
}

interface ProviderOption {
    id: string;
    ai_model: { id: string; name: string } | null;
    provider: { id: string; name: string; key: string };
    provider_unique_model_id: string;
    is_enabled: boolean;
}

interface RefOption {
    id: string;
    name: string;
}

export interface RoutingInspectorProps {
    filter: SelectionFilter;
    onClose: () => void;
    onFilterUpdate: (updated: SelectionFilter) => void;
}

/* ── Helpers ──────────────────────────────────────── */


function labelId(v: NameOrString): string {
    if (typeof v === 'string') return v;
    return v.id ?? v.name;
}

/* ── Component ────────────────────────────────────── */

export function HypothalamusRoutingInspector({ filter, onClose, onFilterUpdate }: RoutingInspectorProps) {
    // Reference data
    const [strategies, setStrategies] = useState<FailoverStrategy[]>([]);
    const [providerOptions, setProviderOptions] = useState<ProviderOption[]>([]);
    const [allCapabilities, setAllCapabilities] = useState<RefOption[]>([]);
    const [allProviders, setAllProviders] = useState<RefOption[]>([]);
    const [allCategories, setAllCategories] = useState<RefOption[]>([]);
    const [allTags, setAllTags] = useState<RefOption[]>([]);
    const [allRoles, setAllRoles] = useState<RefOption[]>([]);

    // Edit state (accumulate changes, save on click)
    const [editStrategy, setEditStrategy] = useState<string>(
        filter.failover_strategy ? String(filter.failover_strategy.id) : ''
    );
    const [editPreferredModel, setEditPreferredModel] = useState<string>(
        filter.preferred_model ? String(filter.preferred_model.id) : ''
    );
    const [editLocalFailover, setEditLocalFailover] = useState<string>(
        filter.local_failover ? String(filter.local_failover.id) : ''
    );
    const [editCapabilities, setEditCapabilities] = useState<Set<string>>(
        new Set(filter.required_capabilities?.map(c => labelId(c)) ?? [])
    );
    const [editBannedProviders, setEditBannedProviders] = useState<Set<string>>(
        new Set(filter.banned_providers ?? [])
    );
    const [editCategories, setEditCategories] = useState<Set<string>>(
        new Set(filter.preferred_categories?.map(c => labelId(c)) ?? [])
    );
    const [editTags, setEditTags] = useState<Set<string>>(
        new Set(filter.preferred_tags?.map(t => labelId(t)) ?? [])
    );
    const [editRoles, setEditRoles] = useState<Set<string>>(
        new Set(filter.preferred_roles?.map(r => labelId(r)) ?? [])
    );

    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);

    // Reset edit state when filter changes
    useEffect(() => {
        setEditStrategy(filter.failover_strategy ? String(filter.failover_strategy.id) : '');
        setEditPreferredModel(filter.preferred_model ? String(filter.preferred_model.id) : '');
        setEditLocalFailover(filter.local_failover ? String(filter.local_failover.id) : '');
        setEditCapabilities(new Set(filter.required_capabilities?.map(c => labelId(c)) ?? []));
        setEditBannedProviders(new Set(filter.banned_providers ?? []));
        setEditCategories(new Set(filter.preferred_categories?.map(c => labelId(c)) ?? []));
        setEditTags(new Set(filter.preferred_tags?.map(t => labelId(t)) ?? []));
        setEditRoles(new Set(filter.preferred_roles?.map(r => labelId(r)) ?? []));
        setDirty(false);
    }, [filter]);

    // Fetch reference data
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [stratRes, provRes, capRes, providerListRes, catRes, tagRes, roleRes] = await Promise.all([
                    apiFetch('/api/v2/failover-strategies/'),
                    apiFetch('/api/v2/model-providers/'),
                    apiFetch('/api/v2/model-capabilities/'),
                    apiFetch('/api/v2/llm-providers/'),
                    apiFetch('/api/v2/model-categories/'),
                    apiFetch('/api/v2/model-tags/'),
                    apiFetch('/api/v2/model-roles/'),
                ]);
                if (cancelled) return;

                if (stratRes.ok) {
                    const d = await stratRes.json();
                    setStrategies(d.results ?? d);
                }
                if (provRes.ok) {
                    const d = await provRes.json();
                    setProviderOptions((d.results ?? d).filter((p: ProviderOption) => p.is_enabled));
                }
                if (capRes.ok) {
                    const d = await capRes.json();
                    setAllCapabilities(d.results ?? d);
                }
                if (providerListRes.ok) {
                    const d = await providerListRes.json();
                    setAllProviders(d.results ?? d);
                }
                if (catRes.ok) {
                    const d = await catRes.json();
                    setAllCategories(d.results ?? d);
                }
                if (tagRes.ok) {
                    const d = await tagRes.json();
                    setAllTags(d.results ?? d);
                }
                if (roleRes.ok) {
                    const d = await roleRes.json();
                    setAllRoles(d.results ?? d);
                }
            } catch (err) {
                console.error('Failed to fetch routing reference data', err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    // Toggle helper
    const toggleSet = (
        setter: React.Dispatch<React.SetStateAction<Set<string>>>,
        id: string,
    ) => {
        setter(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
        setDirty(true);
    };

    // Selected strategy object for step chain display
    const selectedStrategy = strategies.find(s => String(s.id) === editStrategy) ?? filter.failover_strategy;

    // Save handler
    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {};

            if (editStrategy) {
                payload.failover_strategy_id = editStrategy;
            }
            payload.preferred_model_id = editPreferredModel || null;
            payload.local_failover_id = editLocalFailover || null;
            payload.required_capabilities_ids = [...editCapabilities];
            payload.banned_providers_ids = [...editBannedProviders];
            payload.preferred_categories_ids = [...editCategories];
            payload.preferred_tags_ids = [...editTags];
            payload.preferred_roles_ids = [...editRoles];

            const res = await apiFetch(`/api/v2/selection-filters/${filter.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                const updated = await res.json();
                onFilterUpdate(updated);
                setDirty(false);
            } else {
                console.error('Save routing failed', res.status);
            }
        } catch (err) {
            console.error('Save routing failed', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="hypothalamus-inspector">
            <button type="button" className="hypothalamus-inspector-close" onClick={onClose}>
                ✕
            </button>

            <div className="hypothalamus-inspector-header">
                <span className="hypothalamus-inspector-name">{filter.name}</span>
            </div>

            {/* Failover Strategy */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Failover Strategy</span>
                <select
                    className="hypothalamus-edit-select"
                    value={editStrategy}
                    onChange={e => { setEditStrategy(e.target.value); setDirty(true); }}
                >
                    <option value="">No strategy</option>
                    {strategies.map(s => (
                        <option key={s.id} value={String(s.id)}>{s.name}</option>
                    ))}
                </select>

                {selectedStrategy?.steps && selectedStrategy.steps.length > 0 && (
                    <div className="hypothalamus-step-chain">
                        {[...selectedStrategy.steps]
                            .sort((a, b) => a.order - b.order)
                            .map((step, i) => (
                                <div key={step.id}>
                                    <div className="hypothalamus-step">
                                        <span className="hypothalamus-step-number">{i + 1}</span>
                                        <span>{step.failover_type.name}</span>
                                    </div>
                                    {i < selectedStrategy.steps.length - 1 && (
                                        <span className="hypothalamus-step-arrow">↓</span>
                                    )}
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* Preferred Model */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Preferred Model</span>
                <select
                    className="hypothalamus-edit-select"
                    value={editPreferredModel}
                    onChange={e => { setEditPreferredModel(e.target.value); setDirty(true); }}
                >
                    <option value="">None (uses vector search)</option>
                    {providerOptions.map(p => (
                        <option key={p.id} value={String(p.id)}>
                            {p.ai_model?.name ?? p.provider_unique_model_id}
                        </option>
                    ))}
                </select>
            </div>

            {/* Local Failover */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Local Failover</span>
                <select
                    className="hypothalamus-edit-select"
                    value={editLocalFailover}
                    onChange={e => { setEditLocalFailover(e.target.value); setDirty(true); }}
                >
                    <option value="">None</option>
                    {providerOptions.map(p => (
                        <option key={p.id} value={String(p.id)}>
                            {p.ai_model?.name ?? p.provider_unique_model_id}
                        </option>
                    ))}
                </select>
            </div>

            {/* Required Capabilities — toggleable pills */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Required Capabilities</span>
                <div className="hypothalamus-toggle-pills">
                    {allCapabilities.map(cap => {
                        const active = editCapabilities.has(cap.id);
                        return (
                            <button
                                key={cap.id}
                                type="button"
                                className={`hypothalamus-toggle-pill ${active ? 'hypothalamus-toggle-pill-active' : ''}`}
                                onClick={() => toggleSet(setEditCapabilities, cap.id)}
                            >
                                {cap.name.replace(/_/g, ' ')}
                            </button>
                        );
                    })}
                    {allCapabilities.length === 0 && (
                        <span className="hypothalamus-inspector-subtitle">No capabilities loaded</span>
                    )}
                </div>
            </div>

            {/* Banned Providers — toggleable pills */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Banned Providers</span>
                <div className="hypothalamus-toggle-pills">
                    {allProviders.map(prov => {
                        const active = editBannedProviders.has(prov.id);
                        return (
                            <button
                                key={prov.id}
                                type="button"
                                className={`hypothalamus-toggle-pill hypothalamus-toggle-pill-ban ${active ? 'hypothalamus-toggle-pill-ban-active' : ''}`}
                                onClick={() => toggleSet(setEditBannedProviders, prov.id)}
                            >
                                {prov.name}
                            </button>
                        );
                    })}
                    {allProviders.length === 0 && (
                        <span className="hypothalamus-inspector-subtitle">No providers loaded</span>
                    )}
                </div>
            </div>

            {/* Preferred Categories — toggleable pills */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Preferred Categories</span>
                <div className="hypothalamus-toggle-pills">
                    {allCategories.map(cat => {
                        const active = editCategories.has(cat.id);
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                className={`hypothalamus-toggle-pill ${active ? 'hypothalamus-toggle-pill-active' : ''}`}
                                onClick={() => toggleSet(setEditCategories, cat.id)}
                            >
                                {cat.name}
                            </button>
                        );
                    })}
                    {allCategories.length === 0 && (
                        <span className="hypothalamus-inspector-subtitle">No categories loaded</span>
                    )}
                </div>
            </div>

            {/* Preferred Tags — toggleable pills */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Preferred Tags</span>
                <div className="hypothalamus-toggle-pills">
                    {allTags.map(tag => {
                        const active = editTags.has(tag.id);
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`hypothalamus-toggle-pill ${active ? 'hypothalamus-toggle-pill-active' : ''}`}
                                onClick={() => toggleSet(setEditTags, tag.id)}
                            >
                                {tag.name}
                            </button>
                        );
                    })}
                    {allTags.length === 0 && (
                        <span className="hypothalamus-inspector-subtitle">No tags loaded</span>
                    )}
                </div>
            </div>

            {/* Preferred Roles — toggleable pills */}
            <div className="hypothalamus-inspector-section">
                <span className="hypothalamus-inspector-section-title">Preferred Roles</span>
                <div className="hypothalamus-toggle-pills">
                    {allRoles.map(role => {
                        const active = editRoles.has(role.id);
                        return (
                            <button
                                key={role.id}
                                type="button"
                                className={`hypothalamus-toggle-pill hypothalamus-toggle-pill-role ${active ? 'hypothalamus-toggle-pill-role-active' : ''}`}
                                onClick={() => toggleSet(setEditRoles, role.id)}
                            >
                                {role.name}
                            </button>
                        );
                    })}
                    {allRoles.length === 0 && (
                        <span className="hypothalamus-inspector-subtitle">No roles loaded</span>
                    )}
                </div>
            </div>

            {/* Save button */}
            {dirty && (
                <div className="hypothalamus-inspector-section">
                    <button
                        type="button"
                        className="hypothalamus-inspector-action hypothalamus-inspector-action-save"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <span className="hypothalamus-spinner" />
                        ) : (
                            <Save size={14} />
                        )}
                        <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

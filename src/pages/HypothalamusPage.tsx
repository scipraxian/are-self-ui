import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { List, LayoutGrid, RefreshCw, Download, Zap } from 'lucide-react';

import { ThreePanel } from '../components/ThreePanel';
import { HypothalamusModelInspector } from '../components/HypothalamusModelInspector';
import { HypothalamusRoutingInspector } from '../components/HypothalamusRoutingInspector';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { apiFetch } from '../api';
import './HypothalamusPage.css';

/* ── Types ────────────────────────────────────────── */

type NameOrString = string | { name: string; id?: number | string };

interface AIModel {
    id: string;
    name: string;
    description: string | null;
    current_description: string | null;
    enabled: boolean;
    creator: { id: number; name: string; description?: string } | null;
    family: { id: number | string; name: string; slug?: string; parent?: number | null } | null;
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
    id: number;
    ai_model: string | { id: string; name: string; [key: string]: unknown };
    provider: { id: number; name: string; key: string };
    provider_unique_model_id: string;
    is_enabled: boolean;
    rate_limit_counter: number;
    rate_limit_reset_time: string | null;
    total_failures: number;
    last_failure_time: string | null;
}

interface ModelFamily {
    id: number | string;
    name: string;
}

interface FailoverStrategy {
    id: number | string;
    name: string;
    steps: FailoverStep[];
}

interface NestedProvider {
    id: number;
    ai_model: { id: string; name: string; [key: string]: unknown } | null;
    provider: { id: number; name: string; key: string };
    [key: string]: unknown;
}

interface SelectionFilter {
    id: number | string;
    name: string;
    failover_strategy: FailoverStrategy | null;
    preferred_model: NestedProvider | null;
    local_failover: NestedProvider | null;
    required_capabilities: NameOrString[];
    banned_providers: (number | string)[];
    banned_provider_names: string[];
    preferred_categories: NameOrString[];
    preferred_tags: NameOrString[];
    preferred_roles: NameOrString[];
}

interface FailoverStep {
    id: number | string;
    order: number;
    failover_type: { id: number | string; name: string; description?: string };
}

interface IdentityBudget {
    id: number | string;
    name: string;
    period_name: string;
    period_duration: string;
    max_input_cost_per_token: string;
    max_output_cost_per_token: string;
    max_spend_per_period: string | null;
    max_spend_per_request: string | null;
    warning_threshold: number | null;
}

type TabMode = 'catalog' | 'routing' | 'budgets';
type StatusFilter = 'all' | 'installed' | 'available';
type SortMode = 'installed' | 'name' | 'family' | 'size';
type ViewMode = 'grid' | 'list';

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

function isBreakerTripped(provider: ModelProvider): boolean {
    if (provider.rate_limit_counter <= 0) return false;
    if (!provider.rate_limit_reset_time) return false;
    return new Date(provider.rate_limit_reset_time) > new Date();
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

function getStoredViewMode(): ViewMode {
    try {
        const v = localStorage.getItem('hypothalamus-view-mode');
        if (v === 'list' || v === 'grid') return v;
    } catch { /* ignore */ }
    return 'grid';
}

/* ── Component ────────────────────────────────────── */

export function HypothalamusPage() {
    const { setCrumbs } = useBreadcrumbs();
    const [searchParams, setSearchParams] = useSearchParams();

    // URL state
    const tab = (searchParams.get('tab') ?? 'catalog') as TabMode;
    const selectedModelId = searchParams.get('model');
    const selectedFilterId = searchParams.get('filter');
    const selectedBudgetId = searchParams.get('budget');

    // Data state
    const [models, setModels] = useState<AIModel[]>([]);
    const [providers, setProviders] = useState<ModelProvider[]>([]);
    const [families, setFamilies] = useState<ModelFamily[]>([]);
    const [filters, setFilters] = useState<SelectionFilter[]>([]);
    const [budgets, setBudgets] = useState<IdentityBudget[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // UI state
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<string>>(new Set());
    const [selectedCapabilities, setSelectedCapabilities] = useState<Set<string>>(new Set());
    const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
    const [sortMode, setSortMode] = useState<SortMode>('installed');
    const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
    const [pullingModels, setPullingModels] = useState<Set<string>>(new Set());
    const [syncing, setSyncing] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([{ label: 'Hypothalamus', path: '/hypothalamus' }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    // Real-time — subscribe to the Hypothalamus brain region receptor
    const aceEvent = useDendrite('Hypothalamus', null);
    const cortEvent = useDendrite('Cortisol', 'hypothalamus');

    // Fetch catalog data
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [modelsRes, providersRes, familiesRes] = await Promise.all([
                    apiFetch('/api/v2/ai-models/'),
                    apiFetch('/api/v2/model-providers/'),
                    apiFetch('/api/v2/model-families/'),
                ]);
                if (cancelled) return;

                if (modelsRes.ok) {
                    const d = await modelsRes.json();
                    if (!cancelled) setModels(d.results ?? d);
                }
                if (providersRes.ok) {
                    const d = await providersRes.json();
                    if (!cancelled) setProviders(d.results ?? d);
                }
                if (familiesRes.ok) {
                    const d = await familiesRes.json();
                    if (!cancelled) setFamilies(d.results ?? d);
                }
            } catch (err) {
                console.error('Hypothalamus catalog fetch failed', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [aceEvent, cortEvent]);

    // Fetch routing data when tab is routing
    useEffect(() => {
        if (tab !== 'routing') return;
        let cancelled = false;
        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/selection-filters/');
                if (cancelled) return;
                if (res.ok) {
                    const d = await res.json();
                    if (!cancelled) setFilters(d.results ?? d);
                }
            } catch (err) {
                console.error('Selection filters fetch failed', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [tab, aceEvent]);

    // Fetch budgets when tab is budgets
    useEffect(() => {
        if (tab !== 'budgets') return;
        let cancelled = false;
        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/identity-budgets/');
                if (cancelled) return;
                if (res.ok) {
                    const d = await res.json();
                    if (!cancelled) setBudgets(d.results ?? d);
                }
            } catch (err) {
                console.error('Budgets fetch failed', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [tab, aceEvent]);

    // Provider lookup
    const providerByModel = useMemo(() => {
        const map = new Map<string, ModelProvider>();
        for (const p of providers) {
            const modelId = typeof p.ai_model === 'object' ? p.ai_model.id : p.ai_model;
            map.set(modelId, p);
        }
        return map;
    }, [providers]);

    // Family counts for chips
    const familyCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const m of models) {
            const fam = m.family?.name || 'Other';
            counts.set(fam, (counts.get(fam) ?? 0) + 1);
        }
        return counts;
    }, [models]);

    const sortedFamilies = useMemo(() => {
        return [...families].sort((a, b) => {
            const ca = familyCounts.get(a.name) ?? 0;
            const cb = familyCounts.get(b.name) ?? 0;
            return cb - ca;
        });
    }, [families, familyCounts]);

    // Model status helpers
    const getModelStatus = (model: AIModel): 'disabled' | 'breaker' | 'installed' | 'available' => {
        if (!model.enabled) return 'disabled';
        const prov = providerByModel.get(model.id);
        if (prov && isBreakerTripped(prov)) return 'breaker';
        if (prov && prov.is_enabled) return 'installed';
        return 'available';
    };

    // Filtered + sorted models
    const filteredModels = useMemo(() => {
        let list = models;

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.current_description?.toLowerCase().includes(q) ||
                m.creator?.name?.toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter === 'installed') {
            list = list.filter(m => {
                const prov = providerByModel.get(m.id);
                return prov && prov.is_enabled;
            });
        } else if (statusFilter === 'available') {
            list = list.filter(m => {
                const prov = providerByModel.get(m.id);
                return !prov || !prov.is_enabled;
            });
        }

        // Family filter
        if (selectedFamilyIds.size > 0) {
            list = list.filter(m => selectedFamilyIds.has(m.family?.name ?? ''));
        }

        // Capability filter
        if (selectedCapabilities.size > 0) {
            list = list.filter(m =>
                [...selectedCapabilities].every(c => m.capabilities?.some(v => label(v) === c))
            );
        }

        // Role filter
        if (selectedRoles.size > 0) {
            list = list.filter(m =>
                [...selectedRoles].some(r => m.roles?.some(v => label(v) === r))
            );
        }

        // Sort
        list = [...list].sort((a, b) => {
            switch (sortMode) {
                case 'installed': {
                    const aI = getModelStatus(a) === 'installed' || getModelStatus(a) === 'breaker' ? 0 : 1;
                    const bI = getModelStatus(b) === 'installed' || getModelStatus(b) === 'breaker' ? 0 : 1;
                    if (aI !== bI) return aI - bI;
                    return a.name.localeCompare(b.name);
                }
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'family':
                    return (a.family?.name || '').localeCompare(b.family?.name || '') || a.name.localeCompare(b.name);
                case 'size': {
                    const aS = parseFloat(a.parameter_size) || 0;
                    const bS = parseFloat(b.parameter_size) || 0;
                    return aS - bS;
                }
                default:
                    return 0;
            }
        });

        return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [models, search, statusFilter, selectedFamilyIds, selectedCapabilities, selectedRoles, sortMode, providerByModel]);

    // Selected items
    const selectedModel = useMemo(
        () => selectedModelId ? models.find(m => m.id === selectedModelId) ?? null : null,
        [models, selectedModelId]
    );
    const selectedFilter = useMemo(
        () => selectedFilterId ? filters.find(f => String(f.id) === selectedFilterId) ?? null : null,
        [filters, selectedFilterId]
    );
    const selectedBudget = useMemo(
        () => selectedBudgetId ? budgets.find(b => String(b.id) === selectedBudgetId) ?? null : null,
        [budgets, selectedBudgetId]
    );

    // URL helpers
    const setTab = (t: TabMode) => {
        const params: Record<string, string> = {};
        if (t !== 'catalog') params.tab = t;
        setSearchParams(params);
    };

    const selectModel = (id: string) => {
        const params: Record<string, string> = { model: id };
        if (tab !== 'catalog') params.tab = tab;
        setSearchParams(params);
    };

    const selectFilter = (id: string | number) => {
        setSearchParams({ tab: 'routing', filter: String(id) });
    };

    const selectBudgetItem = (id: string | number) => {
        setSearchParams({ tab: 'budgets', budget: String(id) });
    };

    const clearSelection = () => {
        const params: Record<string, string> = {};
        if (tab !== 'catalog') params.tab = tab;
        setSearchParams(params);
    };

    // View mode
    const changeViewMode = (v: ViewMode) => {
        setViewMode(v);
        try { localStorage.setItem('hypothalamus-view-mode', v); } catch { /* ignore */ }
    };

    // Toggle helpers for filter chips
    const toggleFamily = (name: string) => {
        setSelectedFamilyIds(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name); else next.add(name);
            return next;
        });
    };

    const toggleCapability = (cap: string) => {
        setSelectedCapabilities(prev => {
            const next = new Set(prev);
            if (next.has(cap)) next.delete(cap); else next.add(cap);
            return next;
        });
    };

    const toggleRole = (role: string) => {
        setSelectedRoles(prev => {
            const next = new Set(prev);
            if (next.has(role)) next.delete(role); else next.add(role);
            return next;
        });
    };

    /* ── Action Handlers ─────────────────────────── */

    const handlePull = async (modelId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setPullingModels(prev => new Set(prev).add(modelId));
        try {
            const res = await apiFetch(`/api/v2/ai-models/${modelId}/pull/`, { method: 'POST' });
            if (!res.ok) console.error('Pull failed', res.status);
        } catch (err) {
            console.error('Pull failed', err);
        } finally {
            setPullingModels(prev => { const next = new Set(prev); next.delete(modelId); return next; });
        }
    };

    const handleRemove = async (modelId: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            const res = await apiFetch(`/api/v2/ai-models/${modelId}/remove/`, { method: 'POST' });
            if (!res.ok) console.error('Remove failed', res.status);
        } catch (err) {
            console.error('Remove failed', err);
        }
    };

    const handleToggleEnabled = async (modelId: string) => {
        try {
            const res = await apiFetch(`/api/v2/ai-models/${modelId}/toggle_enabled/`, { method: 'POST' });
            if (!res.ok) console.error('Toggle failed', res.status);
        } catch (err) {
            console.error('Toggle failed', err);
        }
    };

    const handleResetBreaker = async (providerId: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        try {
            const res = await apiFetch(`/api/v2/model-providers/${providerId}/reset_circuit_breaker/`, { method: 'POST' });
            if (!res.ok) console.error('Reset breaker failed', res.status);
        } catch (err) {
            console.error('Reset breaker failed', err);
        }
    };

    const handleSyncLocal = async () => {
        setSyncing(true);
        setActionMessage(null);
        try {
            const res = await apiFetch('/api/v2/ai-models/sync_local/', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                const count = data.count ?? data.synced ?? Object.keys(data).length;
                setActionMessage(`Synced ${count} models`);
            } else {
                setActionMessage('Sync failed');
            }
        } catch (err) {
            console.error('Sync local failed', err);
            setActionMessage('Sync failed');
        } finally {
            setSyncing(false);
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handleFetchCatalog = async () => {
        setFetching(true);
        setActionMessage(null);
        try {
            const res = await apiFetch('/api/v2/ai-models/fetch_catalog/', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                const count = data.count ?? data.fetched ?? Object.keys(data).length;
                setActionMessage(`Fetched ${count} models from Ollama library`);
            } else {
                setActionMessage('Fetch catalog failed');
            }
        } catch (err) {
            console.error('Fetch catalog failed', err);
            setActionMessage('Fetch catalog failed');
        } finally {
            setFetching(false);
            setTimeout(() => setActionMessage(null), 4000);
        }
    };

    const handleToggleProviderEnabled = async (providerId: number) => {
        try {
            const res = await apiFetch(`/api/v2/model-providers/${providerId}/toggle_enabled/`, { method: 'POST' });
            if (!res.ok) console.error('Toggle provider failed', res.status);
        } catch (err) {
            console.error('Toggle provider failed', err);
        }
    };

    /* ── Capability / Role Constants ─────────────── */

    const CAPABILITIES = ['function_calling', 'vision', 'reasoning', 'embedding'];
    const ROLES = ['Chat', 'Coder', 'Reasoning', 'Embedding', 'Multimodal'];

    /* ── LEFT PANEL ──────────────────────────────── */

    const leftPanel = (
        <div className="hypothalamus-filters">
            <div className="hypothalamus-mode-tabs">
                {(['catalog', 'routing', 'budgets'] as TabMode[]).map(t => (
                    <button
                        key={t}
                        type="button"
                        className={`hypothalamus-mode-tab ${tab === t ? 'hypothalamus-mode-tab-active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                ))}
            </div>

            {tab === 'catalog' && (
                <>
                    <input
                        className="hypothalamus-search"
                        type="text"
                        placeholder="Search models..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />

                    <div className="hypothalamus-filter-section">
                        <span className="hypothalamus-filter-label">Status</span>
                        <div className="hypothalamus-status-toggle">
                            {(['all', 'installed', 'available'] as StatusFilter[]).map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    className={`hypothalamus-status-btn ${statusFilter === f ? 'hypothalamus-status-btn-selected' : ''}`}
                                    onClick={() => setStatusFilter(f)}
                                >
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {sortedFamilies.length > 0 && (
                        <div className="hypothalamus-filter-section">
                            <span className="hypothalamus-filter-label">Families</span>
                            <div className="hypothalamus-chip-group">
                                {sortedFamilies.map(fam => (
                                    <button
                                        key={fam.id}
                                        type="button"
                                        className={`hypothalamus-chip ${selectedFamilyIds.has(fam.name) ? 'hypothalamus-chip-selected' : ''}`}
                                        onClick={() => toggleFamily(fam.name)}
                                    >
                                        {fam.name}
                                        <span className="hypothalamus-chip-badge">
                                            {familyCounts.get(fam.name) ?? 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="hypothalamus-filter-section">
                        <span className="hypothalamus-filter-label">Capabilities</span>
                        <div className="hypothalamus-chip-group">
                            {CAPABILITIES.map(cap => (
                                <button
                                    key={cap}
                                    type="button"
                                    className={`hypothalamus-chip ${selectedCapabilities.has(cap) ? 'hypothalamus-chip-selected' : ''}`}
                                    onClick={() => toggleCapability(cap)}
                                >
                                    {label(cap).replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hypothalamus-filter-section">
                        <span className="hypothalamus-filter-label">Roles</span>
                        <div className="hypothalamus-chip-group">
                            {ROLES.map(role => (
                                <button
                                    key={role}
                                    type="button"
                                    className={`hypothalamus-chip ${selectedRoles.has(role) ? 'hypothalamus-chip-selected' : ''}`}
                                    onClick={() => toggleRole(role)}
                                >
                                    {role}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hypothalamus-count">
                        Showing {filteredModels.length} of {models.length} models
                    </div>
                </>
            )}

            {tab === 'routing' && (
                <div className="hypothalamus-side-list">
                    {filters.length === 0 && (
                        <span className="hypothalamus-count">No selection filters found.</span>
                    )}
                    {filters.map(f => (
                        <div
                            key={f.id}
                            className={`hypothalamus-side-item ${String(f.id) === selectedFilterId ? 'hypothalamus-side-item-selected' : ''}`}
                            onClick={() => selectFilter(f.id)}
                        >
                            <span className="hypothalamus-side-item-name">{f.name}</span>
                            <span className="hypothalamus-side-item-meta">
                                {f.failover_strategy?.name || 'No strategy'}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'budgets' && (
                <div className="hypothalamus-side-list">
                    {budgets.length === 0 && (
                        <span className="hypothalamus-count">No budgets found.</span>
                    )}
                    {budgets.map(b => (
                        <div
                            key={b.id}
                            className={`hypothalamus-side-item ${String(b.id) === selectedBudgetId ? 'hypothalamus-side-item-selected' : ''}`}
                            onClick={() => selectBudgetItem(b.id)}
                        >
                            <span className="hypothalamus-side-item-name">{b.name}</span>
                            <span className="hypothalamus-side-item-meta">
                                {b.period_name || 'Lifetime'}
                                {parseFloat(b.max_input_cost_per_token) === 0 && parseFloat(b.max_output_cost_per_token) === 0 ? ' · Free Only' : ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    /* ── CENTER PANEL ────────────────────────────── */

    const renderModelCardGrid = (model: AIModel) => {
        const status = getModelStatus(model);
        const prov = providerByModel.get(model.id);
        const pulling = pullingModels.has(model.id);

        return (
            <div
                key={model.id}
                className={[
                    'hypothalamus-card',
                    model.id === selectedModelId ? 'hypothalamus-card-selected' : '',
                    status === 'disabled' ? 'hypothalamus-card-disabled' : '',
                    status === 'breaker' ? 'hypothalamus-card-breaker' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectModel(model.id)}
            >
                <div className="hypothalamus-card-top">
                    <span className="hypothalamus-card-provider">
                        {prov ? prov.provider.name : '—'}
                    </span>
                    <span className="hypothalamus-card-cost">
                        {isFree(model) ? 'FREE' : formatCost(model.input_cost_per_token)}
                    </span>
                </div>

                <div className="hypothalamus-card-name">{model.name}</div>

                <div className="hypothalamus-card-subtitle">
                    {[model.creator?.name, model.family?.name, model.parameter_size, formatCtx(model.context_length)]
                        .filter(Boolean).join(' · ')}
                </div>

                {(model.capabilities?.length > 0 || model.roles?.length > 0) && (
                    <div className="hypothalamus-card-pills">
                        {model.capabilities?.map(c => (
                            <span key={labelKey(c)} className="hypothalamus-pill">{label(c).replace('_', ' ')}</span>
                        ))}
                        {model.roles?.map(r => (
                            <span key={labelKey(r)} className="hypothalamus-pill hypothalamus-pill-role">{label(r)}</span>
                        ))}
                    </div>
                )}

                <div className="hypothalamus-card-status">
                    <div className="hypothalamus-status-indicator">
                        {pulling ? (
                            <span className="hypothalamus-spinner" />
                        ) : (
                            <span className={`hypothalamus-status-dot hypothalamus-dot-${status}`} />
                        )}
                        <span className={`hypothalamus-status-text-${status}`}>
                            {status === 'installed' && 'Installed'}
                            {status === 'available' && 'Available'}
                            {status === 'breaker' && `Breaker (${prov?.rate_limit_counter})`}
                            {status === 'disabled' && 'Disabled'}
                        </span>
                    </div>
                    <div className="hypothalamus-card-actions">
                        {status === 'available' && !pulling && (
                            <button
                                type="button"
                                className="hypothalamus-action-btn hypothalamus-action-btn-pull"
                                onClick={e => handlePull(model.id, e)}
                            >
                                Pull
                            </button>
                        )}
                        {status === 'installed' && (
                            <button
                                type="button"
                                className="hypothalamus-action-btn hypothalamus-action-btn-remove"
                                onClick={e => handleRemove(model.id, e)}
                            >
                                Remove
                            </button>
                        )}
                        {status === 'breaker' && prov && (
                            <>
                                <button
                                    type="button"
                                    className="hypothalamus-action-btn hypothalamus-action-btn-reset"
                                    onClick={e => handleResetBreaker(prov.id, e)}
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    className="hypothalamus-action-btn hypothalamus-action-btn-remove"
                                    onClick={e => handleRemove(model.id, e)}
                                >
                                    Remove
                                </button>
                            </>
                        )}
                        {status === 'disabled' && (
                            <button
                                type="button"
                                className="hypothalamus-action-btn"
                                onClick={e => { e.stopPropagation(); handleToggleEnabled(model.id); }}
                            >
                                Enable
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderModelRow = (model: AIModel) => {
        const status = getModelStatus(model);
        const prov = providerByModel.get(model.id);
        const pulling = pullingModels.has(model.id);

        return (
            <div
                key={model.id}
                className={[
                    'hypothalamus-row',
                    model.id === selectedModelId ? 'hypothalamus-row-selected' : '',
                    status === 'disabled' ? 'hypothalamus-row-disabled' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => selectModel(model.id)}
            >
                <span className="hypothalamus-row-name">{model.name}</span>
                <span className="hypothalamus-row-family">{model.family?.name || '—'}</span>
                <span className="hypothalamus-row-creator">{model.creator?.name || '—'}</span>
                <span className="hypothalamus-row-size">{model.parameter_size || '—'}</span>
                <span className="hypothalamus-row-status">
                    {pulling ? (
                        <span className="hypothalamus-spinner" />
                    ) : (
                        <span className={`hypothalamus-status-dot hypothalamus-dot-${status}`} />
                    )}
                </span>
                <div className="hypothalamus-row-actions">
                    {status === 'available' && !pulling && (
                        <button
                            type="button"
                            className="hypothalamus-action-btn hypothalamus-action-btn-pull"
                            onClick={e => handlePull(model.id, e)}
                        >
                            Pull
                        </button>
                    )}
                    {status === 'installed' && (
                        <button
                            type="button"
                            className="hypothalamus-action-btn hypothalamus-action-btn-remove"
                            onClick={e => handleRemove(model.id, e)}
                        >
                            Remove
                        </button>
                    )}
                    {status === 'breaker' && prov && (
                        <button
                            type="button"
                            className="hypothalamus-action-btn hypothalamus-action-btn-reset"
                            onClick={e => handleResetBreaker(prov.id, e)}
                        >
                            Reset
                        </button>
                    )}
                    {status === 'disabled' && (
                        <button
                            type="button"
                            className="hypothalamus-action-btn"
                            onClick={e => { e.stopPropagation(); handleToggleEnabled(model.id); }}
                        >
                            Enable
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const centerPanel = (
        <div className="hypothalamus-center">
            <div className="hypothalamus-center-header">
                <span className="hypothalamus-center-title">
                    <Zap size={16} style={{ color: '#34d399', marginRight: '8px', verticalAlign: 'middle' }} />
                    {tab === 'catalog' && `${filteredModels.length} Models`}
                    {tab === 'routing' && 'Routing Profiles'}
                    {tab === 'budgets' && 'Budget Definitions'}
                </span>
                {tab === 'catalog' && (
                    <div className="hypothalamus-center-controls">
                        <button
                            type="button"
                            className="hypothalamus-header-action hypothalamus-header-action-sync"
                            onClick={handleSyncLocal}
                            disabled={syncing}
                        >
                            {syncing ? <span className="hypothalamus-spinner" /> : <RefreshCw size={13} />}
                            <span>Sync Local</span>
                        </button>
                        <button
                            type="button"
                            className="hypothalamus-header-action hypothalamus-header-action-fetch"
                            onClick={handleFetchCatalog}
                            disabled={fetching}
                        >
                            {fetching ? <span className="hypothalamus-spinner" /> : <Download size={13} />}
                            <span>Fetch Catalog</span>
                        </button>
                        <select
                            className="hypothalamus-sort-select"
                            value={sortMode}
                            onChange={e => setSortMode(e.target.value as SortMode)}
                        >
                            <option value="installed">Installed First</option>
                            <option value="name">Name</option>
                            <option value="family">Family</option>
                            <option value="size">Size</option>
                        </select>
                        <button
                            type="button"
                            className={`hypothalamus-view-btn ${viewMode === 'list' ? 'hypothalamus-view-btn-active' : ''}`}
                            onClick={() => changeViewMode('list')}
                        >
                            <List size={14} />
                        </button>
                        <button
                            type="button"
                            className={`hypothalamus-view-btn ${viewMode === 'grid' ? 'hypothalamus-view-btn-active' : ''}`}
                            onClick={() => changeViewMode('grid')}
                        >
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                )}
                {actionMessage && (
                    <span className="hypothalamus-action-message">{actionMessage}</span>
                )}
            </div>

            {tab === 'catalog' && (
                isLoading ? (
                    <div className="hypothalamus-empty">Loading models...</div>
                ) : filteredModels.length === 0 ? (
                    <div className="hypothalamus-empty">No models match the current filters.</div>
                ) : viewMode === 'grid' ? (
                    <div className="hypothalamus-grid">
                        {filteredModels.map(renderModelCardGrid)}
                    </div>
                ) : (
                    <div className="hypothalamus-list">
                        {filteredModels.map(renderModelRow)}
                    </div>
                )
            )}

            {tab === 'routing' && (
                filters.length === 0 ? (
                    <div className="hypothalamus-empty">No routing profiles configured.</div>
                ) : (
                    <div className="hypothalamus-grid">
                        {filters.map(f => (
                            <div
                                key={f.id}
                                className={`hypothalamus-card ${String(f.id) === selectedFilterId ? 'hypothalamus-card-selected' : ''}`}
                                onClick={() => selectFilter(f.id)}
                            >
                                <div className="hypothalamus-card-name">{f.name}</div>
                                <div className="hypothalamus-card-subtitle">
                                    {f.failover_strategy?.name || 'No strategy'}
                                </div>
                                {f.preferred_model?.ai_model?.name && (
                                    <div className="hypothalamus-card-subtitle">
                                        Preferred: {f.preferred_model.ai_model.name}
                                    </div>
                                )}
                                {f.local_failover?.ai_model?.name && (
                                    <div className="hypothalamus-card-subtitle">
                                        Local failover: {f.local_failover.ai_model.name}
                                    </div>
                                )}
                                {f.required_capabilities?.length > 0 && (
                                    <div className="hypothalamus-card-pills">
                                        {f.required_capabilities.map(c => (
                                            <span key={labelKey(c)} className="hypothalamus-pill">{label(c).replace('_', ' ')}</span>
                                        ))}
                                    </div>
                                )}
                                {f.banned_provider_names?.length > 0 && (
                                    <div className="hypothalamus-card-subtitle">
                                        Banned: {f.banned_provider_names.join(', ')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )
            )}

            {tab === 'budgets' && (
                budgets.length === 0 ? (
                    <div className="hypothalamus-empty">No budgets configured.</div>
                ) : (
                    <div className="hypothalamus-grid">
                        {budgets.map(b => {
                            const isFreeOnly = parseFloat(b.max_input_cost_per_token) === 0 &&
                                               parseFloat(b.max_output_cost_per_token) === 0;
                            return (
                                <div
                                    key={b.id}
                                    className={`hypothalamus-card ${String(b.id) === selectedBudgetId ? 'hypothalamus-card-selected' : ''}`}
                                    onClick={() => selectBudgetItem(b.id)}
                                >
                                    <div className="hypothalamus-card-name">{b.name}</div>
                                    <div className="hypothalamus-card-subtitle">
                                        {b.period_name || 'Lifetime'}
                                    </div>
                                    {isFreeOnly ? (
                                        <span className="hypothalamus-free-badge">FREE ONLY</span>
                                    ) : (
                                        <div className="hypothalamus-card-subtitle">
                                            Max spend: {b.max_spend_per_period ? `$${b.max_spend_per_period}/period` : 'Unlimited'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )
            )}
        </div>
    );

    /* ── Inline inspectors removed — now using extracted components ── */

    /* ── RIGHT PANEL: Budget Inspector ───────────── */

    const renderBudgetInspector = (budget: IdentityBudget) => {
        const isFreeOnly = parseFloat(budget.max_input_cost_per_token) === 0 &&
                           parseFloat(budget.max_output_cost_per_token) === 0;

        return (
            <div className="hypothalamus-inspector">
                <button type="button" className="hypothalamus-inspector-close" onClick={clearSelection}>
                    ✕
                </button>

                <div className="hypothalamus-inspector-header">
                    <span className="hypothalamus-inspector-name">{budget.name}</span>
                </div>

                <div className="hypothalamus-inspector-section">
                    <span className="hypothalamus-inspector-section-title">Period</span>
                    <span className="hypothalamus-inspector-subtitle">
                        {budget.period_name || 'Lifetime'}
                        {budget.period_duration ? ` (${budget.period_duration})` : ' (Never resets)'}
                    </span>
                </div>

                <div className="hypothalamus-inspector-section">
                    <span className="hypothalamus-inspector-section-title">Cost Gates</span>
                    {isFreeOnly ? (
                        <span className="hypothalamus-free-tier-badge">FREE TIER</span>
                    ) : (
                        <>
                            <div className="hypothalamus-pricing-row">
                                <span>Max input cost/token</span>
                                <span className="hypothalamus-pricing-value">
                                    {formatCost(budget.max_input_cost_per_token)}
                                </span>
                            </div>
                            <div className="hypothalamus-pricing-row">
                                <span>Max output cost/token</span>
                                <span className="hypothalamus-pricing-value">
                                    {formatCost(budget.max_output_cost_per_token)}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="hypothalamus-inspector-section">
                    <span className="hypothalamus-inspector-section-title">Spend Limits</span>
                    <div className="hypothalamus-pricing-row">
                        <span>Per period</span>
                        <span className="hypothalamus-pricing-value">
                            {budget.max_spend_per_period ? `$${budget.max_spend_per_period}` : 'Unlimited'}
                        </span>
                    </div>
                    <div className="hypothalamus-pricing-row">
                        <span>Per request</span>
                        <span className="hypothalamus-pricing-value">
                            {budget.max_spend_per_request ? `$${budget.max_spend_per_request}` : 'Unlimited'}
                        </span>
                    </div>
                    {budget.warning_threshold != null && (
                        <div className="hypothalamus-pricing-row">
                            <span>Warning threshold</span>
                            <span className="hypothalamus-pricing-value">
                                {Math.round(budget.warning_threshold * 100)}%
                            </span>
                        </div>
                    )}
                </div>

                {budget.warning_threshold != null && budget.max_spend_per_period && (
                    <div className="hypothalamus-inspector-section">
                        <span className="hypothalamus-inspector-section-title">Threshold</span>
                        <div className="hypothalamus-budget-bar-container">
                            <div
                                className="hypothalamus-budget-bar-fill"
                                style={{ width: `${Math.round(budget.warning_threshold * 100)}%` }}
                            />
                        </div>
                        <span className="hypothalamus-inspector-subtitle">
                            Warn at {Math.round(budget.warning_threshold * 100)}% of ${budget.max_spend_per_period}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    /* ── RIGHT PANEL ─────────────────────────────── */

    let rightPanel: React.ReactNode = null;

    const handleFilterUpdate = (updated: SelectionFilter) => {
        setFilters(prev => prev.map(f => f.id === updated.id ? updated : f));
    };

    if (tab === 'catalog' && selectedModel) {
        rightPanel = (
            <HypothalamusModelInspector
                model={selectedModel}
                provider={providerByModel.get(selectedModel.id) ?? null}
                models={models}
                families={families}
                pulling={pullingModels.has(selectedModel.id)}
                onClose={clearSelection}
                onToggleEnabled={handleToggleEnabled}
                onPull={handlePull}
                onRemove={handleRemove}
                onResetBreaker={handleResetBreaker}
                onToggleProviderEnabled={handleToggleProviderEnabled}
            />
        );
    } else if (tab === 'routing' && selectedFilter) {
        rightPanel = (
            <HypothalamusRoutingInspector
                filter={selectedFilter}
                onClose={clearSelection}
                onFilterUpdate={handleFilterUpdate}
            />
        );
    } else if (tab === 'budgets' && selectedBudget) {
        rightPanel = renderBudgetInspector(selectedBudget);
    } else {
        rightPanel = (
            <div className="hypothalamus-inspector-empty">
                {tab === 'catalog' && 'Select a model to inspect.'}
                {tab === 'routing' && 'Select a routing profile to inspect.'}
                {tab === 'budgets' && 'Select a budget to inspect.'}
            </div>
        );
    }

    return (
        <ThreePanel
            left={leftPanel}
            center={centerPanel}
            right={rightPanel}
        />
    );
}

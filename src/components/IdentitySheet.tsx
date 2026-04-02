import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cpu, Loader2, Database, Wrench, Zap, Activity, Trash2, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api';
import { EngramEditor } from './EngramEditor';
import './IdentitySheet.css';
import { ensureDynamicCss, safeCssIdent } from '../utils/styleRegistry';

interface OutlierData {
    id: string | number;
    name: string;
    description?: string;
}

interface BaseIdentityData {
    id: string;
    name: string;
    system_prompt_template: string;
    rendered: string;
    enabled_tools: OutlierData[];
    addons: OutlierData[];
    tags: OutlierData[];
    identity_type?: OutlierData | null;
    ai_model?: OutlierData | null;
    selection_filter?: OutlierData | null;
}

interface Engram {
    id: string;
    summary: string;
    created: string;
}

interface ReasoningTurn {
    id: number | string;
    turn_number: number;
    tokens_input?: number;
    tokens_output?: number;
}

interface ReasoningSessionStatus {
    id: number | string;
    name: string;
}

interface ReasoningSession {
    id: string;
    status: ReasoningSessionStatus;
    spike: string;
    max_turns: number;
    current_focus: number;
    max_focus: number;
    current_level: number;
    current_turn?: ReasoningTurn | null;
}

// IdentityDisc shares the flattened identity fields with BaseIdentityData
// plus real-time RPG / telemetry stats and attached memories / sessions.
interface IdentityDiscData extends BaseIdentityData {
    level: number;
    xp: number;
    available: boolean;
    successes: number;
    failures: number;
    timeouts: number;
    last_message_to_self: string;
    memories?: Engram[];
    reasoning_session?: ReasoningSession[];
}

interface IdentitySheetProps {
    id: number | string;
    type: 'base' | 'disc';
}

type ActiveTab = 'telemetry' | 'loadout' | 'memories' | 'flight';

interface ModelPreview {
    model_provider: number | null;
    model_name: string | null;
    provider_name: string | null;
    provider_model_id: string | null;
    input_cost_per_token: string | null;
    output_cost_per_token: string | null;
    reason?: string;
}

interface IdentityFormState {
    name: string;
    selection_filter_id: string | number | null;
    system_prompt_template: string;
    enabled_tool_ids: (string | number)[];
    addon_ids: (string | number)[];
    tag_ids: (string | number)[];
}

export const IdentitySheet = ({ id, type }: IdentitySheetProps) => {
    const navigate = useNavigate();
    const [data, setData] = useState<BaseIdentityData | IdentityDiscData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<ActiveTab>('telemetry');
    const [isEditMode, setIsEditMode] = useState(false);
    const [formState, setFormState] = useState<IdentityFormState | null>(null);

    const [modelPreview, setModelPreview] = useState<ModelPreview | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const [isModelsLoading, setIsModelsLoading] = useState(false);

    const [allTools, setAllTools] = useState<OutlierData[]>([]);
    const [allAddons, setAllAddons] = useState<OutlierData[]>([]);
    const [allIdentityTags, setAllIdentityTags] = useState<OutlierData[]>([]);
    const [selectionFilters, setSelectionFilters] = useState<OutlierData[]>([]);

    const isDisc = type === 'disc';
    const discData = isDisc && data ? (data as IdentityDiscData) : null;
    const baseData: BaseIdentityData | null = data as BaseIdentityData | null;

    const focusFillCss = useMemo(() => {
        if (!discData?.reasoning_session || discData.reasoning_session.length === 0) return '';
        return discData.reasoning_session
            .map((session) => {
                const focusPercent = session.max_focus
                    ? Math.round((session.current_focus / session.max_focus) * 100)
                    : 0;
                const clamped = Math.min(Math.max(focusPercent, 0), 100);
                const sid = safeCssIdent(session.id);
                return `.session-focus-fill--${sid}{width:${clamped}%;}`;
            })
            .join('\n');
    }, [discData?.reasoning_session]);

    useEffect(() => {
        if (!focusFillCss) return;
        ensureDynamicCss(`identitysheet:focusfills:${safeCssIdent(String(id))}`, focusFillCss);
    }, [focusFillCss, id]);

    const hydrateFormFromData = useCallback((current: BaseIdentityData | IdentityDiscData) => {
        const base = current as BaseIdentityData;
        const next: IdentityFormState = {
            name: base.name,
            selection_filter_id: base.selection_filter?.id ?? null,
            system_prompt_template: base.system_prompt_template ?? '',
            enabled_tool_ids: (base.enabled_tools ?? []).map(t => t.id),
            addon_ids: (base.addons ?? []).map(a => a.id),
            tag_ids: (base.tags ?? []).map(t => t.id),
        };
        setFormState(next);
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const endpoint = type === 'disc'
                ? `/api/v2/identity-discs/${id}/`
                : `/api/v2/identities/${id}/`;

            const res = await apiFetch(endpoint);
            if (!res.ok) {
                throw new Error(`Failed to load identity (${res.status})`);
            }
            const json = await res.json();
            setData(json);
            hydrateFormFromData(json);
        } catch (err: any) {
            console.error('Neural fetch failed:', err);
            setError(err.message ?? 'Failed to load identity sheet.');
        } finally {
            setIsLoading(false);
        }
    }, [hydrateFormFromData, id, type]);

    const fetchModelPreview = useCallback(async () => {
        if (type !== 'disc') return;
        setIsPreviewLoading(true);
        try {
            const res = await apiFetch(`/api/v2/identity-discs/${id}/model-preview/`);
            if (res.ok) {
                setModelPreview(await res.json());
            }
        } catch (err) {
            console.error('Model preview fetch failed:', err);
        } finally {
            setIsPreviewLoading(false);
        }
    }, [id, type]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchModelPreview();
    }, [fetchModelPreview]);

    useEffect(() => {
        const loadCatalogs = async () => {
            try {
                setIsModelsLoading(true);
                const [toolRes, addonRes, tagRes, filterRes] = await Promise.all([
                    apiFetch('/api/v2/tool-definitions/'),
                    apiFetch('/api/v2/identity-addons/'),
                    apiFetch('/api/v2/identity-tags/'),
                    apiFetch('/api/v2/selection-filters/'),
                ]);
                if (toolRes.ok) {
                    const json = await toolRes.json();
                    setAllTools(json.results ?? json);
                }
                if (addonRes.ok) {
                    const json = await addonRes.json();
                    setAllAddons(json.results ?? json);
                }
                if (tagRes.ok) {
                    const json = await tagRes.json();
                    setAllIdentityTags(json.results ?? json);
                }
                if (filterRes.ok) {
                    const json = await filterRes.json();
                    setSelectionFilters(json.results ?? json);
                }
            } catch (err) {
                console.error('Catalog fetch failed', err);
            } finally {
                setIsModelsLoading(false);
            }
        };
        loadCatalogs();
    }, []);

    const toggleIdInList = (list: (string | number)[], value: string | number) => {
        return list.includes(value)
            ? list.filter(v => v !== value)
            : [...list, value];
    };

    const handleSave = async () => {
        if (!formState) return;
        setIsSaving(true);
        setError(null);
        try {
            const endpoint = type === 'disc'
                ? `/api/v2/identity-discs/${id}/`
                : `/api/v2/identities/${id}/`;

            const payload: any = {
                name: formState.name,
                selection_filter_id: formState.selection_filter_id,
                system_prompt_template: formState.system_prompt_template,
                enabled_tools: formState.enabled_tool_ids,
                addons: formState.addon_ids,
                tags: formState.tag_ids,
            };

            const res = await apiFetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(`Save failed (${res.status})`);
            }

            await fetchData();
            await fetchModelPreview();
            setIsEditMode(false);
        } catch (err: any) {
            console.error('Save failed', err);
            setError(err.message ?? 'Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSpawnDisc = async () => {
        setError(null);
        try {
            const res = await apiFetch(`/api/v2/identities/${id}/forge/`, {
                method: 'POST',
            });

            if (!res.ok) {
                throw new Error(`Spawn Disc failed (${res.status})`);
            }
        } catch (err: any) {
            console.error('Spawn Disc failed', err);
            setError(err.message ?? 'Failed to spawn Disc.');
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            const endpoint = type === 'disc'
                ? `/api/v2/identity-discs/${id}/`
                : `/api/v2/identities/${id}/`;
            const res = await apiFetch(endpoint, { method: 'DELETE' });
            if (!res.ok && res.status !== 204) {
                throw new Error(`Delete failed (${res.status})`);
            }
            navigate('/identity');
        } catch (err) {
            console.error('Delete failed', err);
            setError(err instanceof Error ? err.message : 'Failed to delete.');
            setIsDeleting(false);
            setConfirmDelete(false);
        }
    };

    if (isLoading || !data) {
        return (
            <div className="identity-sheet-container">
                <div className="sheet-body sheet-loading">
                    <Loader2 className="animate-spin text-muted" size={24} />
                    <span className="font-mono text-sm text-muted">Decrypting Engram...</span>
                </div>
            </div>
        );
    }

    const currentModelName = modelPreview?.model_name ?? 'No model resolved';

    const sessions = discData?.reasoning_session ?? [];

    return (
        <div className="identity-sheet-container scroll-hidden">
            <div className="sheet-header">
                <div className="sheet-title-group">
                    <h2 className="font-display sheet-title">
                        {data.name}
                    </h2>
                    <span className="font-mono sheet-subtitle">
                        Neural ID: {data.id} | Type: {type.toUpperCase()}
                        {baseData?.identity_type ? ` [${baseData.identity_type.name}]` : ''}
                        {' '}| Model: {currentModelName}
                    </span>
                </div>
                <div className="sheet-header-actions">
                    {type === 'base' && (
                        <button
                            type="button"
                            className="btn-action btn-secondary"
                            onClick={handleSpawnDisc}
                        >
                            <Cpu size={14} />
                            SPAWN DISC
                        </button>
                    )}
                    <button
                        type="button"
                        className={`btn-action ${isEditMode ? 'btn-action-active' : ''}`}
                        onClick={() => { setIsEditMode(prev => !prev); setConfirmDelete(false); }}
                        disabled={isSaving}
                    >
                        <Cpu size={14} fill="currentColor" />
                        {isEditMode ? 'EXIT EDIT MODE' : 'EDIT MODE'}
                    </button>
                    {isEditMode && (
                        confirmDelete ? (
                            <div className="sheet-delete-confirm">
                                <span className="font-mono text-xs" style={{ color: 'var(--accent-red)' }}>Confirm?</span>
                                <button
                                    type="button"
                                    className="btn-action btn-danger"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? <Loader2 className="animate-spin" size={12} /> : 'Yes, Delete'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-secondary-outline"
                                    onClick={() => setConfirmDelete(false)}
                                    disabled={isDeleting}
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn-action btn-danger"
                                onClick={() => setConfirmDelete(true)}
                            >
                                <Trash2 size={14} />
                                DELETE
                            </button>
                        )
                    )}
                </div>
            </div>

            {error && (
                <div className="sheet-error">
                    <span className="font-mono text-xs">{error}</span>
                </div>
            )}

            <div className="sheet-tabs">
                <button
                    type="button"
                    className={`sheet-tab ${activeTab === 'telemetry' ? 'sheet-tab-active' : ''}`}
                    onClick={() => setActiveTab('telemetry')}
                >
                    <Activity size={14} />
                    Telemetry
                </button>
                <button
                    type="button"
                    className={`sheet-tab ${activeTab === 'loadout' ? 'sheet-tab-active' : ''}`}
                    onClick={() => setActiveTab('loadout')}
                >
                    <Wrench size={14} />
                    Loadout
                </button>
                <button
                    type="button"
                    className={`sheet-tab ${activeTab === 'memories' ? 'sheet-tab-active' : ''}`}
                    onClick={() => setActiveTab('memories')}
                >
                    <Database size={14} />
                    Memories
                </button>
                <button
                    type="button"
                    className={`sheet-tab ${activeTab === 'flight' ? 'sheet-tab-active' : ''}`}
                    onClick={() => setActiveTab('flight')}
                >
                    <Zap size={14} />
                    Flight Logs
                </button>
            </div>

            {activeTab === 'telemetry' && (
                <div className="sheet-body">
                    {isDisc && discData ? (
                        <div className="disc-specific-panel">
                            <h3 className="sheet-section-title common-layout-28">
                                <Activity size={14} /> Active Disc Telemetry
                            </h3>
                            <div className="sheet-metrics-grid">
                                <div className="metric-card">
                                    <span className="metric-label">Experience Level</span>
                                    <span className="metric-value">Lvl {discData.level} ({discData.xp} XP)</span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">Status</span>
                                    <span className={`metric-value ${discData.available ? 'status-text-online' : 'roster-offline'}`}>
                                        {discData.available ? 'Online & Ready' : 'Deployed / Offline'}
                                    </span>
                                </div>
                                <div className="metric-card">
                                    <span className="metric-label">Experience Record</span>
                                    <span className="metric-value font-mono text-sm">
                                        <span className="stat-positive">{discData.successes} Succ</span> - <span className="stat-negative">{discData.failures} Fail</span> - <span className="stat-warning">{discData.timeouts} Time</span>
                                    </span>
                                </div>
                            </div>

                            {discData.last_message_to_self && (
                                <div className="sheet-section identitysheet-ui-83">
                                    <span className="metric-label">Last Internal Monologue</span>
                                    <div className="memory-box">"{discData.last_message_to_self}"</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="sheet-section">
                            <h3 className="sheet-section-title">Template Telemetry</h3>
                            <div className="prompt-box">
                                Base Identities do not track live telemetry. Spawn a Disc to start collecting stats.
                            </div>
                        </div>
                    )}

                    <div className="sheet-section">
                        <h3 className="sheet-section-title">System Prompt Formulation</h3>
                        {isEditMode ? (
                            <textarea
                                className="prompt-box prompt-box-input"
                                value={formState?.system_prompt_template ?? ''}
                                onChange={e => setFormState(prev => prev ? {
                                    ...prev,
                                    system_prompt_template: e.target.value,
                                } : prev)}
                                rows={6}
                            />
                        ) : (
                            <div className="prompt-box scroll-hidden">
                                {baseData?.system_prompt_template || 'No system prompt configured.'}
                            </div>
                        )}
                    </div>

                    <div className="sheet-section">
                        <h3 className="sheet-section-title">Compiled Neural Prompt (Turn 1)</h3>
                        <div className="prompt-box scroll-hidden">
                            {(isDisc && discData?.rendered)
                                ? discData.rendered
                                : (baseData?.rendered || 'No prompt compiled.')}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'loadout' && (
                <div className="sheet-body">
                    <div className="sheet-section">
                        <h3 className="sheet-section-title">Core Identity</h3>
                        <div className="loadout-grid">
                            <div className="loadout-field">
                                <label className="metric-label">Callsign</label>
                                {isEditMode ? (
                                    <input
                                        className="loadout-input"
                                        type="text"
                                        value={formState?.name ?? ''}
                                        onChange={e => setFormState(prev => prev ? {
                                            ...prev,
                                            name: e.target.value,
                                        } : prev)}
                                    />
                                ) : (
                                    <div className="loadout-text">
                                        {baseData?.name}
                                    </div>
                                )}
                            </div>
                            <div className="loadout-field">
                                <label className="metric-label">
                                    Hypothalamus Route
                                    <button
                                        type="button"
                                        className="btn-icon-inline"
                                        title="Refresh model preview"
                                        onClick={fetchModelPreview}
                                        disabled={isPreviewLoading}
                                        style={{ marginLeft: 6, opacity: isPreviewLoading ? 0.4 : 0.7, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                                    >
                                        <RefreshCw size={12} className={isPreviewLoading ? 'animate-spin' : ''} />
                                    </button>
                                </label>
                                <div className="loadout-text" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {isPreviewLoading ? (
                                        <span className="font-mono text-xs text-muted">Resolving...</span>
                                    ) : modelPreview?.model_name ? (
                                        <>
                                            <span className="font-mono text-sm">{modelPreview.model_name}</span>
                                            <span className="font-mono text-xs text-muted">
                                                via {modelPreview.provider_name}
                                                {modelPreview.input_cost_per_token && modelPreview.input_cost_per_token !== '0' && (
                                                    <> &middot; ${modelPreview.input_cost_per_token}/tok in</>
                                                )}
                                            </span>
                                        </>
                                    ) : (
                                        <span className="font-mono text-xs text-muted">
                                            {modelPreview?.reason ?? 'No model resolved'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="loadout-field">
                                <label className="metric-label">Model Selection Filter</label>
                                {isEditMode ? (
                                    <select
                                        className="loadout-input"
                                        disabled={isModelsLoading}
                                        value={formState?.selection_filter_id ?? ''}
                                        onChange={e => setFormState(prev => prev ? {
                                            ...prev,
                                            selection_filter_id: e.target.value === '' ? null : e.target.value,
                                        } : prev)}
                                    >
                                        <option value="">No filter (use default routing)</option>
                                        {selectionFilters.map(sf => (
                                            <option key={sf.id} value={sf.id}>
                                                {sf.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="loadout-text">
                                        {baseData?.selection_filter?.name ?? 'No filter assigned'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="sheet-section">
                        <h3 className="sheet-section-title common-layout-15">
                            <Wrench size={14} /> Enabled Tools
                        </h3>
                        <div className="badge-container">
                            {isEditMode ? (
                                allTools.length ? allTools.map(tool => {
                                    const checked = !!formState?.enabled_tool_ids.includes(tool.id);
                                    return (
                                        <button
                                            key={`tool-${tool.id}`}
                                            type="button"
                                            className={`badge badge-tool ${checked ? 'badge-selected' : ''}`}
                                            onClick={() => setFormState(prev => prev ? ({
                                                ...prev,
                                                enabled_tool_ids: toggleIdInList(prev.enabled_tool_ids, tool.id),
                                            }) : prev)}
                                        >
                                            <span className="badge-toggle-dot">{checked ? '●' : '○'}</span>
                                            {tool.name}
                                        </button>
                                    );
                                }) : <span className="font-mono text-xs text-muted">No tools available.</span>
                            ) : (
                                baseData?.enabled_tools?.length ? baseData.enabled_tools.map(tool => (
                                    <button key={`tool-${tool.id}`} type="button" className="badge badge-tool">
                                        {tool.name}
                                    </button>
                                )) : <span className="font-mono text-xs text-muted">No tools configured.</span>
                            )}
                        </div>
                    </div>

                    <div className="sheet-section">
                        <h3 className="sheet-section-title common-layout-15">
                            <Zap size={14} /> Neural Addons
                        </h3>
                        <div className="badge-container">
                            {isEditMode ? (
                                allAddons.length ? allAddons.map(addon => {
                                    const checked = !!formState?.addon_ids.includes(addon.id);
                                    return (
                                        <button
                                            key={`addon-${addon.id}`}
                                            type="button"
                                            className={`badge badge-addon ${checked ? 'badge-selected' : ''}`}
                                            onClick={() => setFormState(prev => prev ? ({
                                                ...prev,
                                                addon_ids: toggleIdInList(prev.addon_ids, addon.id),
                                            }) : prev)}
                                        >
                                            <span className="badge-toggle-dot">{checked ? '●' : '○'}</span>
                                            {addon.name}
                                        </button>
                                    );
                                }) : <span className="font-mono text-xs text-muted">No addons available.</span>
                            ) : (
                                baseData?.addons?.length ? baseData.addons.map(addon => (
                                    <button key={`addon-${addon.id}`} type="button" className="badge badge-addon">
                                        {addon.name}
                                    </button>
                                )) : <span className="font-mono text-xs text-muted">No addons active.</span>
                            )}
                        </div>
                    </div>

                    <div className="sheet-section">
                        <h3 className="sheet-section-title common-layout-15">
                            <Database size={14} /> Taxonomy Tags
                        </h3>
                        <div className="badge-container">
                            {isEditMode ? (
                                allIdentityTags.length ? allIdentityTags.map(tag => {
                                    const checked = !!formState?.tag_ids.includes(tag.id);
                                    return (
                                        <button
                                            key={`tag-${tag.id}`}
                                            type="button"
                                            className={`badge badge-tag ${checked ? 'badge-selected' : ''}`}
                                            onClick={() => setFormState(prev => prev ? ({
                                                ...prev,
                                                tag_ids: toggleIdInList(prev.tag_ids, tag.id),
                                            }) : prev)}
                                        >
                                            <span className="badge-toggle-dot">{checked ? '●' : '○'}</span>
                                            {tag.name}
                                        </button>
                                    );
                                }) : <span className="font-mono text-xs text-muted">No tags available.</span>
                            ) : (
                                baseData?.tags?.length ? baseData.tags.map(tag => (
                                    <button key={`tag-${tag.id}`} type="button" className="badge badge-tag">
                                        {tag.name}
                                    </button>
                                )) : <span className="font-mono text-xs text-muted">Uncategorized.</span>
                            )}
                        </div>
                    </div>

                    {isEditMode && (
                        <div className="sheet-footer-actions">
                            <button
                                type="button"
                                className="btn-secondary-outline"
                                onClick={() => {
                                    if (data) hydrateFormFromData(data);
                                    setIsEditMode(false);
                                }}
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn-primary"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Loadout'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'memories' && (
                <div className="sheet-body">
                    {isDisc ? (
                        <div className="sheet-section">
                            <h3 className="sheet-section-title">Engram Stream</h3>
                            <EngramEditor discId={id} />
                        </div>
                    ) : (
                        <div className="sheet-section">
                            <h3 className="sheet-section-title">Template Memories</h3>
                            <div className="prompt-box">
                                Base Identities do not own memories directly. Their spawned Discs accrue Engrams over time.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'flight' && (
                <div className="sheet-body">
                    {isDisc ? (
                        <div className="sheet-section">
                            <h3 className="sheet-section-title">Reasoning Sessions</h3>
                            {sessions.length === 0 ? (
                                <div className="prompt-box">
                                    No active or historical reasoning sessions found for this Disc.
                                </div>
                            ) : (
                                <div className="session-list">
                                    {sessions.map(session => {
                                        const sessionClassId = safeCssIdent(session.id);
                                        return (
                                            <Link key={session.id} to={`/frontal/${session.id}`} className="session-item session-item-link">
                                                <div className="session-header">
                                                    <span className="font-mono text-xs">Session {session.id}</span>
                                                    <span className="session-status">{session.status?.name}</span>
                                                </div>
                                                <div className="session-focus-bar">
                                                    <div
                                                        className={`session-focus-fill session-focus-fill--${sessionClassId}`}
                                                    />
                                                </div>
                                                <div className="session-metrics font-mono text-xs">
                                                    <span>Focus {session.current_focus}/{session.max_focus}</span>
                                                    <span>Level {session.current_level}</span>
                                                    {session.current_turn && (
                                                        <span>
                                                            Turn {session.current_turn.turn_number} ·
                                                            IN {session.current_turn.tokens_input ?? 0} / OUT {session.current_turn.tokens_output ?? 0}
                                                        </span>
                                                    )}
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="sheet-section">
                            <h3 className="sheet-section-title">Flight Logs</h3>
                            <div className="prompt-box">
                                Flight logs are only recorded for active Discs spawned from this Identity.
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
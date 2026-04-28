import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '../api';
import { GENOME } from '../components/genomeConstants';
import { ModifierEventList } from '../components/ModifierEventList';
import { ModifierInstallButton } from '../components/ModifierInstallButton';
import { ModifierStatusPill } from '../components/ModifierStatusPill';
import { useDendrite } from '../components/SynapticCleft';
import { ThreePanel } from '../components/ThreePanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import {
    maybeFlagRestart,
    useRestartOverlay,
} from '../context/RestartOverlayProvider';
import type {
    NeuralModifierCatalogEntry,
    NeuralModifierDetail,
    NeuralModifierImpact,
    NeuralModifierImpactRow,
    NeuralModifierSummary,
} from '../types';
import './ModifierGardenPage.css';

const STATUS_AVAILABLE = 0;
// Retired surfaced statuses — constants kept because historical log events
// may still reference these ids:
//   STATUS_DISCOVERED (1) retired 2026-04-19; row-absence semantics for
//   AVAILABLE replaced it.
//   STATUS_ENABLED (3) and STATUS_DISABLED (4) retired 2026-04-25 with the
//   enable/disable feature removal; INSTALLED is now the only live state.
const STATUS_DISCOVERED = 1;
const STATUS_INSTALLED = 2;
const STATUS_BROKEN = 5;

const STATUS_FILTER_LABELS: Record<string, string> = {
    all: 'All',
    available: 'Available',
    installed: 'Installed',
    broken: 'Broken',
};

type UnifiedRow =
    | { kind: 'installed'; row: NeuralModifierSummary }
    | { kind: 'available'; entry: NeuralModifierCatalogEntry };

function rowSlug(row: UnifiedRow): string {
    return row.kind === 'installed' ? row.row.slug : row.entry.slug;
}

function formatRelative(iso: string | null): string {
    if (!iso) return '—';
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function filterByStatus(list: UnifiedRow[], key: string): UnifiedRow[] {
    switch (key) {
        case 'available':
            return list.filter((r) => r.kind === 'available');
        case 'installed':
            return list.filter(
                (r) => r.kind === 'installed' && r.row.status_id === STATUS_INSTALLED,
            );
        case 'broken':
            return list.filter((r) =>
                r.kind === 'installed'
                && (r.row.status_id === STATUS_BROKEN || r.row.status_id === STATUS_DISCOVERED),
            );
        default:
            return list;
    }
}

function groupByModel(
    rows: NeuralModifierImpactRow[],
): Array<{ model: string; rows: NeuralModifierImpactRow[] }> {
    // Collector.fast_deletes and field_updates can legitimately yield the
    // same (model, pk) more than once — multiple M2M through-rows collected
    // via different paths, or two FKs on the same row getting set_null.
    // Dedupe per (model, pk) so React keys stay unique, and concatenate
    // distinct reasons when they differ.
    const byModel = new Map<string, Map<string, NeuralModifierImpactRow>>();
    for (const row of rows) {
        let inner = byModel.get(row.model);
        if (!inner) {
            inner = new Map();
            byModel.set(row.model, inner);
        }
        const existing = inner.get(row.pk);
        if (existing) {
            if (!existing.reason.split(', ').includes(row.reason)) {
                existing.reason = `${existing.reason}, ${row.reason}`;
            }
        } else {
            inner.set(row.pk, { ...row });
        }
    }
    return Array.from(byModel.entries())
        .map(([model, inner]) => ({ model, rows: Array.from(inner.values()) }))
        .sort((a, b) => a.model.localeCompare(b.model));
}

function CascadeBucket(props: {
    label: string;
    tone: 'direct' | 'cascade' | 'set-null' | 'protected';
    rows: NeuralModifierImpactRow[];
}) {
    const grouped = groupByModel(props.rows);
    return (
        <section
            className={`modifier-garden-cascade-bucket modifier-garden-cascade-bucket--${props.tone}`}
        >
            <header className="modifier-garden-cascade-header">
                <span className="modifier-garden-cascade-label">{props.label}</span>
                <span className="modifier-garden-cascade-count">{props.rows.length}</span>
            </header>
            <ul className="modifier-garden-cascade-tree">
                {grouped.map((group) => (
                    <li key={group.model} className="modifier-garden-cascade-model">
                        <div className="modifier-garden-cascade-model-header">
                            <code>{group.model}</code>
                            <span>{group.rows.length}</span>
                        </div>
                        <ul className="modifier-garden-cascade-rows">
                            {group.rows.map((row) => (
                                <li key={`${row.model}:${row.pk}`}>
                                    <span className="modifier-garden-cascade-row-name">
                                        {row.name_or_repr}
                                    </span>
                                    {row.reason.startsWith('set_null:') && (
                                        <span className="modifier-garden-cascade-row-reason">
                                            {row.reason}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function ModifierGardenPage() {
    const { setCrumbs } = useBreadcrumbs();
    const { triggerRestart } = useRestartOverlay();

    const [modifiers, setModifiers] = useState<NeuralModifierSummary[]>([]);
    const [catalog, setCatalog] = useState<NeuralModifierCatalogEntry[]>([]);
    const [detail, setDetail] = useState<NeuralModifierDetail | null>(null);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [busySlug, setBusySlug] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<NeuralModifierImpact | null>(null);
    const [deleting, setDeleting] = useState<NeuralModifierCatalogEntry | null>(null);
    const [overflowSlug, setOverflowSlug] = useState<string | null>(null);
    const [creating, setCreating] = useState<boolean>(false);
    const [createForm, setCreateForm] = useState({
        slug: '',
        name: '',
        version: '0.1.0',
        author: '',
        license: 'MIT',
    });
    const [createError, setCreateError] = useState<string | null>(null);
    const [createBusy, setCreateBusy] = useState<boolean>(false);
    // Inline 400 surfaced next to a row's Workspace button. Slug-keyed so
    // a refusal on bundle A doesn't pollute bundle B's row.
    const [workspaceErrorBySlug, setWorkspaceErrorBySlug] = useState<Record<string, string>>({});

    const overflowRef = useRef<HTMLDivElement | null>(null);

    const modifierEvent = useDendrite('NeuralModifier', null);

    useEffect(() => {
        setCrumbs([
            {
                label: 'Neuroplasticity',
                path: '/modifiers',
                tip: 'Neuroplasticity governs installed NeuralModifier bundles — the extension surface.',
            },
        ]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [installedRes, catalogRes] = await Promise.all([
                    apiFetch('/api/v2/neural-modifiers/'),
                    apiFetch('/api/v2/neural-modifiers/catalog/'),
                ]);

                let installedList: NeuralModifierSummary[] = [];
                if (installedRes.ok) {
                    const data = await installedRes.json();
                    installedList = Array.isArray(data) ? data : data.results ?? [];
                }

                let catalogList: NeuralModifierCatalogEntry[] = [];
                if (catalogRes.ok) {
                    const data = await catalogRes.json();
                    catalogList = Array.isArray(data) ? data : data.results ?? [];
                }

                if (cancelled) return;
                setModifiers(installedList);
                setCatalog(catalogList);
            } catch (err) {
                console.error('Failed to fetch modifiers', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [modifierEvent]);

    useEffect(() => {
        if (!selectedSlug) {
            setDetail(null);
            return;
        }
        const isInstalled = modifiers.some((m) => m.slug === selectedSlug);
        if (!isInstalled) {
            setDetail(null);
            return;
        }
        let cancelled = false;
        const load = async () => {
            try {
                const res = await apiFetch(`/api/v2/neural-modifiers/${selectedSlug}/`);
                if (!res.ok || cancelled) return;
                const data = (await res.json()) as NeuralModifierDetail;
                if (!cancelled) setDetail(data);
            } catch (err) {
                console.error('Failed to fetch modifier detail', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [selectedSlug, modifiers, modifierEvent]);

    useEffect(() => {
        if (!overflowSlug) return;
        const onDocClick = (e: MouseEvent) => {
            if (!overflowRef.current) return;
            if (!overflowRef.current.contains(e.target as Node)) setOverflowSlug(null);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [overflowSlug]);

    const unified = useMemo<UnifiedRow[]>(() => {
        const installedSlugs = new Set(modifiers.map((m) => m.slug));
        const installedRows: UnifiedRow[] = modifiers.map((row) => ({ kind: 'installed', row }));
        const availableRows: UnifiedRow[] = catalog
            .filter((entry) => !installedSlugs.has(entry.slug))
            .map((entry) => ({ kind: 'available', entry }));
        return [...installedRows, ...availableRows];
    }, [modifiers, catalog]);

    const filtered = useMemo(() => {
        let list = filterByStatus(unified, statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((r) => {
                if (r.kind === 'installed') {
                    return r.row.slug.toLowerCase().includes(q)
                        || r.row.name.toLowerCase().includes(q)
                        || r.row.author.toLowerCase().includes(q);
                }
                return r.entry.slug.toLowerCase().includes(q)
                    || r.entry.name.toLowerCase().includes(q)
                    || r.entry.author.toLowerCase().includes(q);
            });
        }
        return list;
    }, [unified, statusFilter, search]);

    const installFromCatalog = async (entry: NeuralModifierCatalogEntry) => {
        if (busySlug) return;
        setBusySlug(entry.slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/catalog/${entry.slug}/install/`,
                { method: 'POST' },
            );
            if (!res.ok) {
                console.error(`Failed to install ${entry.slug}`);
                return;
            }
            // Optimistic local update. The install response is
            // authoritative NeuralModifierDetail (which extends
            // NeuralModifierSummary); apply it directly so the row
            // flips from AVAILABLE to INSTALLED without waiting on
            // an Acetylcholine round-trip that the post-install
            // Daphne restart may eat.
            const data = (await res.json()) as NeuralModifierDetail & { restart_imminent?: boolean };
            setModifiers((prev) => {
                const without = prev.filter((m) => m.slug !== data.slug);
                return [...without, data];
            });
            maybeFlagRestart(data, triggerRestart);
        } finally {
            setBusySlug(null);
        }
    };

    const deleteFromCatalog = async () => {
        if (!deleting) return;
        const slug = deleting.slug;
        setBusySlug(slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/catalog/${slug}/delete/`,
                { method: 'POST' },
            );
            if (!res.ok) {
                console.error(`Failed to delete ${slug}`);
                return;
            }
            const payload = await res.json().catch(() => ({}));
            setCatalog((prev) => prev.filter((entry) => entry.slug !== slug));
            setDeleting(null);
            maybeFlagRestart(payload, triggerRestart);
        } finally {
            setBusySlug(null);
        }
    };

    const openUninstall = async (modifier: NeuralModifierSummary) => {
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/${modifier.slug}/impact/`,
            );
            if (!res.ok) return;
            const impact = (await res.json()) as NeuralModifierImpact;
            setConfirming(impact);
        } catch (err) {
            console.error('Failed to load impact', err);
        }
    };

    const confirmUninstall = async () => {
        if (!confirming) return;
        const slug = confirming.slug;
        setBusySlug(slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/${slug}/uninstall/`,
                { method: 'POST' },
            );
            if (!res.ok) {
                console.error(`Failed to uninstall ${slug}`);
                return;
            }
            const payload = await res.json().catch(() => ({}));
            // Optimistic local update. The backend also fires Acetylcholine
            // for other tabs, but the originating client can't depend on
            // the WS round-trip beating the user's next action.
            setModifiers((prev) => prev.filter((m) => m.slug !== slug));
            setSelectedSlug((prev) => (prev === slug ? null : prev));
            setConfirming(null);
            maybeFlagRestart(payload, triggerRestart);
        } finally {
            setBusySlug(null);
        }
    };

    const submitCreate = async () => {
        const slug = createForm.slug.trim();
        if (!slug) {
            setCreateError('slug is required');
            return;
        }
        setCreateBusy(true);
        setCreateError(null);
        try {
            const res = await apiFetch(
                '/api/v2/neural-modifiers/create/',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        slug,
                        name: createForm.name.trim() || slug,
                        version: createForm.version.trim() || '0.1.0',
                        author: createForm.author.trim(),
                        license: createForm.license.trim(),
                    }),
                },
            );
            if (!res.ok) {
                const detail = await res.json().catch(() => null);
                setCreateError((detail && detail.detail) || `Create failed (${res.status}).`);
                return;
            }
            const data = (await res.json()) as NeuralModifierDetail & { restart_imminent?: boolean };
            setModifiers((prev) => {
                const without = prev.filter((m) => m.slug !== data.slug);
                return [...without, data];
            });
            setCreating(false);
            setCreateForm({
                slug: '',
                name: '',
                version: '0.1.0',
                author: '',
                license: 'MIT',
            });
            setSelectedSlug(data.slug);
            maybeFlagRestart(data, triggerRestart);
        } catch (err) {
            setCreateError(String(err));
        } finally {
            setCreateBusy(false);
        }
    };

    /**
     * Promote a bundle to the active edit workspace. Backend mutex
     * ensures exactly one bundle has `selected_for_edit = true` at a
     * time; PATCHing one to true atomically clears the previous holder.
     * CANONICAL refuses with 400 — surface inline next to the row.
     */
    const setAsWorkspace = async (modifier: NeuralModifierSummary) => {
        if (busySlug) return;
        const slug = modifier.slug;
        setBusySlug(slug);
        setWorkspaceErrorBySlug((prev) => {
            const next = { ...prev };
            delete next[slug];
            return next;
        });
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/${slug}/`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selected_for_edit: true }),
                },
            );
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                const detail = (payload as { detail?: string }).detail
                    ?? `Set workspace failed (${res.status}).`;
                setWorkspaceErrorBySlug((prev) => ({ ...prev, [slug]: detail }));
                return;
            }
            const data = (await res.json()) as NeuralModifierDetail;
            // Mirror the mutex locally — only the just-PATCHed row
            // is selected_for_edit; everything else flips to false.
            // The backend will also fire Acetylcholine, but the
            // originating client doesn't depend on the round-trip.
            setModifiers((prev) => prev.map((m) =>
                m.slug === data.slug
                    ? { ...m, ...data, selected_for_edit: true }
                    : { ...m, selected_for_edit: false }
            ));
        } catch (err) {
            setWorkspaceErrorBySlug((prev) => ({ ...prev, [slug]: String(err) }));
        } finally {
            setBusySlug(null);
        }
    };

    const saveBundle = async (modifier: NeuralModifierSummary) => {
        if (busySlug) return;
        const slug = modifier.slug;
        setBusySlug(slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/${slug}/save/`,
                { method: 'POST' },
            );
            if (!res.ok) {
                const detail = await res.text();
                console.error(`Failed to save ${slug}: ${detail}`);
                return;
            }
            // Backend always bumps the semver patch on save and writes
            // the new version onto the row. Mirror that locally so the
            // version cell reflects the bump without waiting on a
            // refetch round-trip.
            const data = (await res.json()) as {
                slug: string;
                new_version: string;
                row_count: number;
                bytes_written: number;
                zip_path: string;
                restart_imminent?: boolean;
            };
            setModifiers((prev) => prev.map((m) =>
                m.slug === slug ? { ...m, version: data.new_version } : m
            ));
            maybeFlagRestart(data, triggerRestart);
        } finally {
            setBusySlug(null);
        }
    };

    const renderActionButton = (entry: UnifiedRow) => {
        const slug = rowSlug(entry);
        const isBusy = busySlug === slug;

        if (entry.kind === 'available') {
            return (
                <button
                    type="button"
                    className="modifier-garden-action modifier-garden-action--install"
                    onClick={(e) => { e.stopPropagation(); installFromCatalog(entry.entry); }}
                    disabled={isBusy}
                    title="Install this bundle so its rows land in the database."
                >
                    Install
                </button>
            );
        }

        // Installed rows have no primary action button — the Uninstall and
        // Details buttons rendered alongside this in the row are the full
        // surface. (Save lands here as part of the U-cycle work.)
        return null;
    };

    const left = (
        <div className="modifier-garden-filters">
            <div className="modifier-garden-filters-section">
                <label className="modifier-garden-filters-label" htmlFor="modifier-search">
                    Search
                </label>
                <input
                    id="modifier-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="slug, name, author…"
                    className="modifier-garden-search"
                />
            </div>
            <div className="modifier-garden-filters-section">
                <div className="modifier-garden-filters-label">Status</div>
                <div className="modifier-garden-chip-row">
                    {Object.entries(STATUS_FILTER_LABELS).map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`modifier-garden-chip${statusFilter === key ? ' modifier-garden-chip--active' : ''}`}
                            onClick={() => setStatusFilter(key)}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="modifier-garden-filters-section">
                <div className="modifier-garden-filters-label">Actions</div>
                <ModifierInstallButton
                    onInstalled={(data) => {
                        setModifiers((prev) => {
                            const without = prev.filter((m) => m.slug !== data.slug);
                            return [...without, data];
                        });
                    }}
                />
                <button
                    type="button"
                    className="modifier-garden-action modifier-garden-action--install"
                    onClick={() => { setCreateError(null); setCreating(true); }}
                    title="Scaffold a brand-new empty bundle. Stamp rows into it via the begin-play genome dropdown, then Save to pack the first archive."
                >
                    New Bundle
                </button>
            </div>
        </div>
    );

    const center = (
        <div className="modifier-garden-center">
            <header className="modifier-garden-header">
                <h1 className="modifier-garden-title">Modifier Garden</h1>
                <p className="modifier-garden-subtitle">
                    Bundles live here as zip files. Install lands a bundle's rows in the
                    database; the bundle's tools become available immediately. Uninstall
                    clears the rows but keeps the zip. Delete removes the zip too.
                </p>
            </header>

            <table className="modifier-garden-table">
                <thead>
                    <tr>
                        <th>Slug</th>
                        <th>Name</th>
                        <th>Version</th>
                        <th>Status</th>
                        <th>Contributions</th>
                        <th>Last event</th>
                        <th className="modifier-garden-table-actions-col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filtered.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="modifier-garden-empty">
                                No modifiers match these filters.
                            </td>
                        </tr>
                    ) : filtered.map((entry) => {
                        const slug = rowSlug(entry);
                        const isActive = slug === selectedSlug;
                        const isBusy = busySlug === slug;
                        const rowClass = isActive
                            ? 'modifier-garden-row modifier-garden-row--selected'
                            : 'modifier-garden-row';

                        if (entry.kind === 'available') {
                            const e = entry.entry;
                            const overflowOpen = overflowSlug === slug;
                            return (
                                <tr
                                    key={`available:${slug}`}
                                    className={rowClass}
                                    onClick={() => setSelectedSlug(slug)}
                                >
                                    <td className="modifier-garden-cell-slug">
                                        <code>{e.slug}</code>
                                    </td>
                                    <td>{e.name}</td>
                                    <td>{e.version}</td>
                                    <td>
                                        <ModifierStatusPill
                                            statusId={STATUS_AVAILABLE}
                                            statusName="AVAILABLE"
                                        />
                                    </td>
                                    <td>—</td>
                                    <td>
                                        <span className="modifier-garden-cell-event">—</span>
                                    </td>
                                    <td
                                        className="modifier-garden-actions"
                                        onClick={(ev) => ev.stopPropagation()}
                                    >
                                        {renderActionButton(entry)}
                                        <div
                                            className="modifier-garden-overflow"
                                            ref={overflowOpen ? overflowRef : null}
                                        >
                                            <button
                                                type="button"
                                                className="modifier-garden-action modifier-garden-overflow-trigger"
                                                onClick={() => setOverflowSlug(overflowOpen ? null : slug)}
                                                disabled={isBusy}
                                                aria-label="More actions"
                                                title="More actions"
                                            >
                                                ⋯
                                            </button>
                                            {overflowOpen && (
                                                <div className="modifier-garden-overflow-menu" role="menu">
                                                    <button
                                                        type="button"
                                                        className="modifier-garden-overflow-item modifier-garden-overflow-item--danger"
                                                        role="menuitem"
                                                        onClick={() => {
                                                            setOverflowSlug(null);
                                                            setDeleting(e);
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        }

                        const modifier = entry.row;
                        const isCanonicalRow = modifier.id === GENOME.CANONICAL;
                        const isWorkspace = modifier.selected_for_edit === true;
                        const wsErr = workspaceErrorBySlug[modifier.slug];
                        return (
                            <tr
                                key={`installed:${modifier.id}`}
                                className={
                                    isWorkspace
                                        ? `${rowClass} modifier-garden-row--workspace`
                                        : rowClass
                                }
                                onClick={() => setSelectedSlug(modifier.slug)}
                            >
                                <td className="modifier-garden-cell-slug">
                                    <code>{modifier.slug}</code>
                                    {isWorkspace && (
                                        <span
                                            className="modifier-garden-workspace-badge"
                                            title="New rows you create default to this bundle."
                                        >
                                            WORKSPACE
                                        </span>
                                    )}
                                </td>
                                <td>{modifier.name}</td>
                                <td>{modifier.version}</td>
                                <td>
                                    <ModifierStatusPill
                                        statusId={modifier.status_id}
                                        statusName={modifier.status_name}
                                    />
                                </td>
                                <td>{modifier.contribution_count}</td>
                                <td>
                                    <span className="modifier-garden-cell-event">
                                        {modifier.latest_event?.event_type_name ?? '—'}
                                    </span>
                                    <span className="modifier-garden-cell-timestamp">
                                        {formatRelative(modifier.latest_event?.created ?? modifier.modified)}
                                    </span>
                                </td>
                                <td
                                    className="modifier-garden-actions"
                                    onClick={(ev) => ev.stopPropagation()}
                                >
                                    {renderActionButton(entry)}
                                    {!isCanonicalRow && !isWorkspace && (
                                        <button
                                            type="button"
                                            className="modifier-garden-action modifier-garden-action--workspace"
                                            onClick={(ev) => { ev.stopPropagation(); setAsWorkspace(modifier); }}
                                            disabled={isBusy}
                                            title="Make this the active workspace. New rows you create default into this bundle."
                                        >
                                            Set as Workspace
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="modifier-garden-action modifier-garden-action--danger"
                                        onClick={() => openUninstall(modifier)}
                                        disabled={isBusy}
                                        title="Uninstall and remove all contribution rows."
                                    >
                                        Uninstall
                                    </button>
                                    <button
                                        type="button"
                                        className="modifier-garden-action modifier-garden-action--save"
                                        onClick={(ev) => { ev.stopPropagation(); saveBundle(modifier); }}
                                        disabled={isBusy}
                                        title="Serialize bundle-owned rows back into the genome zip. Always bumps the patch version."
                                    >
                                        Save
                                    </button>
                                    <Link
                                        to={`/modifiers/${modifier.slug}`}
                                        className="modifier-garden-action modifier-garden-action--link"
                                    >
                                        Details
                                    </Link>
                                    {wsErr && (
                                        <span
                                            className="modifier-garden-workspace-error"
                                            role="alert"
                                            title={wsErr}
                                        >
                                            {wsErr}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );

    const right = selectedSlug ? (() => {
        const availableSelected = catalog.find((c) => c.slug === selectedSlug);
        const installedSelected = modifiers.find((m) => m.slug === selectedSlug);

        if (!installedSelected && availableSelected) {
            return (
                <div className="modifier-garden-inspector">
                    <div className="modifier-garden-inspector-header">
                        <h2 className="modifier-garden-inspector-title">
                            {availableSelected.name}
                        </h2>
                        <button
                            type="button"
                            className="modifier-garden-inspector-close"
                            onClick={() => setSelectedSlug(null)}
                            aria-label="Close inspector"
                        >
                            ×
                        </button>
                    </div>
                    <div className="modifier-garden-inspector-meta">
                        <div><span>Slug</span><code>{availableSelected.slug}</code></div>
                        <div><span>Version</span><code>{availableSelected.version}</code></div>
                        <div><span>Author</span><code>{availableSelected.author}</code></div>
                        <div><span>License</span><code>{availableSelected.license}</code></div>
                        <div>
                            <span>Status</span>
                            <ModifierStatusPill
                                statusId={STATUS_AVAILABLE}
                                statusName="AVAILABLE"
                            />
                        </div>
                        <div><span>Archive</span><code>{availableSelected.archive_name}</code></div>
                    </div>
                    {availableSelected.description && (
                        <div className="modifier-garden-inspector-section">
                            <h3>Description</h3>
                            <p className="modifier-garden-inspector-description">
                                {availableSelected.description}
                            </p>
                        </div>
                    )}
                </div>
            );
        }

        return (
            <div className="modifier-garden-inspector">
                <div className="modifier-garden-inspector-header">
                    <h2 className="modifier-garden-inspector-title">
                        {detail?.name ?? selectedSlug}
                    </h2>
                    <button
                        type="button"
                        className="modifier-garden-inspector-close"
                        onClick={() => setSelectedSlug(null)}
                        aria-label="Close inspector"
                    >
                        ×
                    </button>
                </div>
                {detail && (
                    <>
                        <div className="modifier-garden-inspector-meta">
                            <div><span>Slug</span><code>{detail.slug}</code></div>
                            <div><span>Version</span><code>{detail.version}</code></div>
                            <div><span>Author</span><code>{detail.author}</code></div>
                            <div><span>License</span><code>{detail.license}</code></div>
                            <div>
                                <span>Status</span>
                                <ModifierStatusPill
                                    statusId={detail.status_id}
                                    statusName={detail.status_name}
                                />
                            </div>
                            <div><span>Contributions</span><code>{detail.contribution_count}</code></div>
                        </div>

                        <div className="modifier-garden-inspector-section">
                            <h3>Recent events</h3>
                            <ModifierEventList
                                logs={detail.installation_logs?.slice(0, 2) ?? []}
                            />
                        </div>

                        <Link
                            to={`/modifiers/${detail.slug}`}
                            className="modifier-garden-action modifier-garden-action--link modifier-garden-inspector-deep-link"
                        >
                            Open full detail
                        </Link>
                    </>
                )}
            </div>
        );
    })() : null;

    return (
        <>
            <ThreePanel left={left} center={center} right={right} />

            {confirming && (
                <div className="modifier-garden-dialog-overlay" role="presentation">
                    <div
                        role="dialog"
                        aria-modal="true"
                        className="modifier-garden-dialog modifier-garden-dialog--cascade"
                    >
                        <h2>Uninstall {confirming.slug}?</h2>
                        <p>
                            This will remove <strong>{confirming.row_count}</strong>{' '}
                            row{confirming.row_count === 1 ? '' : 's'} the bundle owns, plus every
                            row reached via CASCADE. Set-null and protected rows are listed below.
                        </p>
                        {confirming.protected.length > 0 && (
                            <CascadeBucket
                                label="Protected (uninstall blocked)"
                                tone="protected"
                                rows={confirming.protected}
                            />
                        )}
                        {confirming.direct.length > 0 && (
                            <CascadeBucket
                                label="Direct (bundle owns)"
                                tone="direct"
                                rows={confirming.direct}
                            />
                        )}
                        {confirming.cascade.length > 0 && (
                            <CascadeBucket
                                label="Cascade"
                                tone="cascade"
                                rows={confirming.cascade}
                            />
                        )}
                        {confirming.set_null.length > 0 && (
                            <CascadeBucket
                                label="Set null"
                                tone="set-null"
                                rows={confirming.set_null}
                            />
                        )}
                        <div className="modifier-garden-dialog-actions">
                            <button
                                type="button"
                                className="modifier-garden-action"
                                onClick={() => setConfirming(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modifier-garden-action modifier-garden-action--danger"
                                onClick={confirmUninstall}
                                disabled={
                                    busySlug === confirming.slug
                                    || confirming.protected.length > 0
                                }
                            >
                                Uninstall
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleting && (
                <div className="modifier-garden-dialog-overlay" role="presentation">
                    <div role="dialog" aria-modal="true" className="modifier-garden-dialog">
                        <h2>Delete {deleting.name} bundle?</h2>
                        <p>
                            This removes <code>{deleting.archive_name}</code> from your computer.
                            You'll need to re-obtain it to install again.
                        </p>
                        <div className="modifier-garden-dialog-actions">
                            <button
                                type="button"
                                className="modifier-garden-action"
                                onClick={() => setDeleting(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modifier-garden-action modifier-garden-action--danger"
                                onClick={deleteFromCatalog}
                                disabled={busySlug === deleting.slug}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {creating && (
                <div className="modifier-garden-dialog-overlay" role="presentation">
                    <div role="dialog" aria-modal="true" className="modifier-garden-dialog">
                        <h2>New bundle</h2>
                        <p>
                            Scaffolds an empty bundle. After creating, stamp pathways
                            into it via the begin-play genome dropdown, then Save to
                            pack the first archive.
                        </p>
                        <div className="modifier-garden-dialog-form">
                            <label>
                                <span>Slug</span>
                                <input
                                    type="text"
                                    value={createForm.slug}
                                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                                    placeholder="my-bundle"
                                    autoFocus
                                />
                            </label>
                            <label>
                                <span>Name</span>
                                <input
                                    type="text"
                                    value={createForm.name}
                                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                    placeholder="(defaults to slug)"
                                />
                            </label>
                            <label>
                                <span>Version</span>
                                <input
                                    type="text"
                                    value={createForm.version}
                                    onChange={(e) => setCreateForm({ ...createForm, version: e.target.value })}
                                    placeholder="0.1.0"
                                />
                            </label>
                            <label>
                                <span>Author</span>
                                <input
                                    type="text"
                                    value={createForm.author}
                                    onChange={(e) => setCreateForm({ ...createForm, author: e.target.value })}
                                />
                            </label>
                            <label>
                                <span>License</span>
                                <input
                                    type="text"
                                    value={createForm.license}
                                    onChange={(e) => setCreateForm({ ...createForm, license: e.target.value })}
                                />
                            </label>
                        </div>
                        {createError && (
                            <p className="modifier-garden-dialog-error">{createError}</p>
                        )}
                        <div className="modifier-garden-dialog-actions">
                            <button
                                type="button"
                                className="modifier-garden-action"
                                onClick={() => { setCreating(false); setCreateError(null); }}
                                disabled={createBusy}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="modifier-garden-action modifier-garden-action--install"
                                onClick={submitCreate}
                                disabled={createBusy || !createForm.slug.trim()}
                            >
                                {createBusy ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

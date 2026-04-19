import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '../api';
import { ModifierEventList } from '../components/ModifierEventList';
import { ModifierInstallButton } from '../components/ModifierInstallButton';
import { ModifierStatusPill } from '../components/ModifierStatusPill';
import { useDendrite } from '../components/SynapticCleft';
import { ThreePanel } from '../components/ThreePanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import type {
    NeuralModifierCatalogEntry,
    NeuralModifierDetail,
    NeuralModifierImpact,
    NeuralModifierSummary,
} from '../types';
import './ModifierGardenPage.css';

const STATUS_AVAILABLE = 0;
// STATUS_DISCOVERED retired as a surfaced status on 2026-04-19; the constant
// stays because historical log events may still reference id 1.
const STATUS_DISCOVERED = 1;
const STATUS_INSTALLED = 2;
const STATUS_ENABLED = 3;
const STATUS_DISABLED = 4;
const STATUS_BROKEN = 5;

const STATUS_FILTER_LABELS: Record<string, string> = {
    all: 'All',
    available: 'Available',
    installed: 'Installed',
    active: 'Enabled',
    disabled: 'Disabled',
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
        case 'active':
            return list.filter((r) => r.kind === 'installed' && r.row.status_id === STATUS_ENABLED);
        case 'installed':
            return list.filter((r) =>
                r.kind === 'installed' && (
                    r.row.status_id === STATUS_INSTALLED
                    || r.row.status_id === STATUS_ENABLED
                    || r.row.status_id === STATUS_DISABLED
                ),
            );
        case 'disabled':
            return list.filter((r) => r.kind === 'installed' && r.row.status_id === STATUS_DISABLED);
        case 'broken':
            return list.filter((r) =>
                r.kind === 'installed'
                && (r.row.status_id === STATUS_BROKEN || r.row.status_id === STATUS_DISCOVERED),
            );
        default:
            return list;
    }
}

export function ModifierGardenPage() {
    const { setCrumbs } = useBreadcrumbs();

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

    const toggleEnabled = async (modifier: NeuralModifierSummary) => {
        if (busySlug) return;
        const next = modifier.status_id === STATUS_ENABLED ? 'disable' : 'enable';
        setBusySlug(modifier.slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/${modifier.slug}/${next}/`,
                { method: 'POST' },
            );
            if (!res.ok) {
                console.error(`Failed to ${next} modifier ${modifier.slug}`);
            }
        } finally {
            setBusySlug(null);
        }
    };

    const installFromCatalog = async (entry: NeuralModifierCatalogEntry) => {
        if (busySlug) return;
        setBusySlug(entry.slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/catalog/${entry.slug}/install/`,
                { method: 'POST' },
            );
            if (!res.ok) console.error(`Failed to install ${entry.slug}`);
        } finally {
            setBusySlug(null);
        }
    };

    const deleteFromCatalog = async () => {
        if (!deleting) return;
        setBusySlug(deleting.slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/catalog/${deleting.slug}/delete/`,
                { method: 'POST' },
            );
            if (!res.ok) console.error(`Failed to delete ${deleting.slug}`);
            setDeleting(null);
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
        setBusySlug(confirming.slug);
        try {
            const res = await apiFetch(
                `/api/v2/neural-modifiers/${confirming.slug}/uninstall/`,
                { method: 'POST' },
            );
            if (!res.ok) {
                console.error(`Failed to uninstall ${confirming.slug}`);
            }
            setConfirming(null);
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
                    title="Install this bundle so its rows land in the database. Install does not enable."
                >
                    Install
                </button>
            );
        }

        const modifier = entry.row;
        if (modifier.status_id === STATUS_BROKEN || modifier.status_id === STATUS_DISCOVERED) {
            return null;
        }
        const isEnabled = modifier.status_id === STATUS_ENABLED;
        return (
            <button
                type="button"
                className={`modifier-garden-action ${isEnabled ? 'modifier-garden-action--disable' : 'modifier-garden-action--enable'}`}
                onClick={(e) => { e.stopPropagation(); toggleEnabled(modifier); }}
                disabled={isBusy}
                title={
                    isEnabled
                        ? "Disabling keeps this bundle's configuration but hides its tools from reasoning sessions. No data is removed."
                        : 'Enable this bundle so its tools become available to reasoning sessions.'
                }
            >
                {isEnabled ? 'Disable' : 'Enable'}
            </button>
        );
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
                <ModifierInstallButton />
            </div>
        </div>
    );

    const center = (
        <div className="modifier-garden-center">
            <header className="modifier-garden-header">
                <h1 className="modifier-garden-title">Modifier Garden</h1>
                <p className="modifier-garden-subtitle">
                    Bundles live here as zip files. Install lands a bundle's rows in the
                    database. Enable exposes its tools to reasoning sessions. Uninstall clears
                    the rows but keeps the zip. Delete removes the zip too.
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
                        return (
                            <tr
                                key={`installed:${modifier.id}`}
                                className={rowClass}
                                onClick={() => setSelectedSlug(modifier.slug)}
                            >
                                <td className="modifier-garden-cell-slug">
                                    <code>{modifier.slug}</code>
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
                                    <button
                                        type="button"
                                        className="modifier-garden-action modifier-garden-action--danger"
                                        onClick={() => openUninstall(modifier)}
                                        disabled={isBusy}
                                        title="Uninstall and remove all contribution rows."
                                    >
                                        Uninstall
                                    </button>
                                    <Link
                                        to={`/modifiers/${modifier.slug}`}
                                        className="modifier-garden-action modifier-garden-action--link"
                                    >
                                        Details
                                    </Link>
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
                    <div role="dialog" aria-modal="true" className="modifier-garden-dialog">
                        <h2>Uninstall {confirming.slug}?</h2>
                        <p>
                            This will remove <strong>{confirming.contribution_count}</strong>{' '}
                            contribution {confirming.contribution_count === 1 ? 'row' : 'rows'} across{' '}
                            {confirming.breakdown.length} content{' '}
                            {confirming.breakdown.length === 1 ? 'type' : 'types'}.
                        </p>
                        {confirming.breakdown.length > 0 && (
                            <ul className="modifier-garden-dialog-breakdown">
                                {confirming.breakdown.map((row) => (
                                    <li key={row.content_type}>
                                        <code>{row.content_type}</code>
                                        <span>{row.count}</span>
                                    </li>
                                ))}
                            </ul>
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
                                disabled={busySlug === confirming.slug}
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
        </>
    );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch } from '../api';
import { ModifierEventList } from '../components/ModifierEventList';
import { ModifierInstallButton } from '../components/ModifierInstallButton';
import { ModifierStatusPill } from '../components/ModifierStatusPill';
import { useDendrite } from '../components/SynapticCleft';
import { ThreePanel } from '../components/ThreePanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import type {
    NeuralModifierDetail,
    NeuralModifierImpact,
    NeuralModifierSummary,
} from '../types';
import './ModifierGardenPage.css';

const STATUS_DISCOVERED = 1;
const STATUS_INSTALLED = 2;
const STATUS_ENABLED = 3;
const STATUS_DISABLED = 4;
const STATUS_BROKEN = 5;

const STATUS_FILTER_LABELS: Record<string, string> = {
    all: 'All',
    active: 'Enabled',
    installed: 'Installed',
    disabled: 'Disabled',
    broken: 'Broken',
    discovered: 'Discovered',
};

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

function filterByStatus(list: NeuralModifierSummary[], key: string): NeuralModifierSummary[] {
    switch (key) {
        case 'active':
            return list.filter((m) => m.status_id === STATUS_ENABLED);
        case 'installed':
            return list.filter((m) =>
                m.status_id === STATUS_INSTALLED
                || m.status_id === STATUS_ENABLED
                || m.status_id === STATUS_DISABLED
            );
        case 'disabled':
            return list.filter((m) => m.status_id === STATUS_DISABLED);
        case 'broken':
            return list.filter((m) => m.status_id === STATUS_BROKEN);
        case 'discovered':
            return list.filter((m) => m.status_id === STATUS_DISCOVERED);
        default:
            return list;
    }
}

export function ModifierGardenPage() {
    const { setCrumbs } = useBreadcrumbs();

    const [modifiers, setModifiers] = useState<NeuralModifierSummary[]>([]);
    const [detail, setDetail] = useState<NeuralModifierDetail | null>(null);
    const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [busySlug, setBusySlug] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<NeuralModifierImpact | null>(null);

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
                const res = await apiFetch('/api/v2/neural-modifiers/');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setModifiers(Array.isArray(data) ? data : data.results ?? []);
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
    }, [selectedSlug, modifierEvent]);

    const filtered = useMemo(() => {
        let list = filterByStatus(modifiers, statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((m) =>
                m.slug.toLowerCase().includes(q)
                || m.name.toLowerCase().includes(q)
                || m.author.toLowerCase().includes(q),
            );
        }
        return list;
    }, [modifiers, statusFilter, search]);

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

    const renderActionButton = (modifier: NeuralModifierSummary) => {
        const isBusy = busySlug === modifier.slug;
        if (modifier.status_id === STATUS_BROKEN || modifier.status_id === STATUS_DISCOVERED) {
            return (
                <button
                    type="button"
                    className="modifier-garden-action"
                    disabled
                    title="Install or repair first."
                >
                    Enable
                </button>
            );
        }
        const isEnabled = modifier.status_id === STATUS_ENABLED;
        return (
            <button
                type="button"
                className={`modifier-garden-action ${isEnabled ? 'modifier-garden-action--disable' : 'modifier-garden-action--enable'}`}
                onClick={(e) => {
                    e.stopPropagation();
                    toggleEnabled(modifier);
                }}
                disabled={isBusy}
                title={
                    isEnabled
                        ? 'Disabling keeps this bundle\'s configuration but hides its tools from reasoning sessions. No data is removed.'
                        : 'Re-enable this bundle so its tools become available to reasoning sessions.'
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
                    Bundles currently registered with this Are-Self. Installing a bundle copies
                    it into <code>neural_modifiers/</code>, loads its data, and wires its code.
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
                    ) : filtered.map((modifier) => {
                        const isActive = modifier.slug === selectedSlug;
                        return (
                            <tr
                                key={modifier.id}
                                className={isActive ? 'modifier-garden-row modifier-garden-row--selected' : 'modifier-garden-row'}
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
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {renderActionButton(modifier)}
                                    <button
                                        type="button"
                                        className="modifier-garden-action modifier-garden-action--danger"
                                        onClick={() => openUninstall(modifier)}
                                        disabled={
                                            busySlug === modifier.slug
                                            || modifier.status_id === STATUS_DISCOVERED
                                        }
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

    const right = selectedSlug ? (
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
    ) : null;

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
        </>
    );
}

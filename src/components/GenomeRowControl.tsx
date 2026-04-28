import { useState } from 'react';
import { AlertCircle } from 'lucide-react';

import { apiFetch } from '../api';
import { GENOME } from './genomeConstants';
import { maybeFlagRestart, useRestartOverlay } from '../context/RestartOverlayProvider';
import './GenomeRowControl.css';

/**
 * Reusable genome editor for any owned-model row (Effector, Executable,
 * EffectorArgumentAssignment, ExecutableArgumentAssignment,
 * EffectorContext, ExecutableSupplementaryFileOrPath, etc.).
 *
 * Mechanics, mirroring the BEGIN_PLAY-pathway control:
 *   - PATCH `<viewsetPath><rowId>/` body `{"genome": "<uuid>"}`.
 *   - Display via the read-only `genome_slug` mirror returned alongside.
 *   - CANONICAL filtered out of the dropdown options. If the row is
 *     itself currently on CANONICAL, the dropdown is replaced by an
 *     informational read-only block (matches the backend's
 *     "Cannot move a canonical row" 400 contract without making the
 *     user trigger it).
 *   - 400 `{detail}` surfaced inline.
 *   - `restart_imminent: true` on the response raises the global
 *     restart overlay.
 *
 * The parent owns the shared `installedModifiers` list (one fetch per
 * page, not per control) and the row's `genomeId` / `genomeSlug` state;
 * `onGenomeChanged` lets the parent mirror the new value into its own
 * row state without a refetch.
 */

export interface GenomeRowModifierOption {
    id: string;
    slug: string;
    name: string;
}

interface GenomeRowControlProps {
    /** API base path of the viewset, with trailing slash. e.g. `/api/v2/effectors/` */
    viewsetPath: string;
    rowId: string;
    /** The row's current genome FK (UUID). null if backend hasn't sent it yet. */
    genomeId: string | null;
    /** Read-only display mirror returned by the serializer. */
    genomeSlug: string | null;
    /** Pre-fetched list of INSTALLED bundles (parent shares one fetch across N controls). */
    installedModifiers: GenomeRowModifierOption[];
    /** Notified after a successful PATCH so the parent can mirror state without refetching. */
    onGenomeChanged?: (nextGenomeId: string, nextGenomeSlug: string | null) => void;
    /** Visual register. `compact` shrinks padding/font for inline-row use. */
    variant?: 'full' | 'compact';
    /** Optional override for the leading label. Default: `GENOME`. */
    label?: string;
    /** Disable user interaction — used while the parent is mid-save on the same row. */
    disabled?: boolean;
}

export function GenomeRowControl({
    viewsetPath,
    rowId,
    genomeId,
    genomeSlug,
    installedModifiers,
    onGenomeChanged,
    variant = 'full',
    label = 'GENOME',
    disabled = false,
}: GenomeRowControlProps) {
    const { triggerRestart } = useRestartOverlay();
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isCanonicalRow = genomeId === GENOME.CANONICAL;
    const options = installedModifiers.filter((m) => m.id !== GENOME.CANONICAL);

    const handleChange = async (nextGenomeId: string) => {
        if (!nextGenomeId || nextGenomeId === genomeId) return;
        setIsSaving(true);
        setError(null);
        try {
            const res = await apiFetch(
                `${viewsetPath}${encodeURIComponent(rowId)}/`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ genome: nextGenomeId }),
                },
            );
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}));
                const detail = (payload as { detail?: string }).detail
                    ?? `Promote failed (${res.status}).`;
                setError(detail);
                return;
            }
            const data = await res.json().catch(() => ({}));
            const newGenomeId = (data as { genome?: string | null }).genome ?? nextGenomeId;
            const newGenomeSlug = (data as { genome_slug?: string | null }).genome_slug ?? null;
            onGenomeChanged?.(newGenomeId, newGenomeSlug);
            maybeFlagRestart(data, triggerRestart);
        } catch (err) {
            setError(String(err));
        } finally {
            setIsSaving(false);
        }
    };

    const rootClass = variant === 'compact'
        ? 'genome-row-control genome-row-control--compact'
        : 'genome-row-control';

    if (isCanonicalRow) {
        return (
            <div className={rootClass}>
                <span className="genome-row-control-label">{label}</span>
                <span className="genome-row-control-canonical">
                    <AlertCircle size={12} />
                    canonical — read-only
                </span>
            </div>
        );
    }

    // The current genome may be a row that isn't in the INSTALLED dropdown
    // (edge case: bundle uninstalled under foot). Render its current value
    // as a passthrough option so the select doesn't snap to a different
    // row without a user gesture.
    const currentNotInList = !!genomeId && !options.some((m) => m.id === genomeId);

    return (
        <div className={rootClass}>
            <span className="genome-row-control-label">{label}</span>
            <select
                className="genome-row-control-select"
                value={genomeId ?? ''}
                onChange={(e) => {
                    if (e.target.value) handleChange(e.target.value);
                }}
                disabled={disabled || isSaving}
                title={genomeSlug ? `Current bundle: ${genomeSlug}` : undefined}
            >
                {currentNotInList && (
                    <option value={genomeId as string}>
                        {genomeSlug ?? genomeId}
                    </option>
                )}
                {options.map((m) => (
                    <option key={m.id} value={m.id}>
                        {m.slug} — {m.name}
                    </option>
                ))}
            </select>
            {genomeSlug && (
                <span className="genome-row-control-slug" title="Current bundle (read-only mirror)">
                    {genomeSlug}
                </span>
            )}
            {error && (
                <span className="genome-row-control-error" role="alert" title={error}>
                    <AlertCircle size={12} />
                    {error}
                </span>
            )}
        </div>
    );
}

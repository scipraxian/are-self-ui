import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, Trash2, Upload, X } from 'lucide-react';

import { apiFetch } from '../api';
import {
    AvatarApiError,
    createAvatar,
    deleteAvatar,
    listAvatars,
    patchAvatarGenome,
} from '../avatarApi';
import { GENOME } from './genomeConstants';
import {
    maybeFlagRestart,
    useRestartOverlay,
} from '../context/RestartOverlayProvider';
import { useDendrite } from './SynapticCleft';
import { AVATAR_DISPLAY, type Avatar, type NeuralModifierSummary } from '../types';
import { AvatarTile } from './AvatarTile';
import './AvatarPicker.css';

interface AvatarPickerProps {
    open: boolean;
    onClose: () => void;
    /** Called with the picked or just-created avatar. Caller persists the FK. */
    onPick: (avatar: Avatar) => void;
    /** Composite vector for previewing GENERATED tiles in the picker grid. */
    compositeVector?: number[] | null;
}

type PickerTab = 'catalog' | 'upload' | 'url' | 'emoji';

const STATUS_INSTALLED = 2;

export function AvatarPicker({
    open,
    onClose,
    onPick,
    compositeVector,
}: AvatarPickerProps) {
    const { triggerRestart } = useRestartOverlay();
    const [tab, setTab] = useState<PickerTab>('catalog');

    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [modifiers, setModifiers] = useState<NeuralModifierSummary[]>([]);
    const [genomeFilter, setGenomeFilter] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [promoteFor, setPromoteFor] = useState<Avatar | null>(null);
    const [promoteBusy, setPromoteBusy] = useState(false);
    const [promoteError, setPromoteError] = useState<string | null>(null);

    const avatarEvent = useDendrite('Avatar', null);
    const modifierEvent = useDendrite('NeuralModifier', null);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setIsLoading(true);
        setError(null);

        const load = async () => {
            try {
                const [avatarList, modRes] = await Promise.all([
                    listAvatars(),
                    apiFetch('/api/v2/neural-modifiers/'),
                ]);
                if (cancelled) return;
                setAvatars(avatarList);
                if (modRes.ok) {
                    const data = await modRes.json();
                    if (cancelled) return;
                    const list: NeuralModifierSummary[] = Array.isArray(data) ? data : data.results ?? [];
                    setModifiers(list);
                }
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : String(err));
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [open, avatarEvent, modifierEvent]);

    const installedNonCanonical = useMemo(
        () => modifiers.filter(m => m.id !== GENOME.CANONICAL && m.status_id === STATUS_INSTALLED),
        [modifiers],
    );

    const workspaceBundle = useMemo(
        () => installedNonCanonical.find(m => m.selected_for_edit === true) ?? null,
        [installedNonCanonical],
    );

    const filteredAvatars = useMemo(() => {
        if (!genomeFilter) return avatars;
        return avatars.filter(a => a.genome === genomeFilter);
    }, [avatars, genomeFilter]);

    const refreshAvatars = async () => {
        const list = await listAvatars();
        setAvatars(list);
    };

    const handlePromote = async (avatar: Avatar, targetGenomeId: string) => {
        setPromoteBusy(true);
        setPromoteError(null);
        try {
            const updated = await patchAvatarGenome(avatar.id, targetGenomeId);
            maybeFlagRestart(updated, triggerRestart);
            setAvatars(prev => prev.map(a => a.id === avatar.id ? updated : a));
            setPromoteFor(null);
        } catch (err) {
            if (err instanceof AvatarApiError) {
                setPromoteError(err.detail);
            } else {
                setPromoteError(err instanceof Error ? err.message : String(err));
            }
        } finally {
            setPromoteBusy(false);
        }
    };

    const handleDelete = async (avatar: Avatar) => {
        try {
            await deleteAvatar(avatar.id);
            setAvatars(prev => prev.filter(a => a.id !== avatar.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    if (!open) return null;

    return (
        <div className="avatar-picker-overlay" role="presentation">
            <div className="avatar-picker-dialog" role="dialog" aria-modal="true" aria-label="Pick or create an avatar">
                <header className="avatar-picker-header">
                    <h2 className="avatar-picker-title">Avatar</h2>
                    <button
                        type="button"
                        className="avatar-picker-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </header>

                <nav className="avatar-picker-tabs" aria-label="Avatar source">
                    {(['catalog', 'upload', 'url', 'emoji'] as PickerTab[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            className={`avatar-picker-tab${tab === t ? ' avatar-picker-tab--active' : ''}`}
                            onClick={() => setTab(t)}
                        >
                            {t === 'catalog' ? 'Bundle catalog'
                                : t === 'upload' ? 'Upload'
                                : t === 'url' ? 'URL'
                                : 'Emoji'}
                        </button>
                    ))}
                </nav>

                {error && (
                    <div className="avatar-picker-error" role="alert">
                        <AlertCircle size={12} /> {error}
                    </div>
                )}

                {tab === 'catalog' && (
                    <CatalogTab
                        isLoading={isLoading}
                        avatars={filteredAvatars}
                        modifiers={modifiers}
                        genomeFilter={genomeFilter}
                        setGenomeFilter={setGenomeFilter}
                        compositeVector={compositeVector}
                        onPick={(a) => { onPick(a); onClose(); }}
                        onPromote={setPromoteFor}
                        onDelete={handleDelete}
                    />
                )}

                {tab === 'upload' && (
                    <UploadTab
                        workspaceBundle={workspaceBundle}
                        onCreated={async (a) => {
                            await refreshAvatars();
                            onPick(a);
                            onClose();
                        }}
                    />
                )}

                {tab === 'url' && (
                    <UrlTab onCreated={async (a) => {
                        await refreshAvatars();
                        onPick(a);
                        onClose();
                    }} />
                )}

                {tab === 'emoji' && (
                    <EmojiTab onCreated={async (a) => {
                        await refreshAvatars();
                        onPick(a);
                        onClose();
                    }} />
                )}

                {promoteFor && (
                    <PromoteDialog
                        avatar={promoteFor}
                        installedBundles={installedNonCanonical}
                        onClose={() => { setPromoteFor(null); setPromoteError(null); }}
                        onSubmit={(target) => handlePromote(promoteFor, target)}
                        busy={promoteBusy}
                        error={promoteError}
                    />
                )}
            </div>
        </div>
    );
}

interface CatalogTabProps {
    isLoading: boolean;
    avatars: Avatar[];
    modifiers: NeuralModifierSummary[];
    genomeFilter: string | null;
    setGenomeFilter: (v: string | null) => void;
    compositeVector: number[] | null | undefined;
    onPick: (a: Avatar) => void;
    onPromote: (a: Avatar) => void;
    onDelete: (a: Avatar) => void;
}

function CatalogTab({
    isLoading,
    avatars,
    modifiers,
    genomeFilter,
    setGenomeFilter,
    compositeVector,
    onPick,
    onPromote,
    onDelete,
}: CatalogTabProps) {
    return (
        <div className="avatar-picker-body">
            <div className="avatar-picker-filter-chips">
                <button
                    type="button"
                    className={`avatar-picker-chip${genomeFilter === null ? ' avatar-picker-chip--active' : ''}`}
                    onClick={() => setGenomeFilter(null)}
                >
                    All bundles
                </button>
                {modifiers.map(m => (
                    <button
                        key={m.id}
                        type="button"
                        className={`avatar-picker-chip${genomeFilter === m.id ? ' avatar-picker-chip--active' : ''}`}
                        onClick={() => setGenomeFilter(m.id)}
                        title={m.slug}
                    >
                        {m.slug}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="avatar-picker-loading">
                    <Loader2 size={16} className="animate-spin" /> Loading avatars…
                </div>
            ) : avatars.length === 0 ? (
                <div className="avatar-picker-empty">No avatars in this bundle.</div>
            ) : (
                <ul className="avatar-picker-grid">
                    {avatars.map(a => (
                        <li key={a.id} className="avatar-picker-grid-item">
                            <AvatarTile
                                avatar={a}
                                compositeVector={compositeVector}
                                size={72}
                                onClick={() => onPick(a)}
                                title={`${a.name} · ${a.display.name} · ${a.genome_slug ?? ''}`}
                            />
                            <div className="avatar-picker-grid-meta">
                                <span className="avatar-picker-grid-name">{a.name}</span>
                                <span className="avatar-picker-grid-bundle">{a.genome_slug}</span>
                            </div>
                            <div className="avatar-picker-grid-actions">
                                <button
                                    type="button"
                                    className="avatar-picker-mini-btn"
                                    onClick={() => onPromote(a)}
                                    title="Promote to a different bundle"
                                    disabled={a.genome === GENOME.CANONICAL}
                                >
                                    <ArrowRight size={12} /> Promote
                                </button>
                                <button
                                    type="button"
                                    className="avatar-picker-mini-btn avatar-picker-mini-btn--danger"
                                    onClick={() => onDelete(a)}
                                    title="Delete avatar"
                                    disabled={a.genome === GENOME.CANONICAL}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

interface UploadTabProps {
    workspaceBundle: NeuralModifierSummary | null;
    onCreated: (a: Avatar) => void | Promise<void>;
}

function UploadTab({ workspaceBundle, onCreated }: UploadTabProps) {
    const [file, setFile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async () => {
        if (!file || !name.trim()) return;
        setBusy(true);
        setErr(null);
        try {
            const created = await createAvatar({
                name: name.trim(),
                description: description.trim() || undefined,
                display: AVATAR_DISPLAY.FILE,
                image: file,
            });
            await onCreated(created);
        } catch (e) {
            setErr(e instanceof AvatarApiError ? e.detail : String(e));
        } finally {
            setBusy(false);
        }
    };

    if (!workspaceBundle) {
        return (
            <div className="avatar-picker-body avatar-picker-gate">
                <AlertCircle size={20} />
                <p>
                    Uploads land in your active workspace genome. There isn't one selected
                    right now — pick a non-canonical genome from Genomes first.
                </p>
                <Link to="/neuroplasticity" className="avatar-picker-action">
                    Open Genomes
                </Link>
            </div>
        );
    }

    return (
        <div className="avatar-picker-body avatar-picker-form">
            <p className="avatar-picker-hint">
                Bytes will land in <code>{workspaceBundle.slug}</code>.
            </p>
            <label className="avatar-picker-field">
                <span>Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Avatar name"
                />
            </label>
            <label className="avatar-picker-field">
                <span>Description</span>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="(optional)"
                />
            </label>
            <label className="avatar-picker-field">
                <span>Image</span>
                <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
            </label>
            {err && <div className="avatar-picker-error" role="alert"><AlertCircle size={12} /> {err}</div>}
            <div className="avatar-picker-actions">
                <button
                    type="button"
                    className="avatar-picker-action"
                    onClick={submit}
                    disabled={busy || !file || !name.trim()}
                >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    Upload
                </button>
            </div>
        </div>
    );
}

interface SimpleCreateProps {
    onCreated: (a: Avatar) => void | Promise<void>;
}

function UrlTab({ onCreated }: SimpleCreateProps) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async () => {
        if (!name.trim() || !url.trim()) return;
        setBusy(true);
        setErr(null);
        try {
            const created = await createAvatar({
                name: name.trim(),
                display: AVATAR_DISPLAY.URL,
                url: url.trim(),
            });
            await onCreated(created);
        } catch (e) {
            setErr(e instanceof AvatarApiError ? e.detail : String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="avatar-picker-body avatar-picker-form">
            <label className="avatar-picker-field">
                <span>Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Avatar name"
                />
            </label>
            <label className="avatar-picker-field">
                <span>URL</span>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://..."
                />
            </label>
            {url && (
                <div className="avatar-picker-preview">
                    <img src={url} alt="preview" referrerPolicy="no-referrer" />
                </div>
            )}
            {err && <div className="avatar-picker-error" role="alert"><AlertCircle size={12} /> {err}</div>}
            <div className="avatar-picker-actions">
                <button
                    type="button"
                    className="avatar-picker-action"
                    onClick={submit}
                    disabled={busy || !name.trim() || !url.trim()}
                >
                    {busy && <Loader2 size={12} className="animate-spin" />}
                    Save URL avatar
                </button>
            </div>
        </div>
    );
}

function EmojiTab({ onCreated }: SimpleCreateProps) {
    const [name, setName] = useState('');
    const [emoji, setEmoji] = useState('');
    const [tint, setTint] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const submit = async () => {
        if (!name.trim() || !emoji.trim()) return;
        setBusy(true);
        setErr(null);
        try {
            const created = await createAvatar({
                name: name.trim(),
                display: AVATAR_DISPLAY.EMOJI,
                emoji: emoji,
                tint_color: tint.trim() || undefined,
            });
            await onCreated(created);
        } catch (e) {
            setErr(e instanceof AvatarApiError ? e.detail : String(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="avatar-picker-body avatar-picker-form">
            <label className="avatar-picker-field">
                <span>Name</span>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Avatar name"
                />
            </label>
            <label className="avatar-picker-field">
                <span>Emoji</span>
                <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="🦊  or  👨‍👩‍👧‍👦"
                />
            </label>
            <label className="avatar-picker-field">
                <span>Tint</span>
                <input
                    type="color"
                    value={tint || '#000000'}
                    onChange={(e) => setTint(e.target.value)}
                />
            </label>
            {emoji && (
                <div
                    className="avatar-picker-emoji-preview"
                    style={{ backgroundColor: tint || 'transparent' }}
                >
                    {emoji}
                </div>
            )}
            {err && <div className="avatar-picker-error" role="alert"><AlertCircle size={12} /> {err}</div>}
            <div className="avatar-picker-actions">
                <button
                    type="button"
                    className="avatar-picker-action"
                    onClick={submit}
                    disabled={busy || !name.trim() || !emoji.trim()}
                >
                    {busy && <Loader2 size={12} className="animate-spin" />}
                    Save emoji avatar
                </button>
            </div>
        </div>
    );
}

interface PromoteDialogProps {
    avatar: Avatar;
    installedBundles: NeuralModifierSummary[];
    onClose: () => void;
    onSubmit: (targetGenomeId: string) => void;
    busy: boolean;
    error: string | null;
}

function PromoteDialog({
    avatar,
    installedBundles,
    onClose,
    onSubmit,
    busy,
    error,
}: PromoteDialogProps) {
    const [target, setTarget] = useState<string>('');
    const options = installedBundles.filter(b => b.id !== avatar.genome);

    return (
        <div className="avatar-picker-promote-overlay" role="presentation">
            <div className="avatar-picker-promote-dialog" role="dialog" aria-modal="true">
                <h3>Promote {avatar.name}</h3>
                <p className="avatar-picker-hint">
                    Currently in <code>{avatar.genome_slug}</code>. Bytes will physically
                    move to the new bundle on save. Workers will restart.
                </p>
                <select
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="avatar-picker-promote-select"
                >
                    <option value="">— Pick destination —</option>
                    {options.map(b => (
                        <option key={b.id} value={b.id}>{b.slug} — {b.name}</option>
                    ))}
                </select>
                {error && (
                    <div className="avatar-picker-error" role="alert">
                        <AlertCircle size={12} /> {error}
                    </div>
                )}
                <div className="avatar-picker-actions">
                    <button type="button" className="avatar-picker-action" onClick={onClose} disabled={busy}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="avatar-picker-action avatar-picker-action--primary"
                        onClick={() => target && onSubmit(target)}
                        disabled={busy || !target}
                    >
                        {busy && <Loader2 size={12} className="animate-spin" />}
                        Promote
                    </button>
                </div>
            </div>
        </div>
    );
}

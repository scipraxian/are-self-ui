import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Loader2, Plus, Search, Unlink, X } from 'lucide-react';
import { apiFetch } from '../api';
import './EngramEditor.css';

interface EngramTag {
    id: number;
    name: string;
}

interface EngramSession {
    id: string;
}

interface EngramSpike {
    id: string;
}

interface EngramCreator {
    id: number | string;
    name: string;
}

interface Engram {
    id: number | string;
    name: string;
    description: string;
    is_active: boolean;
    relevance_score: number;
    tags: EngramTag[];
    sessions: EngramSession[] | string[];
    spikes: EngramSpike[] | string[];
    creator: EngramCreator | null;
    identity_discs: (number | string)[];
    created?: string;
}

interface EngramEditorProps {
    discId: number | string;
}

export const EngramEditor = ({ discId }: EngramEditorProps) => {
    const [engrams, setEngrams] = useState<Engram[]>([]);
    const [allTags, setAllTags] = useState<EngramTag[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    const [savingId, setSavingId] = useState<string | number | null>(null);

    // Create form state
    const [showCreate, setShowCreate] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createDesc, setCreateDesc] = useState('');
    const [createRelevance, setCreateRelevance] = useState('1.0');
    const [createTagIds, setCreateTagIds] = useState<number[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    // Inline edit state
    const [editingField, setEditingField] = useState<{ engramId: string | number; field: string } | null>(null);
    const [editValue, setEditValue] = useState('');

    // New tag input state per engram
    const [newTagInput, setNewTagInput] = useState<Record<string | number, string>>({});

    // Attach existing engram state
    const [showAttach, setShowAttach] = useState(false);
    const [attachResults, setAttachResults] = useState<Engram[]>([]);
    const [attachSearch, setAttachSearch] = useState('');
    const [attachLoading, setAttachLoading] = useState(false);
    const [attachingId, setAttachingId] = useState<string | number | null>(null);

    // Fetch full engrams for this disc + all tags
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [engramRes, tagRes] = await Promise.all([
                    apiFetch(`/api/v2/engrams/?identity_discs=${discId}`),
                    apiFetch('/api/v2/engram_tags/'),
                ]);

                if (cancelled) return;

                if (engramRes.ok) {
                    const data = await engramRes.json();
                    if (!cancelled) setEngrams(data.results ?? data);
                }

                if (tagRes.ok) {
                    const data = await tagRes.json();
                    if (!cancelled) setAllTags(data.results ?? data);
                }
            } catch (err) {
                console.error('Failed to fetch engrams', err);
            } finally {
                if (!cancelled) setIsLoaded(true);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [discId]);

    const patchEngram = async (engramId: string | number, payload: Record<string, unknown>) => {
        setSavingId(engramId);
        try {
            const res = await apiFetch(`/api/v2/engrams/${engramId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Patch failed (${res.status})`);
            const updated: Engram = await res.json();
            setEngrams(prev => prev.map(e => e.id === engramId ? updated : e));
        } catch (err) {
            console.error('Engram patch failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleToggleActive = (engram: Engram) => {
        patchEngram(engram.id, { is_active: !engram.is_active });
    };

    const handleBlurField = (engram: Engram, field: 'name' | 'description' | 'relevance_score') => {
        setEditingField(null);
        if (field === 'relevance_score') {
            const num = parseFloat(editValue);
            if (isNaN(num) || num === engram.relevance_score) return;
            const clamped = Math.min(Math.max(num, 0), 1);
            patchEngram(engram.id, { relevance_score: clamped });
        } else {
            if (editValue === engram[field]) return;
            patchEngram(engram.id, { [field]: editValue });
        }
    };

    const handleTagToggle = (engram: Engram, tagId: number) => {
        const currentIds = engram.tags.map(t => t.id);
        const nextIds = currentIds.includes(tagId)
            ? currentIds.filter(id => id !== tagId)
            : [...currentIds, tagId];
        patchEngram(engram.id, { tags: nextIds });
    };

    const handleNewTag = async (engram: Engram) => {
        const tagName = (newTagInput[engram.id] ?? '').trim();
        if (!tagName) return;

        try {
            // Create the tag
            const res = await apiFetch('/api/v2/engram_tags/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tagName }),
            });
            if (!res.ok) throw new Error(`Tag create failed (${res.status})`);
            const newTag: EngramTag = await res.json();

            // Refresh all tags
            setAllTags(prev => [...prev, newTag]);

            // Add new tag to this engram
            const nextIds = [...engram.tags.map(t => t.id), newTag.id];
            await patchEngram(engram.id, { tags: nextIds });

            setNewTagInput(prev => ({ ...prev, [engram.id]: '' }));
        } catch (err) {
            console.error('Failed to create tag', err);
        }
    };

    const handleDetach = async (engram: Engram) => {
        const nextDiscs = engram.identity_discs.filter(d => String(d) !== String(discId));
        setSavingId(engram.id);
        try {
            const res = await apiFetch(`/api/v2/engrams/${engram.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity_discs: nextDiscs }),
            });
            if (!res.ok) throw new Error(`Detach failed (${res.status})`);
            setEngrams(prev => prev.filter(e => e.id !== engram.id));
        } catch (err) {
            console.error('Detach failed', err);
        } finally {
            setSavingId(null);
        }
    };

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            const res = await apiFetch('/api/v2/engrams/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: createName.trim(),
                    description: createDesc.trim(),
                    relevance_score: parseFloat(createRelevance) || 1.0,
                    tags: createTagIds,
                    identity_discs: [discId],
                }),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created: Engram = await res.json();
            setEngrams(prev => [created, ...prev]);
            setShowCreate(false);
            setCreateName('');
            setCreateDesc('');
            setCreateRelevance('1.0');
            setCreateTagIds([]);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create engram.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleOpenAttach = async () => {
        setShowAttach(true);
        setAttachSearch('');
        setAttachLoading(true);
        try {
            const res = await apiFetch('/api/v2/engrams/');
            if (!res.ok) return;
            const data = await res.json();
            const all: Engram[] = data.results ?? data;
            const currentIds = new Set(engrams.map(e => String(e.id)));
            setAttachResults(all.filter(e => !currentIds.has(String(e.id))));
        } catch (err) {
            console.error('Failed to fetch engrams for attach', err);
        } finally {
            setAttachLoading(false);
        }
    };

    const handleAttach = async (engram: Engram) => {
        setAttachingId(engram.id);
        try {
            const nextDiscs = [...engram.identity_discs, discId];
            const res = await apiFetch(`/api/v2/engrams/${engram.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity_discs: nextDiscs }),
            });
            if (!res.ok) throw new Error(`Attach failed (${res.status})`);
            const updated: Engram = await res.json();
            setEngrams(prev => [updated, ...prev]);
            setAttachResults(prev => prev.filter(e => e.id !== engram.id));
        } catch (err) {
            console.error('Attach failed', err);
        } finally {
            setAttachingId(null);
        }
    };

    const filteredAttachResults = attachSearch.trim()
        ? attachResults.filter(e =>
            e.name.toLowerCase().includes(attachSearch.toLowerCase()) ||
            e.description?.toLowerCase().includes(attachSearch.toLowerCase())
        )
        : attachResults;

    const getSessionIds = (engram: Engram): string[] => {
        if (!engram.sessions?.length) return [];
        return engram.sessions.map(s => typeof s === 'string' ? s : s.id);
    };

    const getSpikeIds = (engram: Engram): string[] => {
        if (!engram.spikes?.length) return [];
        return engram.spikes.map(s => typeof s === 'string' ? s : s.id);
    };

    // Use fetched engrams if loaded, otherwise fall back to initial data shape
    const displayEngrams = isLoaded ? engrams : [];

    if (!isLoaded) {
        return (
            <div className="engram-editor">
                <div className="engram-empty">
                    <Loader2 className="animate-spin" size={16} />
                </div>
            </div>
        );
    }

    return (
        <div className="engram-editor">
            {/* Action buttons */}
            {!showCreate && !showAttach ? (
                <div className="engram-action-bar">
                    <button
                        type="button"
                        className="engram-create-toggle"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus size={14} /> New Memory
                    </button>
                    <button
                        type="button"
                        className="engram-create-toggle engram-attach-toggle"
                        onClick={handleOpenAttach}
                    >
                        <Link2 size={14} /> Attach Existing
                    </button>
                </div>
            ) : showAttach ? (
                <div className="engram-attach-panel">
                    <div className="engram-attach-header">
                        <div className="engram-attach-search-row">
                            <Search size={14} />
                            <input
                                className="engram-create-input engram-attach-search"
                                type="text"
                                placeholder="Search engrams..."
                                value={attachSearch}
                                onChange={e => setAttachSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="button"
                            className="engram-attach-close"
                            onClick={() => setShowAttach(false)}
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="engram-attach-list">
                        {attachLoading ? (
                            <div className="engram-empty"><Loader2 className="animate-spin" size={16} /></div>
                        ) : filteredAttachResults.length === 0 ? (
                            <div className="engram-empty">No unlinked engrams found.</div>
                        ) : (
                            filteredAttachResults.map(engram => (
                                <div key={engram.id} className="engram-attach-card">
                                    <div className="engram-attach-card-info">
                                        <span className="engram-attach-card-name">{engram.name || 'Untitled'}</span>
                                        {engram.description && (
                                            <span className="engram-attach-card-desc">{engram.description}</span>
                                        )}
                                        {engram.tags.length > 0 && (
                                            <div className="engram-card-tags">
                                                {engram.tags.map(t => (
                                                    <span key={t.id} className="engram-tag-pill engram-tag-pill-active">{t.name}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-primary engram-attach-btn"
                                        onClick={() => handleAttach(engram)}
                                        disabled={attachingId === engram.id}
                                    >
                                        {attachingId === engram.id ? <Loader2 className="animate-spin" size={12} /> : 'Attach'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ) : showCreate ? (
                <div className="engram-create-form">
                    <div>
                        <div className="engram-create-field-label">Name</div>
                        <input
                            className="engram-create-input"
                            type="text"
                            value={createName}
                            onChange={e => setCreateName(e.target.value)}
                            placeholder="Engram name..."
                            autoFocus
                        />
                    </div>
                    <div>
                        <div className="engram-create-field-label">Description</div>
                        <textarea
                            className="engram-create-textarea"
                            value={createDesc}
                            onChange={e => setCreateDesc(e.target.value)}
                            placeholder="The fact or memory..."
                        />
                    </div>
                    <div>
                        <div className="engram-create-field-label">Relevance (0.0–1.0)</div>
                        <input
                            className="engram-create-relevance"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={createRelevance}
                            onChange={e => setCreateRelevance(e.target.value)}
                        />
                    </div>
                    {allTags.length > 0 && (
                        <div>
                            <div className="engram-create-field-label">Tags</div>
                            <div className="engram-card-tags">
                                {allTags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`engram-tag-pill ${createTagIds.includes(tag.id) ? 'engram-tag-pill-active' : ''}`}
                                        onClick={() => setCreateTagIds(prev =>
                                            prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                                        )}
                                    >
                                        {tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {createError && (
                        <span className="font-mono text-xs" style={{ color: 'var(--accent-red)' }}>{createError}</span>
                    )}
                    <div className="engram-create-form-actions">
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleCreate}
                            disabled={isCreating || !createName.trim()}
                        >
                            {isCreating ? <Loader2 className="animate-spin" size={12} /> : 'Create'}
                        </button>
                        <button
                            type="button"
                            className="btn-secondary-outline"
                            onClick={() => { setShowCreate(false); setCreateError(null); }}
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Engram card list */}
            {displayEngrams.length === 0 ? (
                <div className="engram-empty">No memories linked to this Disc yet.</div>
            ) : (
                <div className="engram-card-list">
                    {displayEngrams.map(engram => {
                        const isSaving = savingId === engram.id;
                        const sessionIds = getSessionIds(engram);
                        const spikeIds = getSpikeIds(engram);

                        return (
                            <div
                                key={engram.id}
                                className={`engram-card ${!engram.is_active ? 'engram-card-inactive' : ''}`}
                            >
                                {/* Header: title + controls */}
                                <div className="engram-card-header">
                                    {editingField?.engramId === engram.id && editingField.field === 'name' ? (
                                        <input
                                            className="engram-card-title-input"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onBlur={() => handleBlurField(engram, 'name')}
                                            onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="engram-card-title"
                                            onClick={() => { setEditingField({ engramId: engram.id, field: 'name' }); setEditValue(engram.name); }}
                                        >
                                            {engram.name || 'Untitled'}
                                        </span>
                                    )}

                                    <div className="engram-card-controls">
                                        {isSaving && <span className="engram-saving">saving...</span>}

                                        <div className="engram-card-relevance">
                                            <span className="engram-card-relevance-label">Rel</span>
                                            {editingField?.engramId === engram.id && editingField.field === 'relevance_score' ? (
                                                <input
                                                    className="engram-card-relevance-input"
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    max="1"
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => handleBlurField(engram, 'relevance_score')}
                                                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                                    autoFocus
                                                />
                                            ) : (
                                                <span
                                                    className="engram-card-relevance-input"
                                                    onClick={() => { setEditingField({ engramId: engram.id, field: 'relevance_score' }); setEditValue(String(engram.relevance_score)); }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {engram.relevance_score?.toFixed(1) ?? '1.0'}
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            className={`engram-toggle ${engram.is_active ? 'engram-toggle-active' : ''}`}
                                            onClick={() => handleToggleActive(engram)}
                                            title={engram.is_active ? 'Active' : 'Inactive'}
                                        >
                                            <span className="engram-toggle-knob" />
                                        </button>
                                    </div>
                                </div>

                                {/* Description */}
                                {editingField?.engramId === engram.id && editingField.field === 'description' ? (
                                    <textarea
                                        className="engram-card-description-input"
                                        value={editValue}
                                        onChange={e => setEditValue(e.target.value)}
                                        onBlur={() => handleBlurField(engram, 'description')}
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={`engram-card-description ${!engram.description ? 'engram-card-description-empty' : ''}`}
                                        onClick={() => { setEditingField({ engramId: engram.id, field: 'description' }); setEditValue(engram.description ?? ''); }}
                                    >
                                        {engram.description || 'Click to add description...'}
                                    </div>
                                )}

                                {/* Tags */}
                                <div className="engram-card-tags">
                                    {allTags.map(tag => {
                                        const isOn = engram.tags.some(t => t.id === tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                className={`engram-tag-pill ${isOn ? 'engram-tag-pill-active' : ''}`}
                                                onClick={() => handleTagToggle(engram, tag.id)}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                    <div className="engram-tag-add">
                                        <input
                                            className="engram-tag-add-input"
                                            placeholder="+ tag"
                                            value={newTagInput[engram.id] ?? ''}
                                            onChange={e => setNewTagInput(prev => ({ ...prev, [engram.id]: e.target.value }))}
                                            onKeyDown={e => { if (e.key === 'Enter') handleNewTag(engram); }}
                                        />
                                    </div>
                                </div>

                                {/* Provenance */}
                                {(engram.creator || sessionIds.length > 0 || spikeIds.length > 0) && (
                                    <div className="engram-card-provenance">
                                        {engram.creator && (
                                            <span className="engram-provenance-chip">
                                                Creator: {engram.creator.name}
                                            </span>
                                        )}
                                        {sessionIds.length > 0 && (
                                            <span className="engram-provenance-chip">
                                                Sessions:{' '}
                                                {sessionIds.map((sid, i) => (
                                                    <span key={sid}>
                                                        {i > 0 && ', '}
                                                        <Link className="engram-provenance-link" to={`/frontal/${sid}`}>
                                                            {String(sid).slice(0, 8)}
                                                        </Link>
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                        {spikeIds.length > 0 && (
                                            <span className="engram-provenance-chip">
                                                Spikes:{' '}
                                                {spikeIds.map((sid, i) => (
                                                    <span key={sid}>
                                                        {i > 0 && ', '}
                                                        <Link className="engram-provenance-link" to={`/cns/spike/${sid}`}>
                                                            {String(sid).slice(0, 8)}
                                                        </Link>
                                                    </span>
                                                ))}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Detach */}
                                <div className="engram-card-footer">
                                    <button
                                        type="button"
                                        className="engram-detach-btn"
                                        onClick={() => handleDetach(engram)}
                                    >
                                        <Unlink size={10} /> Detach
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { ThreePanel } from '../components/ThreePanel';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { apiFetch } from '../api';
import './HippocampusPage.css';

interface EngramTag {
    id: number;
    name: string;
}

interface EngramCreator {
    id: number | string;
    name: string;
}

interface EngramSession {
    id: string;
}

interface EngramSpike {
    id: string;
}

interface Engram {
    id: number | string;
    name: string;
    description: string;
    is_active: boolean;
    relevance_score: number;
    tags: EngramTag[];
    creator: EngramCreator | null;
    identity_discs: (number | string)[];
    sessions: EngramSession[] | string[];
    spikes: EngramSpike[] | string[];
    source_turns: unknown[];
    created?: string;
    modified?: string;
}

type ActiveFilter = 'active' | 'all' | 'inactive';

export function HippocampusPage() {
    const { setCrumbs } = useBreadcrumbs();
    const [searchParams, setSearchParams] = useSearchParams();

    const selectedId = searchParams.get('selected');

    const [engrams, setEngrams] = useState<Engram[]>([]);
    const [allTags, setAllTags] = useState<EngramTag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

    // Inspector edit state
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editRelevance, setEditRelevance] = useState('');
    const [newTagInput, setNewTagInput] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([{
            label: 'Hippocampus',
            path: '/hippocampus',
            tip: 'The Hippocampus stores engrams — vector-embedded memories with provenance, tags, and relevance scores.',
            doc: 'docs/brain-regions/hippocampus',
        }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    // Real-time updates
    const engramEvent = useDendrite('Engram', null);

    // Fetch engrams + tags
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const [engramRes, tagRes] = await Promise.all([
                    apiFetch('/api/v2/engrams/'),
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
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [engramEvent]);

    // Filtered engrams
    const filtered = useMemo(() => {
        let list = engrams;

        // Active filter
        if (activeFilter === 'active') list = list.filter(e => e.is_active);
        else if (activeFilter === 'inactive') list = list.filter(e => !e.is_active);

        // Tag filter (AND)
        if (selectedTagIds.length > 0) {
            list = list.filter(e =>
                selectedTagIds.every(tid => e.tags.some(t => t.id === tid))
            );
        }

        // Search
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                e.name.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q)
            );
        }

        return list;
    }, [engrams, activeFilter, selectedTagIds, search]);

    // Selected engram
    const selected = useMemo(
        () => engrams.find(e => String(e.id) === selectedId) ?? null,
        [engrams, selectedId]
    );

    // Sync inspector fields when selection changes
    useEffect(() => {
        if (selected) {
            setEditName(selected.name);
            setEditDesc(selected.description);
            setEditRelevance(String(selected.relevance_score));
            setConfirmDelete(false);
            setNewTagInput('');
        }
    }, [selected]);

    const selectEngram = (id: string | number) => {
        setSearchParams({ selected: String(id) });
    };

    const clearSelection = () => {
        setSearchParams({});
    };

    // PATCH helper
    const patchEngram = async (engramId: string | number, payload: Record<string, unknown>, fieldKey?: string) => {
        if (fieldKey) setSavingField(fieldKey);
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
            setSavingField(null);
        }
    };

    const handleBlurName = () => {
        if (!selected || editName === selected.name) return;
        patchEngram(selected.id, { name: editName }, 'name');
    };

    const handleBlurDesc = () => {
        if (!selected || editDesc === selected.description) return;
        patchEngram(selected.id, { description: editDesc }, 'description');
    };

    const handleBlurRelevance = () => {
        if (!selected) return;
        const num = parseFloat(editRelevance);
        if (isNaN(num) || num === selected.relevance_score) return;
        const clamped = Math.min(Math.max(num, 0), 1);
        patchEngram(selected.id, { relevance_score: clamped }, 'relevance');
    };

    const handleToggleActive = () => {
        if (!selected) return;
        patchEngram(selected.id, { is_active: !selected.is_active }, 'active');
    };

    const handleTagToggle = (tagId: number) => {
        if (!selected) return;
        const currentIds = selected.tags.map(t => t.id);
        const nextIds = currentIds.includes(tagId)
            ? currentIds.filter(id => id !== tagId)
            : [...currentIds, tagId];
        patchEngram(selected.id, { tags: nextIds }, 'tags');
    };

    const handleNewTag = async () => {
        if (!selected || !newTagInput.trim()) return;
        try {
            const res = await apiFetch('/api/v2/engram_tags/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newTagInput.trim() }),
            });
            if (!res.ok) throw new Error(`Tag create failed (${res.status})`);
            const newTag: EngramTag = await res.json();
            setAllTags(prev => [...prev, newTag]);
            const nextIds = [...selected.tags.map(t => t.id), newTag.id];
            await patchEngram(selected.id, { tags: nextIds }, 'tags');
            setNewTagInput('');
        } catch (err) {
            console.error('Failed to create tag', err);
        }
    };

    const handleDelete = async () => {
        if (!selected) return;
        try {
            const res = await apiFetch(`/api/v2/engrams/${selected.id}/`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`Delete failed (${res.status})`);
            setEngrams(prev => prev.filter(e => e.id !== selected.id));
            clearSelection();
        } catch (err) {
            console.error('Engram delete failed', err);
        }
    };

    const toggleFilterTag = (tagId: number) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    };

    const getSessionIds = (engram: Engram): string[] => {
        if (!engram.sessions?.length) return [];
        return engram.sessions.map(s => typeof s === 'string' ? s : s.id);
    };

    const getSpikeIds = (engram: Engram): string[] => {
        if (!engram.spikes?.length) return [];
        return engram.spikes.map(s => typeof s === 'string' ? s : s.id);
    };

    const formatDate = (iso?: string) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    // --- LEFT PANEL ---
    const leftPanel = (
        <div className="hippocampus-filters">
            <input
                className="hippocampus-search"
                type="text"
                placeholder="Search engrams..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />

            <div className="hippocampus-filter-section">
                <span className="hippocampus-filter-label">Status</span>
                <div className="hippocampus-active-toggle">
                    {(['active', 'all', 'inactive'] as ActiveFilter[]).map(f => (
                        <button
                            key={f}
                            type="button"
                            className={`hippocampus-active-btn ${activeFilter === f ? 'hippocampus-active-btn-selected' : ''}`}
                            onClick={() => setActiveFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {allTags.length > 0 && (
                <div className="hippocampus-filter-section">
                    <span className="hippocampus-filter-label">Tags</span>
                    <div className="hippocampus-tag-chips">
                        {allTags.map(tag => (
                            <button
                                key={tag.id}
                                type="button"
                                className={`hippocampus-tag-chip ${selectedTagIds.includes(tag.id) ? 'hippocampus-tag-chip-selected' : ''}`}
                                onClick={() => toggleFilterTag(tag.id)}
                            >
                                {tag.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="hippocampus-count">
                Showing {filtered.length} of {engrams.length} engrams
            </div>
        </div>
    );

    // --- CENTER PANEL ---
    const centerPanel = (
        <div className="hippocampus-list">
            {isLoading ? (
                <div className="hippocampus-empty">Loading engrams...</div>
            ) : filtered.length === 0 ? (
                <div className="hippocampus-empty">No engrams match the current filters.</div>
            ) : (
                filtered.map(engram => (
                    <div
                        key={engram.id}
                        className={`hippocampus-card ${String(engram.id) === selectedId ? 'hippocampus-card-selected' : ''} ${!engram.is_active ? 'hippocampus-card-inactive' : ''}`}
                        onClick={() => selectEngram(engram.id)}
                    >
                        <div className="hippocampus-card-header">
                            <span className="hippocampus-card-name">
                                {engram.name || 'Untitled'}
                            </span>
                            <div className="hippocampus-card-meta">
                                <span className="hippocampus-card-relevance">
                                    {engram.relevance_score?.toFixed(1) ?? '1.0'}
                                </span>
                                <span className={`hippocampus-card-active-dot ${!engram.is_active ? 'hippocampus-card-active-dot-off' : ''}`} />
                            </div>
                        </div>

                        {engram.description && (
                            <div className="hippocampus-card-description">
                                {engram.description}
                            </div>
                        )}

                        <div className="hippocampus-card-footer">
                            <div className="hippocampus-card-tags">
                                {engram.tags.map(tag => (
                                    <span key={tag.id} className="hippocampus-card-tag">
                                        {tag.name}
                                    </span>
                                ))}
                            </div>
                            <div className="hippocampus-card-date">
                                {engram.creator && (
                                    <span className="hippocampus-card-creator">
                                        {engram.creator.name} &middot;{' '}
                                    </span>
                                )}
                                {engram.created ? new Date(engram.created).toLocaleDateString() : ''}
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    // --- RIGHT PANEL ---
    const rightPanel = selected ? (
        <div className="hippocampus-inspector">
            {savingField && (
                <span className="engram-saving">saving...</span>
            )}

            <div className="hippocampus-inspector-field">
                <span className="hippocampus-inspector-label">Name</span>
                <input
                    className="hippocampus-inspector-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onBlur={handleBlurName}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
            </div>

            <div className="hippocampus-inspector-field">
                <span className="hippocampus-inspector-label">Description</span>
                <textarea
                    className="hippocampus-inspector-textarea"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    onBlur={handleBlurDesc}
                />
            </div>

            <div className="hippocampus-inspector-field">
                <span className="hippocampus-inspector-label">Relevance Score</span>
                <input
                    className="hippocampus-inspector-relevance"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={editRelevance}
                    onChange={e => setEditRelevance(e.target.value)}
                    onBlur={handleBlurRelevance}
                    onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                />
            </div>

            <div className="hippocampus-inspector-field">
                <div className="hippocampus-inspector-toggle-row">
                    <span className="hippocampus-inspector-label">Active</span>
                    <button
                        type="button"
                        className={`engram-toggle ${selected.is_active ? 'engram-toggle-active' : ''}`}
                        onClick={handleToggleActive}
                    >
                        <span className="engram-toggle-knob" />
                    </button>
                </div>
            </div>

            <div className="hippocampus-inspector-field">
                <span className="hippocampus-inspector-label">Tags</span>
                <div className="hippocampus-inspector-tags">
                    {allTags.map(tag => {
                        const isOn = selected.tags.some(t => t.id === tag.id);
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                className={`engram-tag-pill ${isOn ? 'engram-tag-pill-active' : ''}`}
                                onClick={() => handleTagToggle(tag.id)}
                            >
                                {tag.name}
                            </button>
                        );
                    })}
                    <div className="hippocampus-inspector-new-tag">
                        <input
                            className="hippocampus-inspector-new-tag-input"
                            placeholder="+ tag"
                            value={newTagInput}
                            onChange={e => setNewTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleNewTag(); }}
                        />
                    </div>
                </div>
            </div>

            {/* Provenance */}
            <div className="hippocampus-inspector-section">
                <span className="hippocampus-inspector-section-title">Provenance</span>

                {selected.creator && (
                    <div className="hippocampus-provenance-item">
                        <span>Creator:</span>
                        <Link className="hippocampus-provenance-link" to={`/identity/${selected.creator.id}?type=disc`}>
                            {selected.creator.name}
                        </Link>
                    </div>
                )}

                {selected.identity_discs.length > 0 && (
                    <div className="hippocampus-provenance-item">
                        <span>Discs:</span>
                        {selected.identity_discs.map((discId, i) => (
                            <span key={String(discId)}>
                                {i > 0 && ', '}
                                <Link className="hippocampus-provenance-link" to={`/identity/${discId}?type=disc`}>
                                    {String(discId).slice(0, 8)}
                                </Link>
                            </span>
                        ))}
                    </div>
                )}

                {getSessionIds(selected).length > 0 && (
                    <div className="hippocampus-provenance-item">
                        <span>Sessions:</span>
                        {getSessionIds(selected).map((sid, i) => (
                            <span key={sid}>
                                {i > 0 && ', '}
                                <Link className="hippocampus-provenance-link" to={`/frontal/${sid}`}>
                                    {sid.slice(0, 8)}
                                </Link>
                            </span>
                        ))}
                    </div>
                )}

                {getSpikeIds(selected).length > 0 && (
                    <div className="hippocampus-provenance-item">
                        <span>Spikes:</span>
                        {getSpikeIds(selected).map((sid, i) => (
                            <span key={sid}>
                                {i > 0 && ', '}
                                <Link className="hippocampus-provenance-link" to={`/cns/spike/${sid}`}>
                                    {sid.slice(0, 8)}
                                </Link>
                            </span>
                        ))}
                    </div>
                )}

                {selected.source_turns?.length > 0 && (
                    <div className="hippocampus-provenance-item">
                        <span>Source turns: {selected.source_turns.length}</span>
                    </div>
                )}
            </div>

            {/* Timestamps */}
            <div className="hippocampus-inspector-section">
                <div className="hippocampus-inspector-timestamps">
                    <span>Created: {formatDate(selected.created)}</span>
                    <span>Modified: {formatDate(selected.modified)}</span>
                </div>
            </div>

            {/* Delete */}
            <div className="hippocampus-inspector-section">
                {!confirmDelete ? (
                    <button
                        type="button"
                        className="hippocampus-delete-btn"
                        onClick={() => setConfirmDelete(true)}
                    >
                        Delete Engram
                    </button>
                ) : (
                    <div className="hippocampus-delete-confirm">
                        <span className="hippocampus-delete-confirm-text">Delete this engram?</span>
                        <button
                            type="button"
                            className="hippocampus-confirm-yes"
                            onClick={handleDelete}
                        >
                            Yes
                        </button>
                        <button
                            type="button"
                            className="hippocampus-confirm-no"
                            onClick={() => setConfirmDelete(false)}
                        >
                            No
                        </button>
                    </div>
                )}
            </div>
        </div>
    ) : (
        <div className="hippocampus-inspector-empty">
            Select an engram to inspect.
        </div>
    );

    return (
        <ThreePanel
            left={leftPanel}
            center={centerPanel}
            right={rightPanel}
        />
    );
}

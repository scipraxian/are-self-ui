import './CNSDashboardSidebar.css';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Edit, Plus, Trash2 } from 'lucide-react';
import { useEnvironment } from '../context/EnvironmentProvider';
import { apiFetch } from '../api';
import type { NeuralPathway } from '../types';

interface CNSDashboardSidebarProps {
    pathways: NeuralPathway[];
    isLoading: boolean;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onPathwayCreated?: () => void;
}

interface PathwayGroup {
    label: string;
    pathways: NeuralPathway[];
}

export const CNSDashboardSidebar: React.FC<CNSDashboardSidebarProps> = ({
    pathways,
    isLoading,
    searchQuery,
    onSearchChange,
    onPathwayCreated,
}) => {
    const navigate = useNavigate();
    const { environments, selectedEnvironmentId, selectEnvironment, isLoading: isEnvLoading } = useEnvironment();
    const [creatingPathway, setCreatingPathway] = useState(false);
    const [newPathwayName, setNewPathwayName] = useState('');

    const handleCreatePathway = async () => {
        if (!newPathwayName.trim()) return;
        try {
            const res = await apiFetch('/api/v2/neuralpathways/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newPathwayName.trim() }),
            });
            if (!res.ok) return;
            const created = await res.json();
            setCreatingPathway(false);
            setNewPathwayName('');
            if (onPathwayCreated) onPathwayCreated();
            navigate(`/cns/pathway/${created.id}/edit`);
        } catch (err) {
            console.error('Failed to create pathway', err);
        }
    };

    const handleDelete = async (e: React.MouseEvent, pathwayId: string, pathwayName: string) => {
        e.stopPropagation();
        if (!confirm(`Delete pathway "${pathwayName}"? This cannot be undone.`)) return;
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/`, { method: 'DELETE' });
            if (onPathwayCreated) onPathwayCreated(); // re-fetch list
        } catch {
            // ignore
        }
    };

    const handleLaunch = async (e: React.MouseEvent, pathwayId: string) => {
        e.stopPropagation();
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/launch/`, { method: 'POST' });
        } catch {
            // ignore
        }
    };

    const groups = useMemo((): PathwayGroup[] => {
        const q = searchQuery.toLowerCase().trim();
        const filtered = q
            ? pathways.filter(p => p.name.toLowerCase().includes(q))
            : pathways;

        const starred: NeuralPathway[] = [];
        const tagMap = new Map<string, NeuralPathway[]>();
        const uncategorized: NeuralPathway[] = [];

        for (const pw of filtered) {
            if (pw.is_favorite) {
                starred.push(pw);
                continue;
            }
            if (pw.tags && pw.tags.length > 0) {
                const tagName = pw.tags[0].name.toUpperCase();
                const list = tagMap.get(tagName) || [];
                list.push(pw);
                tagMap.set(tagName, list);
            } else {
                uncategorized.push(pw);
            }
        }

        const result: PathwayGroup[] = [];
        if (starred.length > 0) result.push({ label: 'STARRED', pathways: starred });
        for (const [label, pws] of tagMap) {
            result.push({ label, pathways: pws });
        }
        if (uncategorized.length > 0) result.push({ label: 'NEURAL PATHWAYS', pathways: uncategorized });

        return result;
    }, [pathways, searchQuery]);

    return (
        <div className="cns-dash-sidebar">
            <div className="cns-dash-env">
                <label className="cns-dash-env-label">ENVIRONMENT</label>
                <select
                    className="cns-dash-env-select"
                    value={selectedEnvironmentId}
                    onChange={(e) => selectEnvironment(e.target.value)}
                    disabled={isEnvLoading}
                >
                    <option value="">{isEnvLoading ? 'Loading…' : '-- Select Environment --'}</option>
                    {environments.map((env) => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>
            </div>

            <div className="cns-dash-search">
                <input
                    className="cns-dash-search-input"
                    type="text"
                    placeholder="Filter pathways..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>

            {creatingPathway ? (
                <div className="cns-dash-create-form">
                    <input
                        className="cns-dash-search-input"
                        type="text"
                        placeholder="Pathway name..."
                        value={newPathwayName}
                        onChange={(e) => setNewPathwayName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreatePathway();
                            if (e.key === 'Escape') { setCreatingPathway(false); setNewPathwayName(''); }
                        }}
                        autoFocus
                    />
                    <div className="cns-dash-create-actions">
                        <button className="cns-dash-action-btn cns-dash-action-btn--launch" onClick={handleCreatePathway}>Create</button>
                        <button className="cns-dash-action-btn" onClick={() => { setCreatingPathway(false); setNewPathwayName(''); }}>Cancel</button>
                    </div>
                </div>
            ) : (
                <button className="cns-dash-new-btn" onClick={() => setCreatingPathway(true)}>
                    <Plus size={12} /> New Pathway
                </button>
            )}

            <div className="cns-dash-pathways">
                {isLoading ? (
                    <div className="cns-dash-loading">Loading pathways...</div>
                ) : groups.length === 0 ? (
                    <div className="cns-dash-loading">No pathways found.</div>
                ) : (
                    groups.map(group => (
                        <div key={group.label} className="cns-dash-section">
                            <div className="cns-dash-section-label">{group.label}</div>
                            {group.pathways.map(pw => (
                                <div
                                    key={pw.id}
                                    className="cns-dash-pathway-item"
                                    onClick={() => navigate(`/cns/pathway/${pw.id}`)}
                                >
                                    <div className="cns-dash-pathway-row">
                                        <span className="cns-dash-pathway-name">{pw.name}</span>
                                        {pw.is_favorite && <span className="cns-dash-pathway-star">★</span>}
                                    </div>
                                    <div className="cns-dash-pathway-actions" onClick={e => e.stopPropagation()}>
                                        <button
                                            className="cns-dash-action-btn cns-dash-action-btn--launch"
                                            onClick={(e) => handleLaunch(e, pw.id)}
                                            title="Launch Spike Train"
                                        >
                                            <Play size={11} />
                                        </button>
                                        <button
                                            className="cns-dash-action-btn"
                                            onClick={() => navigate(`/cns/pathway/${pw.id}/edit`)}
                                            title="Edit Graph"
                                        >
                                            <Edit size={11} />
                                        </button>
                                        <button
                                            className="cns-dash-action-btn cns-dash-action-btn--delete"
                                            onClick={(e) => handleDelete(e, pw.id, pw.name)}
                                            title="Delete Pathway"
                                        >
                                            <Trash2 size={11} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

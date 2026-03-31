import "./CNSSidebar.css";
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Edit } from 'lucide-react';
import type { NeuralPathway } from "../types.ts";
import { apiFetch } from '../api';

type EnvironmentOption = { id: string; name: string };

interface CNSSidebarProps {
    activePathwayId: string | null;
    onSelectPathway: (id: string) => void;
    onExit: () => void;
    selectedEnvironmentId: string;
    onEnvironmentChange: (environmentId: string) => void;
}

export const CNSSidebar: React.FC<CNSSidebarProps> = ({
    activePathwayId,
    onSelectPathway,
    onExit,
    selectedEnvironmentId,
    onEnvironmentChange,
}) => {
    const navigate = useNavigate();
    const [pathways, setPathways] = useState<NeuralPathway[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);
    const [isEnvLoading, setIsEnvLoading] = useState(true);

    useEffect(() => {
        const fetchPathways = async () => {
            try {
                const res = await apiFetch('/api/v2/neuralpathways/');
                const data = await res.json();
                setPathways(data);
            } catch (error) {
                console.error("Failed to fetch pathways", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchPathways();
    }, []);

    useEffect(() => {
        let mounted = true;
        const fetchEnvironments = async () => {
            setIsEnvLoading(true);
            try {
                const res = await apiFetch('/api/v1/environments/');
                if (!res.ok) return;
                const data = await res.json();
                const next = (data?.results ?? data) as EnvironmentOption[];
                if (mounted) setEnvironments(Array.isArray(next) ? next : []);
            } catch (err) {
                console.error('Failed to fetch environments', err);
            } finally {
                if (mounted) setIsEnvLoading(false);
            }
        };
        fetchEnvironments();
        return () => {
            mounted = false;
        };
    }, []);

    const handleLaunch = async (e: React.MouseEvent, pathwayId: string) => {
        e.stopPropagation();
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/launch/`, { method: 'POST' });
        } catch {
            // ignore
        }
    };

    const adminEnvironmentHref = selectedEnvironmentId
        ? `/admin/environmental_pathways/environment/${encodeURIComponent(selectedEnvironmentId)}/change/`
        : '/admin/';

    return (
        <div className="cns-sidebar-root">
            <div className="common-layout-18">
                <h2 className="glass-panel-title common-layout-4">CENTRAL NERVOUS SYSTEM</h2>
                <button onClick={onExit} className="bbb-close-btn common-layout-5">✕</button>
            </div>

            <div className="cnssidebar-env">
                <div className="cnssidebar-env-label font-mono text-xs">ENVIRONMENT</div>
                <div className="cnssidebar-env-row">
                    <select
                        className="cnssidebar-env-select"
                        value={selectedEnvironmentId}
                        onChange={(e) => onEnvironmentChange(e.target.value)}
                        disabled={isEnvLoading}
                    >
                        <option value="">{isEnvLoading ? 'Loading…' : '-- Select Environment --'}</option>
                        {environments.map((env) => (
                            <option key={env.id} value={env.id}>
                                {env.name}
                            </option>
                        ))}
                    </select>
                    <a
                        className={`cnssidebar-env-edit ${selectedEnvironmentId ? '' : 'disabled'}`}
                        href={adminEnvironmentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-disabled={!selectedEnvironmentId}
                        onClick={(e) => {
                            if (!selectedEnvironmentId) e.preventDefault();
                        }}
                    >
                        Environment Edit
                    </a>
                </div>
            </div>

            {isLoading ? (
                <div className="bbb-placeholder font-mono text-sm">Loading networks...</div>
            ) : (
                <div className="cns-sidebar-list">
                    {/* Show All option */}
                    <div
                        onClick={() => onSelectPathway('')}
                        className={`cnssidebar-item ${!activePathwayId ? 'cnssidebar-item--active' : ''}`}
                    >
                        <div className="cns-sidebar-item-title">
                            <span>Show All</span>
                        </div>
                    </div>

                    {pathways.map(pw => {
                        const pwId = pw.id.toString();
                        return (
                            <div
                                key={pw.id}
                                onClick={() => onSelectPathway(pwId)}
                                className={`cnssidebar-item ${activePathwayId === pwId ? "cnssidebar-item--active" : ""}`}
                            >
                                <div className="cns-sidebar-item-title">
                                    <span>{pw.name}</span>
                                    {pw.is_favorite && <span className="cns-sidebar-favorite">★</span>}
                                </div>
                                {pw.description && (
                                    <div className="cns-sidebar-description">
                                        {pw.description}
                                    </div>
                                )}
                                <div className="cns-sidebar-actions">
                                    <button
                                        className="cns-sidebar-action-btn cns-sidebar-action-btn--launch"
                                        onClick={(e) => handleLaunch(e, pwId)}
                                        title="Launch Spike Train"
                                    >
                                        <Play size={12} />
                                    </button>
                                    <button
                                        className="cns-sidebar-action-btn"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/cns/pathway/${pwId}/edit`); }}
                                        title="Edit Graph"
                                    >
                                        <Edit size={12} />
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

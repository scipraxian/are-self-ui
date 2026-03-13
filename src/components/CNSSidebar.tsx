import "./CNSSidebar.css";
import React, { useEffect, useState } from 'react';
import type { NeuralPathway } from "../types.ts";
import { apiFetch } from '../api';


interface CNSSidebarProps {
    activePathwayId: string | null;
    onSelectPathway: (id: string) => void;
    onExit: () => void;
}

export const CNSSidebar: React.FC<CNSSidebarProps> = ({ activePathwayId, onSelectPathway, onExit }) => {
    const [pathways, setPathways] = useState<NeuralPathway[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPathways = async () => {
            try {
                // Hitting your new v2 endpoint
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

    return (
        <div className="cnssidebar-ui-32">
            <div className="common-layout-18">
                <h2 className="glass-panel-title common-layout-4">NEURAL PATHWAYS</h2>
                <button onClick={onExit} className="bbb-close-btn common-layout-5">✕</button>
            </div>

            {isLoading ? (
                <div className="bbb-placeholder font-mono text-sm">Loading networks...</div>
            ) : (
                <div className="cnssidebar-ui-31">
                    {pathways.map(pw => (
                        <div
                            key={pw.id}
                            onClick={() => onSelectPathway(pw.id.toString())}
                            style={{
                                padding: '12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: activePathwayId === pw.id.toString() ? 'rgba(56, 189, 248, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                                border: `1px solid ${activePathwayId === pw.id.toString() ? '#38bdf8' : '#334155'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div className="cnssidebar-ui-30">
                                <span>{pw.name}</span>
                                {pw.is_favorite && <span className="cnssidebar-ui-29">★</span>}
                            </div>
                            {pw.description && (
                                <div className="cnssidebar-ui-28">
                                    {pw.description}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
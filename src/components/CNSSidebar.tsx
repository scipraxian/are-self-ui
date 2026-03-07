import React, { useEffect, useState } from 'react';
import type {NeuralPathway} from "../types.ts";


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
                const res = await fetch('/api/v2/neuralpathways/');
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="glass-panel-title" style={{ margin: 0 }}>NEURAL PATHWAYS</h2>
                <button onClick={onExit} className="bbb-close-btn" style={{ position: 'relative', top: 0, right: 0 }}>✕</button>
            </div>

            {isLoading ? (
                <div className="bbb-placeholder font-mono text-sm">Loading networks...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
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
                            <div style={{ color: '#e2e8f0', fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{pw.name}</span>
                                {pw.is_favorite && <span style={{ color: '#facc15' }}>★</span>}
                            </div>
                            {pw.description && (
                                <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
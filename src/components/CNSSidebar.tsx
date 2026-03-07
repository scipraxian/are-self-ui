import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';

interface CNSSidebarProps {
    activePathwayId: string | null;
    onSelectPathway: (id: string) => void;
    onExit: () => void;
}

export const CNSSidebar = ({ activePathwayId, onSelectPathway, onExit }: CNSSidebarProps) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [pathways, setPathways] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/v1/pathways/')
            .then(res => res.json())
            .then(data => setPathways(data.results || data))
            .catch(console.error);
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 className="glass-panel-title" style={{ marginBottom: '16px' }}>NEURAL PATHWAYS</h2>
            <div className="scroll-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pathways.map(p => (
                    <div key={p.id} onClick={() => onSelectPathway(p.id)}
                         style={{
                             padding: '12px', borderRadius: '8px', cursor: 'pointer',
                             background: p.id === activePathwayId ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255,255,255,0.02)',
                             border: `1px solid ${p.id === activePathwayId ? '#38bdf8' : 'var(--border-glass)'}`,
                             transition: 'all 0.2s ease'
                         }}>
                        <div className="font-display text-sm" style={{ color: '#f8fafc', fontWeight: 700 }}>{p.name}</div>
                        <div className="font-mono text-xs" style={{ color: '#94a3b8', marginTop: '4px' }}>
                            Nodes: {p.node_count || 0}
                        </div>
                    </div>
                ))}
                {pathways.length === 0 && <div className="font-mono text-xs text-[#64748b]">No pathways found.</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
                <button className="btn-ghost" onClick={onExit} style={{ justifyContent: 'flex-start' }}>
                    <LogOut size={14} /> EXIT TO MAP
                </button>
            </div>
        </div>
    );
};
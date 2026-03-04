import { useEffect, useState } from 'react';
import { Star, GripVertical, Cpu, ShieldAlert, Loader2 } from 'lucide-react';
import './IdentityRoster.css';

interface BaseIdentity {
    id: number;
    name: string;
}

interface IdentityDisc {
    id: number;
    name: string;
    level: number;
    xp: number;
    available: boolean;
}

interface IdentityRosterProps {
    onSelectIdentity: (id: number, type: 'base' | 'disc') => void;
}

export const IdentityRoster = ({ onSelectIdentity }: IdentityRosterProps) => {
    const [templates, setTemplates] = useState<BaseIdentity[]>([]);
    const [discs, setDiscs] = useState<IdentityDisc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchRoster = async () => {
            try {
                const [idRes, discRes] = await Promise.all([ fetch('/api/v2/identities/'), fetch('/api/v2/identity-discs/') ]);
                if (idRes.ok && discRes.ok) {
                    const idData = await idRes.json();
                    const discData = await discRes.json();
                    setTemplates(idData.results || idData);
                    setDiscs(discData.results || discData);
                }
            } catch (error) { console.error("Neural fetch failed:", error); }
            finally { setIsLoading(false); }
        };

        fetchRoster();

        // Listen for the custom event we will fire from TemporalMatrix
        window.addEventListener('sync-roster', fetchRoster);
        return () => window.removeEventListener('sync-roster', fetchRoster);
    }, []);

    if (isLoading) {
        return (
            <div className="roster-container roster-loading">
                <Loader2 className="animate-spin" size={18} />
                <span className="font-mono text-xs">Syncing Neural Link...</span>
            </div>
        );
    }

    return (
        <div className="scroll-hidden roster-container">

            <div className="roster-category">Active Discs</div>

            {discs.length === 0 ? (
                <div className="font-mono text-xs roster-empty">No active discs found.</div>
            ) : discs.map(disc => (
                <div
                    key={`disc-${disc.id}`}
                    className={`roster-item active-disc clickable ${disc.available ? 'draggable' : 'unavailable'}`}
                    onClick={() => onSelectIdentity(disc.id, 'disc')}
                    draggable={disc.available}
                    onDragStart={(e) => {
                        if (disc.available) {
                            // Pack the Disc ID into the drag payload
                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'disc', id: disc.id }));
                        }
                    }}
                >
                    {disc.available ? (
                        <GripVertical size={14} color="var(--text-muted)" className="roster-item-handle" />
                    ) : (
                        <ShieldAlert size={14} color="var(--accent-red)" className="roster-item-handle" />
                    )}
                    <div className="roster-item-content">
                        <div className="roster-item-header">
                            <span className={`font-display roster-item-title ${!disc.available ? 'strike' : ''}`}>
                                {disc.name} [Lvl {disc.level}]
                            </span>
                            {disc.available && <span className="status-dot status-active-pulse" title="Available"></span>}
                        </div>
                        <div className="font-mono text-xs roster-item-stats">
                            <span>XP: {disc.xp}</span>
                            {!disc.available && <span className="roster-offline">Offline</span>}
                        </div>
                    </div>
                    <button className="icon-toggle" title="Inspect">
                        <Cpu size={16} />
                    </button>
                </div>
            ))}

            <div className="roster-category">Base Identities</div>

            {templates.length === 0 ? (
                <div className="font-mono text-xs roster-empty">No base templates found.</div>
            ) : templates.map(template => (
                <div
                    key={`template-${template.id}`}
                    className="roster-item base-template clickable draggable"
                    onClick={() => onSelectIdentity(template.id, 'base')}
                    draggable={true}
                    onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'base', id: template.id }));
                    }}
                >
                    <GripVertical size={14} color="var(--text-muted)" />
                    <div className="roster-base-content">
                        <span className="font-display roster-base-title">
                            {template.name}
                        </span>
                    </div>
                    <button className="icon-toggle" title="Toggle Favorite">
                        <Star size={16} />
                    </button>
                </div>
            ))}

        </div>
    );
};
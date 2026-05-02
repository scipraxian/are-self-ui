import { useEffect, useRef, useState } from 'react';
import { Star, GripVertical, Cpu, ShieldAlert, Loader2 } from 'lucide-react';
import { apiFetch } from '../api';
import type { Avatar } from '../types';
import { AvatarTile } from './AvatarTile';
import { useDendrite } from './SynapticCleft';
import './IdentityRoster.css';

interface BaseIdentity {
    id: string;
    name: string;
    avatar?: Avatar | null;
}

interface IdentityDisc {
    id: string;
    name: string;
    level: number;
    xp: number;
    available: boolean;
    avatar?: Avatar | null;
    composite_vector?: number[] | null;
}

interface IdentityRosterProps {
    onSelectIdentity: (id: string, type: 'base' | 'disc') => void;
    // Optional refresh nudge — the parent (e.g., TemporalMatrix) bumps
    // this after a slot_disc auto-forge so the roster reflects the new
    // disc even if the backend hasn't broadcast IdentityDisc yet.
    refreshKey?: number;
}

export const IdentityRoster = ({ onSelectIdentity, refreshKey = 0 }: IdentityRosterProps) => {
    const [templates, setTemplates] = useState<BaseIdentity[]>([]);
    const [discs, setDiscs] = useState<IdentityDisc[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const discEvent = useDendrite('IdentityDisc', null);
    const isMountedRef = useRef(true);
    const lastFireAtRef = useRef(0);
    const trailingTimerRef = useRef<number | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (trailingTimerRef.current !== null) {
                window.clearTimeout(trailingTimerRef.current);
                trailingTimerRef.current = null;
            }
        };
    }, []);

    // Leading + trailing throttle. IdentityDisc events fire constantly
    // during active sessions; we want the first event in a burst to
    // refetch immediately (so a freshly spawned disc shows up right
    // away), then suppress for 500ms, then trail-fetch once more if
    // more events arrived during the cooldown.
    useEffect(() => {
        const load = async () => {
            try {
                const [idRes, discRes] = await Promise.all([
                    apiFetch('/api/v2/identities/'),
                    apiFetch('/api/v2/identity-discs/')
                ]);
                if (!isMountedRef.current) return;
                if (idRes.ok && discRes.ok) {
                    const idData = await idRes.json();
                    const discData = await discRes.json();
                    if (!isMountedRef.current) return;
                    setTemplates(idData.results || idData);
                    setDiscs(discData.results || discData);
                }
            } catch (error) {
                console.error("Neural fetch failed:", error);
            } finally {
                if (isMountedRef.current) setIsLoading(false);
            }
        };

        const now = Date.now();
        const elapsed = now - lastFireAtRef.current;

        if (elapsed >= 500) {
            if (trailingTimerRef.current !== null) {
                window.clearTimeout(trailingTimerRef.current);
                trailingTimerRef.current = null;
            }
            lastFireAtRef.current = now;
            load();
        } else if (trailingTimerRef.current === null) {
            trailingTimerRef.current = window.setTimeout(() => {
                trailingTimerRef.current = null;
                if (!isMountedRef.current) return;
                lastFireAtRef.current = Date.now();
                load();
            }, 500 - elapsed);
        }
    }, [discEvent, refreshKey]);

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
                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'disc', id: disc.id }));
                        }
                    }}
                >
                    {disc.available ? (
                        <GripVertical size={14} color="var(--text-muted)" className="roster-item-handle" />
                    ) : (
                        <ShieldAlert size={14} color="var(--accent-red)" className="roster-item-handle" />
                    )}
                    <AvatarTile
                        avatar={disc.avatar ?? null}
                        compositeVector={disc.composite_vector}
                        size={32}
                        className="roster-item-avatar"
                    />
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
                    <AvatarTile
                        avatar={template.avatar ?? null}
                        size={32}
                        className="roster-item-avatar"
                    />
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

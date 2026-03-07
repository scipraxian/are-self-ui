import { useState, useEffect } from 'react';
import { Loader2, Activity, Brain } from 'lucide-react';
import { FrontalLobeDetail } from './FrontalLobeDetail';

interface ReasoningSession {
    id: string;
    status_name: string;
    max_turns: number;
    total_xp: number;
    current_focus: number;
    current_level: number;
    created: string;
}

export const FrontalLobeView = () => {
    const [sessions, setSessions] = useState<ReasoningSession[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

    const fetchSessions = async () => {
        try {
            // FIX: Added missing trailing slash for Django API
            const res = await fetch('/api/v1/reasoning_sessions/');
            if (res.ok) {
                const data = await res.json();
                setSessions(data.results || data);
            } else {
                console.error("API returned non-200 status:", res.status);
            }
        } catch (err) {
            console.error("Failed to fetch reasoning sessions", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!selectedThreadId) {
            fetchSessions();
            const intervalId = setInterval(fetchSessions, 3000);
            return () => clearInterval(intervalId);
        }
    }, [selectedThreadId]);

    if (selectedThreadId) {
        return <FrontalLobeDetail sessionId={selectedThreadId} onBack={() => setSelectedThreadId(null)} />;
    }

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', paddingRight: '20px' }}>
                <Brain size={24} color="#a855f7" />
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary">FRONTAL LOBE</h3>
                    <div className="font-mono text-xs text-muted" style={{ marginTop: '4px' }}>Active Cognitive Threads</div>
                </div>
            </div>

            <div className="scroll-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sessions.length === 0 ? (
                    <div className="bbb-placeholder font-mono text-sm">No cognitive threads active. Discs are dormant.</div>
                ) : (
                    sessions.map(session => {
                        const isActive = ['Active', 'Pending'].includes(session.status_name);
                        return (
                            <div key={session.id} style={{
                                background: isActive ? 'rgba(168, 85, 247, 0.05)' : 'rgba(0,0,0,0.3)',
                                border: `1px solid ${isActive ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-glass)'}`,
                                borderRadius: '12px',
                                padding: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                                 onClick={() => setSelectedThreadId(session.id)}
                                 onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                                 onMouseOut={(e) => e.currentTarget.style.borderColor = isActive ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-glass)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="font-display text-sm" style={{ color: isActive ? '#a855f7' : '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>
                                        {/* Nomenclature fix */}
                                        COGNITIVE THREAD // {session.id.split('-')[0].toUpperCase()}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {isActive && <Activity size={14} color="#a855f7" className="pulse" />}
                                        <span className="font-mono text-xs" style={{ textTransform: 'uppercase', color: isActive ? '#f8fafc' : '#64748b' }}>
                                            {session.status_name}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    <div style={{ background: 'var(--bg-obsidian)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                                        <div className="font-mono text-xs text-muted" style={{ marginBottom: '4px' }}>FOCUS POOL</div>
                                        <div className="font-display" style={{ fontSize: '1.2rem', color: '#38bdf8' }}>{session.current_focus}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-obsidian)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                                        <div className="font-mono text-xs text-muted" style={{ marginBottom: '4px' }}>LEVEL</div>
                                        <div className="font-display" style={{ fontSize: '1.2rem', color: '#4ade80' }}>{session.current_level}</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-obsidian)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                                        <div className="font-mono text-xs text-muted" style={{ marginBottom: '4px' }}>EXPERIENCE</div>
                                        <div className="font-display" style={{ fontSize: '1.2rem', color: '#facc15' }}>{session.total_xp} XP</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};
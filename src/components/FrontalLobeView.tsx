import "./FrontalLobeView.css";
import { useState, useEffect } from 'react';
import { Loader2, Activity, Brain } from 'lucide-react';
import { FrontalLobeDetail } from './FrontalLobeDetail';
import { useDendrite } from './SynapticCleft';

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
    const sessionEvent = useDendrite('ReasoningSession', null);

    const signature = (items: ReasoningSession[]) =>
        (items || [])
            .map((s) => `${s.id}:${s.status_name}:${s.current_focus}:${s.current_level}:${s.total_xp}:${s.max_turns}`)
            .join("|");

    useEffect(() => {
        if (selectedThreadId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch('/api/v2/reasoning_sessions/');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                const next = (data.results || data) as ReasoningSession[];
                setSessions((prev) => (signature(prev) === signature(next) ? prev : next));
            } catch (err) {
                console.error("Failed to fetch reasoning sessions", err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [selectedThreadId, sessionEvent]);

    if (selectedThreadId) {
        return <FrontalLobeDetail sessionId={selectedThreadId} onBack={() => setSelectedThreadId(null)} />;
    }

    if (isLoading) {
        return (
            <div className="common-layout-25">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    return (
        <div className="common-layout-26">
            <div className="frontallobeview-ui-82">
                <Brain size={24} color="#a855f7" />
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary">FRONTAL LOBE</h3>
                    <div className="font-mono text-xs text-muted common-layout-27">Active Cognitive Threads</div>
                </div>
            </div>

            <div className="scroll-hidden frontallobeview-ui-81">
                {sessions.length === 0 ? (
                    <div className="bbb-placeholder font-mono text-sm">No cognitive threads active. Discs are dormant.</div>
                ) : (
                    sessions.map(session => {
                        const isActive = ['Active', 'Pending'].includes(session.status_name);
                        return (
                            <div
                                key={session.id}
                                className={`frontallobeview-thread ${isActive ? 'frontallobeview-thread--active' : 'frontallobeview-thread--inactive'}`}
                                 onClick={() => setSelectedThreadId(session.id)}
                            >
                                <div className="common-layout-18">
                                    <span className={`frontallobeview-thread-title ${isActive ? 'frontallobeview-thread-title--active' : 'frontallobeview-thread-title--inactive'}`}>
                                        {/* Nomenclature fix */}
                                        COGNITIVE THREAD // {session.id.split('-')[0].toUpperCase()}
                                    </span>
                                    <div className="common-layout-15">
                                        {isActive && <Activity size={14} color="#a855f7" className="pulse" />}
                                        <span className={`frontallobeview-thread-status ${isActive ? 'frontallobeview-thread-status--active' : 'frontallobeview-thread-status--inactive'}`}>
                                            {session.status_name}
                                        </span>
                                    </div>
                                </div>

                                <div className="frontallobeview-ui-80">
                                    <div className="frontallobeview-ui-79">
                                        <div className="font-mono text-xs text-muted common-layout-30">FOCUS POOL</div>
                                        <div className="font-display frontallobeview-ui-78">{session.current_focus}</div>
                                    </div>
                                    <div className="frontallobeview-ui-77">
                                        <div className="font-mono text-xs text-muted common-layout-30">LEVEL</div>
                                        <div className="font-display frontallobeview-ui-76">{session.current_level}</div>
                                    </div>
                                    <div className="frontallobeview-ui-75">
                                        <div className="font-mono text-xs text-muted common-layout-30">EXPERIENCE</div>
                                        <div className="font-display frontallobeview-ui-74">{session.total_xp} XP</div>
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

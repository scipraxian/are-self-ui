import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Network, MessageSquare, Terminal } from 'lucide-react';
import { ThreePanel } from '../components/ThreePanel';
import { ReasoningSidebar, ReasoningInspector } from '../components/ReasoningPanels';
import { ReasoningGraph3D } from '../components/ReasoningGraph3D';
import { SessionChat } from '../components/SessionChat';
import { ParietalActivityPanel } from '../components/ParietalActivityPanel';
import { useSessionDigests } from '../hooks/useSessionDigests';
import { useGABA } from '../context/GABAProvider';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useDendrite } from '../components/SynapticCleft';
import { apiFetch } from '../api';
import { isInFlight } from '../utils/reasoningGraphHelpers';
import type { GraphNode, ReasoningTurnDigest } from '../types';
import './FrontalSession.css';

interface CortexStats {
    level: number;
    focus: string;
    xp: number;
    status: string;
    latestThought: string;
}

interface MinimalSession {
    id: string;
    status_name: string;
    created: string;
    modified?: string;
}

const TERMINAL_STATUSES = ['Concluded', 'Completed', 'Stopped', 'Halted', 'Error', 'Cancelled', 'Failed'];

const formatElapsed = (ms: number): string => {
    if (!Number.isFinite(ms) || ms < 0) return '0s';
    const totalSec = Math.floor(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec - min * 60;
    if (min < 60) return `${min}m ${sec}s`;
    const hr = Math.floor(min / 60);
    const remMin = min - hr * 60;
    return `${hr}h ${remMin}m`;
};

export function FrontalSession() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();
    const { setCrumbs } = useBreadcrumbs();

    type SessionViewMode = 'graph' | 'chat' | 'parietal';
    const [viewMode, setViewMode] = useState<SessionViewMode>('graph');
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [cortexStats, setCortexStats] = useState<CortexStats | null>(null);
    const [session, setSession] = useState<MinimalSession | null>(null);

    const { digests } = useSessionDigests(sessionId ?? null);
    const sessionEvent = useDendrite('ReasoningSession', sessionId ?? null);

    // Minimal session fetch — drives the session-elapsed clock anchor.
    useEffect(() => {
        let cancelled = false;
        if (!sessionId) {
            setSession(null);
            return;
        }
        const load = async () => {
            try {
                const res = await apiFetch(`/api/v2/reasoning_sessions/${sessionId}/`);
                if (!res.ok || cancelled) return;
                const data: MinimalSession = await res.json();
                if (cancelled) return;
                setSession(data);
            } catch (err) {
                console.error('Session header fetch failed', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId, sessionEvent]);

    useEffect(() => {
        if (sessionId) {
            setCrumbs([
                { label: 'Frontal Lobe', path: '/frontal' },
                {
                    label: `Session #${sessionId.slice(0, 6).toUpperCase()}`,
                    path: `/frontal/${sessionId}`,
                    tip: 'A reasoning session — the full back-and-forth of a single AI thinking loop, with every spike, tool call, and model response.',
                    doc: 'docs/ui/frontal-lobe',
                },
            ]);
        }
        return () => setCrumbs([]);
    }, [sessionId, setCrumbs]);

    useEffect(() => {
        if (!sessionId) {
            navigate('/frontal', { replace: true });
        }
    }, [sessionId, navigate]);

    useEffect(() => {
        const unregister = registerEscapeHandler(() => {
            if (viewMode === 'parietal' || viewMode === 'chat') {
                setViewMode('graph');
            } else {
                navigate('/frontal');
            }
        });
        return unregister;
    }, [viewMode, navigate, registerEscapeHandler]);

    if (!sessionId) return null;

    const isAlive = cortexStats && isInFlight(cortexStats.status);

    const handleParietalToolSelect = (turnId: string, toolCallId: string) => {
        const digest = digests.find((d) => d.turn_id === turnId);
        const summary = digest?.tool_calls_summary.find((tc) => tc.id === toolCallId);
        const synthetic: GraphNode = {
            id: `tool-${toolCallId}`,
            type: 'tool',
            label: summary?.tool_name,
            status_name: summary?.success === true ? 'Completed' : summary?.success === false ? 'Error' : 'Pending',
            turn_id: turnId,
            session_id: sessionId,
            tool_call_id: toolCallId,
            tool_name: summary?.tool_name,
            success: summary?.success ?? null,
            target: summary?.target ?? '',
        };
        setSelectedNode(synthetic);
    };

    return (
        <ThreePanel
            centerClassName="three-panel-center--reasoning-graph"
            left={
                <ReasoningSidebar
                    activeSessionId={sessionId}
                    onSelectSession={(id) => navigate(`/frontal/${id}`)}
                    onToggleChat={() => setViewMode((prev) => prev === 'chat' ? 'graph' : 'chat')}
                />
            }
            center={
                <div className="frontal-session-center">
                    <div className="frontal-session-mode-bar">
                        <button
                            className={`frontal-session-mode-tab ${viewMode === 'graph' ? 'frontal-session-mode-tab--active' : ''}`}
                            onClick={() => setViewMode('graph')}
                        >
                            <Network size={14} /> Graph
                        </button>
                        <button
                            className={`frontal-session-mode-tab ${viewMode === 'chat' ? 'frontal-session-mode-tab--active' : ''}`}
                            onClick={() => setViewMode('chat')}
                        >
                            <MessageSquare size={14} /> Chat
                        </button>
                        <button
                            className={`frontal-session-mode-tab ${viewMode === 'parietal' ? 'frontal-session-mode-tab--active' : ''}`}
                            onClick={() => setViewMode('parietal')}
                        >
                            <Terminal size={14} /> Parietal
                        </button>
                    </div>
                    <div className="frontal-session-stage">
                        {cortexStats && (
                            <div className="cortex-stats-bar">
                                <div className={`cortex-stats-status ${isAlive ? 'cortex-stats-status--active' : ''}`}>
                                    {cortexStats.status}
                                </div>
                                <div className="cortex-stats-item">
                                    <span className="cortex-stats-label">LVL</span>
                                    <span className="cortex-stats-value">{cortexStats.level}</span>
                                </div>
                                <div className="cortex-stats-item">
                                    <span className="cortex-stats-label">FOCUS</span>
                                    <span className="cortex-stats-value">{cortexStats.focus}</span>
                                </div>
                                <div className="cortex-stats-item">
                                    <span className="cortex-stats-label">XP</span>
                                    <span className="cortex-stats-value">{cortexStats.xp}</span>
                                </div>
                                <SessionTimer session={session} />
                                <CurrentTurnTimer digests={digests} sessionTerminal={!!session && TERMINAL_STATUSES.includes(session.status_name)} />
                            </div>
                        )}
                        {viewMode === 'graph' ? (
                            <ReasoningGraph3D
                                sessionId={sessionId}
                                onNodeSelect={setSelectedNode}
                                onStatsUpdate={setCortexStats}
                            />
                        ) : viewMode === 'chat' ? (
                            <SessionChat
                                sessionId={sessionId}
                                title="SESSION NEURAL LINK"
                            />
                        ) : (
                            <ParietalActivityPanel
                                digests={digests}
                                onToolSelect={handleParietalToolSelect}
                            />
                        )}
                    </div>
                </div>
            }
            right={<ReasoningInspector node={selectedNode} sessionId={sessionId} />}
        />
    );
}

// Self-rescheduling setTimeout (NEVER setInterval) — re-arms each tick
// from inside the handler, and stops once the session reaches a terminal
// status. The CLAUDE.md rule against setInterval applies to data refresh;
// the dataflow is dendrite-only. We're using a one-second clock for a
// pure display value.
function useSecondsTick(stopCondition: boolean): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (stopCondition) return;
        let active = true;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const tick = () => {
            if (!active) return;
            setNow(Date.now());
            timer = setTimeout(tick, 1000);
        };
        timer = setTimeout(tick, 1000);
        return () => {
            active = false;
            if (timer) clearTimeout(timer);
        };
    }, [stopCondition]);
    return now;
}

interface SessionTimerProps {
    session: MinimalSession | null;
}

function SessionTimer({ session }: SessionTimerProps) {
    const terminal = !!session && TERMINAL_STATUSES.includes(session.status_name);
    const now = useSecondsTick(terminal);
    if (!session) return null;
    const startMs = Date.parse(session.created);
    const endRef = terminal && session.modified ? Date.parse(session.modified) : now;
    const elapsed = Number.isFinite(startMs) ? Math.max(0, endRef - startMs) : 0;
    return (
        <div className="cortex-stats-item">
            <span className="cortex-stats-label">SESSION</span>
            <span className="cortex-stats-value">{formatElapsed(elapsed)}</span>
        </div>
    );
}

interface CurrentTurnTimerProps {
    digests: ReasoningTurnDigest[];
    sessionTerminal: boolean;
}

function CurrentTurnTimer({ digests, sessionTerminal }: CurrentTurnTimerProps) {
    // Most-recent in-flight turn = highest-turn_number digest whose
    // status is still in the in-flight set. The digest broadcasts twice
    // per turn — once at start (in-flight status) and once at completion
    // (terminal status). The same turn_id upserts in place; once the
    // second broadcast lands the row drops out of this filter.
    const liveTurn = useMemo<ReasoningTurnDigest | null>(() => {
        const live = digests.filter(d => isInFlight(d.status_name));
        if (live.length === 0) return null;
        return live.reduce((a, b) => (a.turn_number > b.turn_number ? a : b));
    }, [digests]);

    const stopped = sessionTerminal || !liveTurn;
    const now = useSecondsTick(stopped);
    if (!liveTurn || !liveTurn.created) return null;
    const startMs = Date.parse(liveTurn.created);
    const elapsed = Number.isFinite(startMs) ? Math.max(0, now - startMs) : 0;
    return (
        <div className="cortex-stats-item">
            <span className="cortex-stats-label">TURN</span>
            <span className="cortex-stats-value">{formatElapsed(elapsed)}</span>
        </div>
    );
}

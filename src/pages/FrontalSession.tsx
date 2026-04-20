import { useEffect, useState } from 'react';
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
import type { GraphNode } from '../types';
import './FrontalSession.css';

interface CortexStats {
    level: number;
    focus: string;
    xp: number;
    status: string;
    latestThought: string;
}

export function FrontalSession() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();
    const { setCrumbs } = useBreadcrumbs();

    type SessionViewMode = 'graph' | 'chat' | 'parietal';
    const [viewMode, setViewMode] = useState<SessionViewMode>('graph');
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [cortexStats, setCortexStats] = useState<CortexStats | null>(null);

    const { digests } = useSessionDigests(sessionId ?? null);

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

    const isAlive = cortexStats && ['Active', 'Running', 'Pending', 'Thinking'].includes(cortexStats.status);

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

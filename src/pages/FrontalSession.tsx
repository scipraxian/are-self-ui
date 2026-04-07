import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Network, MessageSquare, Terminal } from 'lucide-react';
import { ThreePanel } from '../components/ThreePanel';
import { ReasoningSidebar, ReasoningInspector } from '../components/ReasoningPanels';
import { ReasoningGraph3D } from '../components/ReasoningGraph3D';
import { SessionChat } from '../components/SessionChat';
import { ParietalActivityPanel } from '../components/ParietalActivityPanel';
import { useGABA } from '../context/GABAProvider';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import type { GraphNode, ReasoningSessionData } from '../types';
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
    const [sessionData, setSessionData] = useState<ReasoningSessionData | null>(null);

    // Breadcrumbs
    useEffect(() => {
        if (sessionId) {
            setCrumbs([
                { label: 'Frontal Lobe', path: '/frontal' },
                { label: `Session #${sessionId.slice(0, 6).toUpperCase()}`, path: `/frontal/${sessionId}` },
            ]);
        }
        return () => setCrumbs([]);
    }, [sessionId, setCrumbs]);

    // Redirect if no sessionId
    useEffect(() => {
        if (!sessionId) {
            navigate('/frontal', { replace: true });
        }
    }, [sessionId, navigate]);

    // ESC: switch back through modes, then go back to /frontal
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
                                onSessionDataUpdate={setSessionData}
                            />
                        ) : viewMode === 'chat' ? (
                            <SessionChat
                                sessionId={sessionId}
                                title="SESSION NEURAL LINK"
                            />
                        ) : (
                            <ParietalActivityPanel
                                sessionData={sessionData}
                                onToolSelect={(turnNumber, toolIndex) => {
                                    // Could expand to highlight specific tool in future
                                    console.log(`Selected tool at T${turnNumber}:${toolIndex}`);
                                }}
                            />
                        )}
                    </div>
                </div>
            }
            right={<ReasoningInspector node={selectedNode} sessionId={sessionId} />}
        />
    );
}

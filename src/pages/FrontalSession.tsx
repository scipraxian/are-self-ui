import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { ReasoningSidebar, ReasoningInspector } from '../components/ReasoningPanels';
import { ReasoningGraph3D } from '../components/ReasoningGraph3D';
import { SessionChat } from '../components/SessionChat';
import { useGABA } from '../context/GABAProvider';
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

    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [isSessionChatOpen, setIsSessionChatOpen] = useState(false);
    const [cortexStats, setCortexStats] = useState<CortexStats | null>(null);

    // Redirect if no sessionId
    useEffect(() => {
        if (!sessionId) {
            navigate('/frontal', { replace: true });
        }
    }, [sessionId, navigate]);

    // ESC: close session chat first, then go back to /frontal
    useEffect(() => {
        const unregister = registerEscapeHandler(() => {
            if (isSessionChatOpen) {
                setIsSessionChatOpen(false);
            } else {
                navigate('/frontal');
            }
        });
        return unregister;
    }, [isSessionChatOpen, navigate, registerEscapeHandler]);

    if (!sessionId) return null;

    const isAlive = cortexStats && ['Active', 'Running', 'Pending', 'Thinking'].includes(cortexStats.status);

    return (
        <ThreePanel
            centerClassName="three-panel-center--reasoning-graph"
            left={
                <ReasoningSidebar
                    activeSessionId={sessionId}
                    onSelectSession={(id) => navigate(`/frontal/${id}`)}
                    onExit={() => navigate('/')}
                    onToggleChat={() => setIsSessionChatOpen((prev) => !prev)}
                />
            }
            center={
                <>
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
                    <ReasoningGraph3D
                        sessionId={sessionId}
                        onNodeSelect={setSelectedNode}
                        onStatsUpdate={setCortexStats}
                    />
                    {isSessionChatOpen && (
                        <div className="frontal-session-chat-overlay">
                            <div className="frontal-session-chat-container">
                                <SessionChat
                                    sessionId={sessionId}
                                    title="SESSION OVERRIDE"
                                    onClose={() => setIsSessionChatOpen(false)}
                                />
                            </div>
                        </div>
                    )}
                </>
            }
            right={<ReasoningInspector node={selectedNode} />}
        />
    );
}

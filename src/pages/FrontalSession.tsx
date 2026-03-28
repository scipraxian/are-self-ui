import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { ReasoningSidebar, ReasoningInspector } from '../components/ReasoningPanels';
import { ReasoningGraph3D } from '../components/ReasoningGraph3D';
import { SessionChat } from '../components/SessionChat';
import { useGABA } from '../context/GABAProvider';
import type { GraphNode } from '../types';
import './FrontalSession.css';

export function FrontalSession() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();

    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [isSessionChatOpen, setIsSessionChatOpen] = useState(false);
    // cortexStats will be piped to the footer via context in Step 2
    const [, setCortexStats] = useState<{
        level: number;
        focus: string;
        xp: number;
        status: string;
        latestThought: string;
    } | null>(null);

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

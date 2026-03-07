import { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowLeft, Brain, Terminal, Database, Target, AlertTriangle } from 'lucide-react';

interface FrontalLobeDetailProps {
    sessionId: string;
    onBack: () => void;
}

export const FrontalLobeDetail = ({ sessionId, onBack }: FrontalLobeDetailProps) => {
    const [cortexData, setCortexData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const streamEndRef = useRef<HTMLDivElement>(null);

    const fetchCortexStream = async () => {
        try {
            const res = await fetch(`/api/v1/reasoning_sessions/${sessionId}/graph_data/`);
            if (res.ok) {
                const data = await res.json();
                setCortexData(data);
            }
        } catch (err) {
            console.error("Neural fetch failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCortexStream();
        // Poll the cognitive stream every 3 seconds
        const intervalId = setInterval(fetchCortexStream, 3000);
        return () => clearInterval(intervalId);
    }, [sessionId]);

    // Auto-scroll to the latest thought
    useEffect(() => {
        if (streamEndRef.current) {
            streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [cortexData?.turns]);

    if (isLoading || !cortexData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    const isActive = ['Active', 'Pending'].includes(cortexData.status_name);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '0 10px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
                <button className="btn-ghost" onClick={onBack} style={{ padding: '4px', border: 'none' }}>
                    <ArrowLeft size={18} />
                </button>
                <Brain size={24} color="#a855f7" />
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary">COGNITIVE STREAM</h3>
                    <div className="font-mono text-xs text-muted" style={{ marginTop: '4px' }}>
                        ID: {sessionId.split('-')[0].toUpperCase()} | STATUS: <span style={{ color: isActive ? '#facc15' : '#4ade80' }}>{cortexData.status_name}</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                {/* LEFT: Tactics (The Stream) */}
                <div className="scroll-hidden" style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '24px', paddingRight: '10px' }}>
                    {cortexData.turns?.map((turn: any) => (
                        <div key={turn.id} style={{ borderLeft: '2px solid var(--border-glass)', paddingLeft: '16px', position: 'relative' }}>

                            <div style={{ position: 'absolute', left: '-6px', top: '0', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-purple)' }}></div>

                            <div className="font-mono text-xs text-muted" style={{ marginBottom: '8px', color: 'var(--accent-purple)', fontWeight: 800 }}>
                                TURN {turn.turn_number}
                            </div>

                            {/* Thought Process */}
                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '12px' }}>
                                <div className="font-mono text-xs" style={{ color: '#64748b', marginBottom: '8px', textTransform: 'uppercase' }}>Internal Monologue</div>
                                <div style={{ color: '#e2e8f0', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    {turn.thought_process || "Processing..."}
                                </div>
                            </div>

                            {/* Tools Executed */}
                            {turn.tool_calls?.map((call: any, idx: number) => (
                                <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-blue)', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                        <Terminal size={14} color="var(--accent-blue)" />
                                        <span className="font-mono text-sm" style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{call.tool_name}</span>
                                    </div>

                                    <div className="font-mono text-xs" style={{ color: '#94a3b8', padding: '8px', background: '#000', borderRadius: '4px', overflowX: 'auto', marginBottom: '8px' }}>
                                        {call.arguments}
                                    </div>

                                    {call.result_payload && (
                                        <details>
                                            <summary className="font-mono text-xs text-muted" style={{ cursor: 'pointer', outline: 'none' }}>View Result</summary>
                                            <div className="font-mono text-xs" style={{ color: '#4ade80', padding: '8px', background: '#000', borderRadius: '4px', marginTop: '4px', overflowX: 'auto', maxHeight: '150px', overflowY: 'auto' }}>
                                                {call.result_payload}
                                            </div>
                                        </details>
                                    )}
                                    {call.traceback && (
                                        <div className="font-mono text-xs" style={{ color: '#ef4444', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px', marginTop: '4px', overflowX: 'auto' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: 800 }}><AlertTriangle size={12}/> Traceback</div>
                                            {call.traceback}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                    <div ref={streamEndRef} />
                </div>

                {/* RIGHT: Memory & Strategy */}
                <div className="scroll-hidden" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Strategy */}
                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Target size={16} color="var(--accent-gold)" />
                            <span className="font-display text-sm" style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.1em' }}>ACTIVE DIRECTIVES</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {cortexData.goals?.map((goal: any) => (
                                <div key={goal.id} style={{ fontSize: '0.85rem', color: '#cbd5e1', paddingLeft: '8px', borderLeft: `2px solid ${goal.achieved ? '#4ade80' : '#facc15'}` }}>
                                    {goal.rendered_goal}
                                </div>
                            ))}
                            {cortexData.goals?.length === 0 && <div className="text-xs text-muted font-mono">No directives established.</div>}
                        </div>
                    </div>

                    {/* Engrams */}
                    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <Database size={16} color="var(--accent-green)" />
                            <span className="font-display text-sm" style={{ color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.1em' }}>ENGRAMS (MEMORY)</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {cortexData.engrams?.map((engram: any) => (
                                <div key={engram.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '4px', border: '1px solid var(--border-glass)' }}>
                                    <div className="font-mono text-xs" style={{ color: 'var(--accent-green)', fontWeight: 700, marginBottom: '4px' }}>{engram.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{engram.description}</div>
                                </div>
                            ))}
                            {cortexData.engrams?.length === 0 && <div className="text-xs text-muted font-mono">Memory banks empty.</div>}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
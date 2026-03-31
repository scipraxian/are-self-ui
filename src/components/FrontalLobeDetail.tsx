import "./FrontalLobeDetail.css";
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
            <div className="common-layout-25">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    const isActive = ['Active', 'Pending'].includes(cortexData.status_name);

    return (
        <div className="common-layout-26">
            {/* Header */}
            <div className="frontallobedetail-ui-73">
                <button className="btn-ghost frontallobedetail-ui-72" onClick={onBack}>
                    <ArrowLeft size={18} />
                </button>
                <Brain size={24} color="#a855f7" />
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary">COGNITIVE STREAM</h3>
                    <div className="font-mono text-xs text-muted common-layout-27">
                        ID: {sessionId.split('-')[0].toUpperCase()} | STATUS:{' '}
                        <span className={`frontallobedetail-status ${isActive ? 'frontallobedetail-status--active' : 'frontallobedetail-status--inactive'}`}>
                            {cortexData.status_name}
                        </span>
                    </div>
                </div>
            </div>

            <div className="frontallobedetail-ui-71">
                {/* LEFT: Tactics (The Stream) */}
                <div className="scroll-hidden frontallobedetail-ui-70">
                    {cortexData.turns?.map((turn: any) => (
                        <div className="frontallobedetail-ui-69" key={turn.id}>

                            <div className="frontallobedetail-ui-68"></div>

                            <div className="font-mono text-xs text-muted frontallobedetail-ui-67">
                                TURN {turn.turn_number}
                            </div>

                            {/* Thought Process */}
                            <div className="frontallobedetail-ui-66">
                                <div className="font-mono text-xs frontallobedetail-ui-65">Internal Monologue</div>
                                <div className="frontallobedetail-ui-64">
                                    {turn.thought_process || "Processing..."}
                                </div>
                            </div>

                            {/* Tools Executed */}
                            {turn.tool_calls?.map((call: any, idx: number) => (
                                <div className="frontallobedetail-ui-63" key={idx}>
                                    <div className="frontallobedetail-ui-62">
                                        <Terminal size={14} color="var(--accent-blue)" />
                                        <span className="font-mono text-sm frontallobedetail-ui-61">{call.tool_name}</span>
                                    </div>

                                    <div className="font-mono text-xs frontallobedetail-ui-60">
                                        {call.arguments}
                                    </div>

                                    {call.result_payload && (
                                        <details>
                                            <summary className="font-mono text-xs text-muted frontallobedetail-ui-59">View Result</summary>
                                            <div className="font-mono text-xs frontallobedetail-ui-58">
                                                {call.result_payload}
                                            </div>
                                        </details>
                                    )}
                                    {call.traceback && (
                                        <div className="font-mono text-xs frontallobedetail-ui-57">
                                            <div className="frontallobedetail-ui-56"><AlertTriangle size={12}/> Traceback</div>
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
                <div className="scroll-hidden frontallobedetail-ui-55">

                    {/* Strategy */}
                    <div className="frontallobedetail-ui-54">
                        <div className="common-layout-28">
                            <Target size={16} color="var(--accent-gold)" />
                            <span className="font-display text-sm frontallobedetail-ui-53">ACTIVE DIRECTIVES</span>
                        </div>
                        <div className="common-layout-6">
                            {cortexData.goals?.map((goal: any) => (
                                <div
                                    key={goal.id}
                                    className={`frontallobedetail-goal ${goal.achieved ? 'frontallobedetail-goal--achieved' : 'frontallobedetail-goal--pending'}`}
                                >
                                    {goal.rendered_goal}
                                </div>
                            ))}
                            {cortexData.goals?.length === 0 && <div className="text-xs text-muted font-mono">No directives established.</div>}
                        </div>
                    </div>

                    {/* Engrams */}
                    <div className="frontallobedetail-ui-52">
                        <div className="common-layout-28">
                            <Database size={16} color="var(--accent-green)" />
                            <span className="font-display text-sm frontallobedetail-ui-51">ENGRAMS (MEMORY)</span>
                        </div>
                        <div className="common-layout-6">
                            {cortexData.engrams?.map((engram: any) => (
                                <div className="frontallobedetail-ui-50" key={engram.id}>
                                    <div className="font-mono text-xs frontallobedetail-ui-49">{engram.name}</div>
                                    <div className="common-layout-29">{engram.description}</div>
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
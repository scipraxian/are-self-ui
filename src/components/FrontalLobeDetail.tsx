import "./FrontalLobeDetail.css";
import { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowLeft, Brain, Terminal, AlertTriangle } from 'lucide-react';
import { useDendrite } from './SynapticCleft';
import type {
    ReasoningSessionData,
    ReasoningTurnData,
    ReasoningTurnDigest,
    ToolCallData,
} from '../types';

interface FrontalLobeDetailProps {
    sessionId: string;
    onBack: () => void;
}

export const FrontalLobeDetail = ({ sessionId, onBack }: FrontalLobeDetailProps) => {
    const [session, setSession] = useState<ReasoningSessionData | null>(null);
    const [digests, setDigests] = useState<ReasoningTurnDigest[]>([]);
    const [expandedTurnId, setExpandedTurnId] = useState<string | null>(null);
    const [turnDetail, setTurnDetail] = useState<ReasoningTurnData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const streamEndRef = useRef<HTMLDivElement>(null);

    const sessionEvent = useDendrite('ReasoningSession', sessionId);
    const digestEvent = useDendrite('ReasoningTurnDigest', null);

    // Lightweight session fetch on mount + when the session status flips.
    useEffect(() => {
        let cancelled = false;
        if (!sessionId) return;
        const load = async () => {
            try {
                const res = await fetch(`/api/v2/reasoning_sessions/${sessionId}/`);
                if (!res.ok || cancelled) return;
                const data: ReasoningSessionData = await res.json();
                if (cancelled) return;
                setSession(data);
            } catch (err) {
                console.error('Failed to fetch session', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId, sessionEvent]);

    // Cold-start digest pull on mount.
    useEffect(() => {
        let cancelled = false;
        if (!sessionId) return;
        const load = async () => {
            try {
                const res = await fetch(
                    `/api/v2/reasoning_sessions/${sessionId}/graph_data/?since_turn_number=-1`
                );
                if (!res.ok || cancelled) return;
                const list: ReasoningTurnDigest[] = await res.json();
                if (cancelled) return;
                setDigests(list);
            } catch (err) {
                console.error('Failed to fetch digests', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId]);

    // Live push — upsert digests for this session.
    useEffect(() => {
        if (!digestEvent) return;
        const vesicle = digestEvent.vesicle as ReasoningTurnDigest | undefined;
        if (!vesicle || vesicle.session_id !== sessionId) return;
        setDigests(prev => {
            const idx = prev.findIndex(d => d.turn_id === vesicle.turn_id);
            if (idx === -1) return [...prev, vesicle].sort((a, b) => a.turn_number - b.turn_number);
            const next = prev.slice();
            next[idx] = vesicle;
            return next;
        });
    }, [digestEvent, sessionId]);

    // Per-turn fetch on explicit expand. Never cached on the session.
    useEffect(() => {
        let cancelled = false;
        if (!expandedTurnId) {
            setTurnDetail(null);
            return;
        }
        setTurnDetail(null);
        const load = async () => {
            try {
                const res = await fetch(`/api/v2/reasoning_turns/${expandedTurnId}/`);
                if (!res.ok || cancelled) return;
                const data: ReasoningTurnData = await res.json();
                if (cancelled) return;
                setTurnDetail(data);
            } catch (err) {
                console.error('Failed to fetch turn detail', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [expandedTurnId]);

    useEffect(() => {
        if (streamEndRef.current) {
            streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [digests]);

    if (isLoading || !session) {
        return (
            <div className="common-layout-25">
                <Loader2 className="animate-spin text-muted" size={32} />
            </div>
        );
    }

    const isActive = ['Active', 'Pending', 'Running', 'Thinking'].includes(session.status_name);

    return (
        <div className="common-layout-26">
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
                            {session.status_name}
                        </span>
                    </div>
                </div>
            </div>

            <div className="frontallobedetail-ui-71">
                <div className="scroll-hidden frontallobedetail-ui-70">
                    {digests.map(digest => {
                        const isExpanded = expandedTurnId === digest.turn_id;
                        const fullTurn = isExpanded ? turnDetail : null;
                        return (
                            <div className="frontallobedetail-ui-69" key={digest.turn_id}>

                                <div className="frontallobedetail-ui-68"></div>

                                <div className="font-mono text-xs text-muted frontallobedetail-ui-67">
                                    TURN {digest.turn_number}
                                </div>

                                <div className="frontallobedetail-ui-66">
                                    <div className="font-mono text-xs frontallobedetail-ui-65">Internal Monologue</div>
                                    <div className="frontallobedetail-ui-64">
                                        {digest.excerpt || 'Processing...'}
                                    </div>
                                </div>

                                {/* Compact summary from digest — always present */}
                                {(digest.tool_calls_summary || []).map((call, idx: number) => (
                                    <div className="frontallobedetail-ui-63" key={`summary-${idx}`}>
                                        <div className="frontallobedetail-ui-62">
                                            <Terminal size={14} color="var(--accent-blue)" />
                                            <span className="font-mono text-sm frontallobedetail-ui-61">{call.tool_name}</span>
                                        </div>
                                        <div className="font-mono text-xs frontallobedetail-ui-60">
                                            {call.target || '—'}
                                            {call.success === true ? ' ✓' : call.success === false ? ' ✗' : ' ○'}
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="btn-ghost frontallobedetail-expand-btn"
                                    onClick={() => setExpandedTurnId(isExpanded ? null : digest.turn_id)}
                                >
                                    {isExpanded ? 'Collapse' : 'Show full payloads'}
                                </button>

                                {/* Full tool calls — only when explicitly expanded */}
                                {isExpanded && fullTurn?.tool_calls?.map((call: ToolCallData, idx: number) => (
                                    <div className="frontallobedetail-ui-63" key={`full-${idx}`}>
                                        <div className="frontallobedetail-ui-62">
                                            <Terminal size={14} color="var(--accent-blue)" />
                                            <span className="font-mono text-sm frontallobedetail-ui-61">{call.tool_name}</span>
                                        </div>
                                        <div className="font-mono text-xs frontallobedetail-ui-60">
                                            {typeof call.arguments === 'object' ? JSON.stringify(call.arguments) : String(call.arguments || '')}
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
                        );
                    })}
                    <div ref={streamEndRef} />
                </div>
            </div>
        </div>
    );
};

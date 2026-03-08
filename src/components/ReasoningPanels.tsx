import "./ReasoningPanels.css";
import {type ReactNode, useEffect, useState} from 'react';
import { Power, RefreshCw, LogOut, Terminal, Database, Target, Download } from 'lucide-react';
import type {GraphNode, ReasoningSessionData, ToolCallData} from "../types.ts";

// --- HELPER COMPONENT: Reusable Accordion ---
interface AccordionProps {
    title: string;
    color: string;
    open?: boolean;
    children: ReactNode;
}

const Accordion = ({ title, color, open = false, children }: AccordionProps) => {
    return (
        <details open={open} style={{ marginBottom: '10px', border: `1px solid ${color}`, borderRadius: '8px', background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <summary style={{ backgroundColor: `${color}33`, color: color, padding: '8px 15px', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                ► {title}
            </summary>
            <div className="common-layout-7">
                {children}
            </div>
        </details>
    );
};

// --- LEFT PANEL: Threads & Controls ---
interface ReasoningSidebarProps {
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onExit: () => void;
}

export const ReasoningSidebar = ({ activeSessionId, onSelectSession, onExit }: ReasoningSidebarProps) => {
    const [sessions, setSessions] = useState<ReasoningSessionData[]>([]);

    useEffect(() => {
        fetch('/api/v1/reasoning_sessions/')
            .then(res => res.json())
            .then(data => setSessions(data.results || data));
    }, []);

    const handleAction = async (action: string) => {
        if (!confirm(`Are you sure you want to ${action} this session?`)) return;
        const csrfToken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || '';
        await fetch(`/api/v1/reasoning_sessions/${activeSessionId}/${action}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' }
        });
    };

    const handleDump = async () => {
        try {
            const res = await fetch(`/api/v1/reasoning_sessions/${activeSessionId}/graph_data/`);
            const data = await res.json();
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
            const a = document.createElement('a');
            a.href = dataStr;
            a.download = `talos_cortex_dump_${activeSessionId}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            console.error("Dump failed", e);
        }
    };

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isAlive = activeSession && ['Active', 'Pending', 'Running', 'Thinking'].includes(activeSession.status_name);

    return (
        <div className="reasoningpanels-ui-184">
            <h2 className="glass-panel-title reasoningpanels-ui-183">COGNITIVE THREADS</h2>
            <div className="scroll-hidden reasoningpanels-ui-182">
                {sessions.map(s => (
                    <div key={s.id} onClick={() => onSelectSession(s.id)}
                         style={{
                             padding: '12px', borderRadius: '8px', cursor: 'pointer',
                             background: s.id === activeSessionId ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.02)',
                             border: `1px solid ${s.id === activeSessionId ? '#a855f7' : 'var(--border-glass)'}`
                         }}>
                        <div className="font-mono text-xs reasoningpanels-ui-181">{s.id.split('-')[0].toUpperCase()}</div>
                        <div className="font-mono text-xs" style={{ color: s.status_name === 'Active' ? '#facc15' : '#94a3b8', marginTop: '4px' }}>
                            {s.status_name}
                        </div>
                    </div>
                ))}
            </div>

            {activeSessionId && (
                <div className="reasoningpanels-ui-180">
                    {isAlive ? (
                        <button className="btn-ghost reasoningpanels-ui-179" onClick={() => handleAction('stop')}>
                            <Power size={14} /> HALT CORTEX
                        </button>
                    ) : (
                        <>
                            <button className="btn-ghost reasoningpanels-ui-178" onClick={() => handleAction('rerun')}>
                                <RefreshCw size={14} /> REBOOT CORTEX
                            </button>
                            <button className="btn-ghost reasoningpanels-ui-177" onClick={handleDump}>
                                <Download size={14} /> DUMP DATA
                            </button>
                        </>
                    )}
                    <button className="btn-ghost reasoningpanels-ui-176" onClick={onExit}>
                        <LogOut size={14} /> EXIT TO MAP
                    </button>
                </div>
            )}
        </div>
    );
};
// --- RIGHT PANEL: Node Inspector Parity ---
interface ReasoningInspectorProps {
    node: GraphNode | null;
}

export const ReasoningInspector = ({ node }: ReasoningInspectorProps) => {
    if (!node) return <div className="bbb-placeholder font-mono text-sm">Select a node on the graph.</div>;

    // We cast the strictly-typed GraphNode to 'any' locally for the JSX template to satisfy React's strict DOM limits.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = node as any;

    const getAdminUrl = (nodeData: GraphNode) => {
        if (!nodeData || !nodeData.id) return '#';

        // Strip out the prefix (e.g., "turn-15" becomes "15")
        const dbId = String(nodeData.id).split('-').slice(1).join('-');

        switch (nodeData.type) {
            case 'turn':
                return `/admin/frontal_lobe/reasoningturn/${dbId}/change/`;
            case 'goal':
                return `/admin/frontal_lobe/reasoninggoal/${dbId}/change/`;
            case 'session':
                return `/admin/frontal_lobe/reasoningsession/${dbId}/change/`;
            case 'engram':
                return `/admin/hippocampus/talosengram/${dbId}/change/`;
            case 'conclusion':
                return `/admin/frontal_lobe/sessionconclusion/${dbId}/change/`;
            case 'tool': {
                const toolName = (nodeData.tool_name || nodeData.label) as string;
                return `/admin/parietal_lobe/tooldefinition/?q=${toolName}`;
            }
            default:
                return '#';
        }
    };

    // FIX 2: Strictly type the payload based on our Turn payload structure
    const renderPayload = (payload: { messages?: { role: string; content: string }[] } | string) => {
        if (!payload || typeof payload === 'string' || !payload.messages) return null;

        return payload.messages.map((msg, i: number) => {
            const roleStr = String(msg.role).toUpperCase();
            const roleColor = msg.role === 'system' ? '#cc99cc' : (msg.role === 'user' ? '#99ccff' : '#4ade80');

            return (
                <Accordion key={i} title={`[${roleStr}] PROMPT`} color={roleColor}>
                    {msg.role === 'user' ? (
                        msg.content.split(/^(?=\[[A-Z0-9\s:()-]+\])/m).map((sec: string, idx: number) => {
                            if (!sec.trim()) return null;
                            const match = sec.trim().match(/^\[([^\]]+)\](.*[\s\S]*)/);
                            if (match) {
                                const title = match[1];
                                const body = match[2].trim();
                                let innerColor = '#99ccff';
                                if (title.includes("DIAGNOSTICS")) innerColor = '#ef4444';
                                else if (title.includes("WAKING")) innerColor = '#facc15';
                                else if (title.includes("LOG")) innerColor = '#f99f1b';

                                return (
                                    <Accordion key={idx} title={title} color={innerColor}>
                                        <pre className="reasoningpanels-ui-175">
                                            {body}
                                        </pre>
                                    </Accordion>
                                );
                            }
                            return <div className="reasoningpanels-ui-174" key={idx}>{sec.trim()}</div>;
                        })
                    ) : (
                        <pre className="reasoningpanels-ui-173">
                            {msg.content}
                        </pre>
                    )}
                </Accordion>
            );
        });
    };

    return (
        <div className="scroll-hidden common-layout-8">
            <div className="common-layout-9">
                <h2 className="glass-panel-title reasoningpanels-ui-172">
                    {String(n.type).toUpperCase()} DETAILS
                </h2>

                {n.type === 'turn' && (
                    <div className="common-layout-10">
                        <div className="common-layout-11">
                            <div className="reasoningpanels-ui-171">TURN {n.turn_number}</div>
                            <div className="common-layout-12">IN {n.tokens_input}</div>
                            <div className="reasoningpanels-ui-170">OUT {n.tokens_output}</div>
                            <div className="reasoningpanels-ui-169">{n.inference_time || n.delta || '--'}</div>
                        </div>

                        <div style={{ color: n.status_name === 'Error' ? '#ef4444' : '#4ade80', fontWeight: 700, marginTop: '8px', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>Status: {n.status_name}</div>

                        {n.thought_process && (
                            <Accordion title="THOUGHT PROCESS" color="#cc99cc" open>
                                <div className="reasoningpanels-ui-168">
                                    {String(n.thought_process).replace(/^(THOUGHT:\s*)+/i, '').trim()}
                                </div>
                            </Accordion>
                        )}

                        {n.request_payload && (
                            <Accordion title="VIEW REQUEST PAYLOAD" color="#f99f1b">
                                {renderPayload(n.request_payload)}
                            </Accordion>
                        )}

                        {n.tool_calls && Array.isArray(n.tool_calls) && n.tool_calls.length > 0 && (
                            <Accordion title={`TOOL CALLS (${n.tool_calls.length})`} color="#4ade80" open>
                                <div className="common-layout-14">
                                    {/* FIX 3: Strictly type the call parameter using ToolCallData */}
                                    {n.tool_calls.map((call: ToolCallData, idx: number) => {
                                        const isError = call.traceback || (call.result_payload && String(call.result_payload).includes('FIZZLE'));
                                        const callColor = isError ? '#ef4444' : '#4ade80';
                                        const argsStr = typeof call.arguments === 'object' ? JSON.stringify(call.arguments, null, 2) : String(call.arguments || '');

                                        return (
                                            <div key={idx} style={{ border: `1px solid ${callColor}`, borderRadius: '4px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                                <div style={{ color: callColor, fontWeight: 'bold', marginBottom: '10px', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                                                    &gt; CALL [{idx + 1}]: {call.tool_name}
                                                </div>
                                                <Accordion title="ARGUMENTS" color="#99ccff">
                                                    <pre className="reasoningpanels-ui-167">
                                                        {argsStr || '{}'}
                                                    </pre>
                                                </Accordion>
                                                <Accordion title="RESULT" color={callColor}>
                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: callColor, overflowX: 'auto' }}>
                                                        {call.result_payload || call.traceback || "Pending..."}
                                                    </pre>
                                                </Accordion>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Accordion>
                        )}
                    </div>
                )}

                {n.type === 'tool' && (
                    <div className="common-layout-32">
                        <div className="reasoningpanels-ui-166">
                            <Terminal size={16} /> {n.tool_name || n.label}
                        </div>

                        <Accordion title="ARGUMENTS" color="#38bdf8" open>
                            <pre className="reasoningpanels-ui-165">
                                {n.arguments ? (typeof n.arguments === 'object' ? JSON.stringify(n.arguments, null, 2) : String(n.arguments)) : '{}'}
                            </pre>
                        </Accordion>

                        <Accordion title="RESULT" color={n.traceback ? '#ef4444' : '#4ade80'} open>
                            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: n.traceback ? '#ef4444' : '#4ade80', maxHeight: '400px', overflowY: 'auto' }}>
                                {n.result_payload || n.traceback || "Pending..."}
                            </pre>
                        </Accordion>
                    </div>
                )}

                {n.type === 'conclusion' && (
                    <div className="common-layout-32">
                        <Accordion title="EXECUTIVE SUMMARY" color="#4ade80" open>
                            <div className="reasoningpanels-ui-164">
                                {n.summary}
                            </div>
                        </Accordion>
                        <Accordion title="REASONING TRACE" color="#a855f7">
                            <div className="reasoningpanels-ui-163">
                                {n.reasoning_trace}
                            </div>
                        </Accordion>
                        <div className="reasoningpanels-ui-162">
                            <div className="reasoningpanels-ui-161">
                                <div className="reasoningpanels-ui-160">Outcome Status</div>
                                <div className="reasoningpanels-ui-159">{n.outcome_status}</div>
                            </div>
                            <div className="reasoningpanels-ui-158">
                                <div className="reasoningpanels-ui-157">Recommended Action</div>
                                <div className="reasoningpanels-ui-156">{n.recommended_action}</div>
                            </div>
                        </div>
                    </div>
                )}

                {n.type === 'engram' && (
                    <div className="common-layout-32">
                        <div className="reasoningpanels-ui-155">
                            <Database size={16} /> {n.name}
                        </div>
                        <div className="common-layout-13">
                            {n.description}
                        </div>
                        <div className="font-mono text-xs text-muted">Relevance: {n.relevance_score}</div>
                    </div>
                )}

                {n.type === 'goal' && (
                    <div className="common-layout-32">
                        <div className="reasoningpanels-ui-154">
                            <Target size={16} /> {n.label}
                        </div>
                        <div className="common-layout-13">
                            {n.rendered_goal}
                        </div>
                    </div>
                )}
            </div>

            <div className="common-layout-16">
                {/* Note we pass `node` instead of `n` here so we pass the strictly typed variable to the helper */}
                <a className="common-layout-17"
                    href={getAdminUrl(node)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    ACCESS DB RECORD ↗
                </a>
            </div>
        </div>
    );
};
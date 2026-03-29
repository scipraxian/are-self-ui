import "./ReasoningPanels.css";
import { type ReactNode, useEffect, useState } from 'react';
import { Power, RefreshCw, Terminal, Database, Target, Download, MessageSquare } from 'lucide-react';
import type {
    GraphNode,
    ModelUsageRecord,
    ReasoningSessionData,
    ReasoningTurnData,
    ToolCallData
} from "../types.ts";
import { getCookie } from '../api';

// --- Shared thought extraction (same logic as ReasoningGraph3D) ---
const extractThoughtFromUsageRecord = (record?: ModelUsageRecord): string => {
    if (!record?.response_payload?.choices?.length) return '';
    const message = record.response_payload.choices[0].message;

    if (typeof message.content === 'string' && message.content.trim()) {
        return message.content.trim();
    }

    if (Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls) {
            if (tc.function?.name === 'mcp_respond_to_user') {
                try {
                    const parsed = JSON.parse(tc.function.arguments);
                    if (typeof parsed.thought === 'string' && parsed.thought.trim()) {
                        return parsed.thought.trim();
                    }
                } catch { /* ignore parse errors */ }
            }
        }
    }

    return '';
};

// --- HELPER COMPONENT: Reusable Accordion ---
interface AccordionProps {
    title: string;
    color: string;
    open?: boolean;
    children: ReactNode;
}

const Accordion = ({ title, color, open = false, children }: AccordionProps) => {
    const accentVars = { '--accordion-accent': color } as React.CSSProperties;
    return (
        <details open={open} className="accordion-panel" style={accentVars}>
            <summary className="accordion-summary">
                ► {title}
            </summary>
            <div className="accordion-content">
                {children}
            </div>
        </details>
    );
};

// --- LEFT PANEL: Threads & Controls ---
interface ReasoningSidebarProps {
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onExit?: () => void;
    onToggleChat: () => void;
}

export const ReasoningSidebar = ({ activeSessionId, onSelectSession, onToggleChat }: ReasoningSidebarProps) => {
    const [sessions, setSessions] = useState<ReasoningSessionData[]>([]);

    useEffect(() => {
        fetch('/api/v1/reasoning_sessions/')
            .then(res => res.json())
            .then(data => setSessions(data.results || data));
    }, []);

    const handleAction = async (action: string) => {
        if (!confirm(`Are you sure you want to ${action} this session?`)) return;
        const csrfToken = getCookie('csrftoken') || '';
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
        <div className="sidebar-root">
            <h2 className="glass-panel-title sidebar-title">COGNITIVE THREADS</h2>
            <div className="scroll-hidden sidebar-session-list">
                {sessions.map(s => {
                    const isActive = s.id === activeSessionId;
                    const isStatusActive = s.status_name === 'Active';
                    return (
                        <div
                            key={s.id}
                            onClick={() => onSelectSession(s.id)}
                            className={`reasoningpanels-session-card ${isActive ? 'reasoningpanels-session-card--active' : ''}`}
                        >
                            <div className="font-mono text-xs sidebar-session-id">
                                {s.id.split('-')[0].toUpperCase()}
                            </div>
                            <div className={`font-mono text-xs reasoningpanels-status-text ${isStatusActive ? 'reasoningpanels-status-text--active' : ''}`}>
                                {s.status_name} - {new Date(s.created).toLocaleString()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {activeSessionId && (
                <div className="sidebar-action-group">
                    <button className="btn-ghost reasoningpanels-btn-override" onClick={onToggleChat}>
                        <MessageSquare size={14} /> MANUAL OVERRIDE
                    </button>

                    {isAlive ? (
                        <button className="btn-ghost sidebar-btn--halt" onClick={() => handleAction('stop')}>
                            <Power size={14} /> HALT CORTEX
                        </button>
                    ) : (
                        <>
                            <button className="btn-ghost sidebar-btn--reboot" onClick={() => handleAction('rerun')}>
                                <RefreshCw size={14} /> REBOOT CORTEX
                            </button>
                            <button className="btn-ghost sidebar-btn--dump" onClick={handleDump}>
                                <Download size={14} /> DUMP DATA
                            </button>
                        </>
                    )}
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = node as any;

    const getAdminUrl = (nodeData: GraphNode) => {
        if (!nodeData || !nodeData.id) return '#';
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

    const renderMessages = (messages: Array<{ role: string; content: string }>) => {
        return messages.map((msg, i: number) => {
            const roleStr = String(msg.role).toUpperCase();
            let roleColor =
                msg.role === 'system' ? '#cc99cc' :
                    msg.role === 'user' ? '#99ccff' :
                        '#4ade80';

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
                                        <pre className="inspector-pre-text--muted">
                                            {body}
                                        </pre>
                                    </Accordion>
                                );
                            }
                            return <div className="inspector-muted-text" key={idx}>{sec.trim()}</div>;
                        })
                    ) : (
                        <pre className="inspector-pre-text">
                            {msg.content}
                        </pre>
                    )}
                </Accordion>
            );
        });
    };

    return (
        <div className="scroll-hidden inspector-root">
            <div className="inspector-body">
                <h2 className="glass-panel-title inspector-section-title">
                    {String(n.type).toUpperCase()} DETAILS
                </h2>

                {n.type === 'turn' && (
                    <div className="inspector-turn-content">
                        {(() => {
                            const turn = n as ReasoningTurnData;
                            const tokensIn = turn.model_usage_record?.input_tokens ?? 0;
                            const tokensOut = turn.model_usage_record?.output_tokens ?? 0;
                            const timing = turn.model_usage_record?.query_time || turn.delta || '--';
                            const modelName = turn.model_usage_record?.ai_model_provider?.ai_model?.name || 'Unknown';
                            const turnThought = extractThoughtFromUsageRecord(turn.model_usage_record);
                            const messages = turn.model_usage_record?.request_payload || [];
                            const hasMessages = Array.isArray(messages) && messages.length > 0;
                            const statusClass = n.status_name === 'Error'
                                ? 'inspector-status--error'
                                : ['Active', 'Running', 'Pending', 'Thinking'].includes(n.status_name)
                                    ? 'inspector-status--active'
                                    : 'inspector-status--completed';
                            return (
                                <>
                        <div className="inspector-badge-row">
                            <div className="inspector-badge--turn">TURN {turn.turn_number}</div>
                            <div className="inspector-badge--tokens-in">IN {tokensIn}</div>
                            <div className="inspector-badge--tokens-out">OUT {tokensOut}</div>
                            <div className="inspector-badge--timing">{timing}</div>
                        </div>

                        <div className={`inspector-status-line ${statusClass}`}>
                            Status: {n.status_name} | Model: {modelName}
                        </div>

                        {turnThought && (
                            <Accordion title="THOUGHT PROCESS" color="#cc99cc" open>
                                <div className="inspector-thought-text">
                                    {turnThought}
                                </div>
                            </Accordion>
                        )}

                        {hasMessages && (
                            <Accordion title="CONVERSATION LOG" color="#f99f1b">
                                {renderMessages(messages)}
                            </Accordion>
                        )}

                        {turn.tool_calls && Array.isArray(turn.tool_calls) && turn.tool_calls.length > 0 && (
                            <Accordion title={`TOOL CALLS (${n.tool_calls.length})`} color="#4ade80" open>
                                <div className="inspector-tool-call-list">
                                    {turn.tool_calls.map((call: ToolCallData, idx: number) => {
                                        const isError = call.traceback || (call.result_payload && String(call.result_payload).includes('FIZZLE'));
                                        const errorClass = isError ? 'inspector-tool-call--error' : '';
                                        const argsStr = typeof call.arguments === 'object' ? JSON.stringify(call.arguments, null, 2) : String(call.arguments || '');

                                        return (
                                            <div key={idx} className={`inspector-tool-call ${errorClass}`}>
                                                <div className="inspector-tool-call-header">
                                                    &gt; CALL [{idx + 1}]: {call.tool_name}
                                                </div>
                                                <Accordion title="ARGUMENTS" color="#99ccff">
                                                    <pre className="inspector-args-pre--blue">
                                                        {argsStr || '{}'}
                                                    </pre>
                                                </Accordion>
                                                <Accordion title="RESULT" color={isError ? '#ef4444' : '#4ade80'}>
                                                    <pre className="inspector-tool-result">
                                                        {call.result_payload || call.traceback || "Pending..."}
                                                    </pre>
                                                </Accordion>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Accordion>
                        )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {n.type === 'tool' && (
                    <div className="inspector-node-content">
                        <div className="inspector-tool-header">
                            <Terminal size={16} /> {n.tool_name || n.label}
                        </div>

                        <Accordion title="ARGUMENTS" color="#38bdf8" open>
                            <pre className="inspector-args-pre">
                                {n.arguments ? (typeof n.arguments === 'object' ? JSON.stringify(n.arguments, null, 2) : String(n.arguments)) : '{}'}
                            </pre>
                        </Accordion>

                        <Accordion title="RESULT" color={n.traceback ? '#ef4444' : '#4ade80'} open>
                            <pre className={`inspector-tool-result ${n.traceback ? 'inspector-tool-result--error' : ''}`}>
                                {n.result_payload || n.traceback || "Pending..."}
                            </pre>
                        </Accordion>
                    </div>
                )}

                {n.type === 'conclusion' && (
                    <div className="inspector-node-content">
                        <Accordion title="EXECUTIVE SUMMARY" color="#4ade80" open>
                            <div className="inspector-summary-text">
                                {n.summary}
                            </div>
                        </Accordion>
                        <Accordion title="REASONING TRACE" color="#a855f7">
                            <div className="inspector-trace-text">
                                {n.reasoning_trace}
                            </div>
                        </Accordion>
                        <div className="inspector-conclusion-fields">
                            <div className="inspector-field-box--blue">
                                <div className="inspector-field-label--blue">Outcome Status</div>
                                <div className="inspector-field-value-alt">{n.outcome_status}</div>
                            </div>
                            <div className="inspector-field-box--orange">
                                <div className="inspector-field-label--orange">Recommended Action</div>
                                <div className="inspector-field-value">{n.recommended_action}</div>
                            </div>
                        </div>
                    </div>
                )}

                {n.type === 'engram' && (
                    <div className="inspector-node-content">
                        <div className="inspector-engram-header">
                            <Database size={16} /> {n.name}
                        </div>
                        <div className="inspector-description-box">
                            {n.description}
                        </div>
                        <div className="font-mono text-xs text-muted">Relevance: {n.relevance_score}</div>
                    </div>
                )}

                {n.type === 'goal' && (
                    <div className="inspector-node-content">
                        <div className="inspector-goal-header">
                            <Target size={16} /> {n.label}
                        </div>
                        <div className="inspector-description-box">
                            {n.rendered_goal}
                        </div>
                    </div>
                )}
            </div>

            <div className="inspector-admin-section">
                <a className="inspector-admin-link"
                    href={getAdminUrl(node)}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ACCESS DB RECORD ↗
                </a>
            </div>
        </div>
    );
};

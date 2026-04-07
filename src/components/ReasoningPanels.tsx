import "./ReasoningPanels.css";
import { type ReactNode, useEffect, useState } from 'react';
import { Power, RefreshCw, Terminal, Database, Target, Download, MessageSquare } from 'lucide-react';
import { useDendrite } from './SynapticCleft';
import type {
    GraphNode,
    ModelUsageRecord,
    ReasoningSessionData,
    ReasoningTurnData,
    ToolCallData,
    TalosEngramData,
    SessionConclusionData
} from "../types.ts";
import { getCookie } from '../api';
import { summarizeTool } from '../utils/toolFormatters';

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

// --- SESSION OVERVIEW CARD (when node is null) ---
interface SessionOverviewCardProps {
    session: ReasoningSessionData;
}

const SessionOverviewCard = ({ session }: SessionOverviewCardProps) => {
    // Session ID prefix + identity name
    const sessionIdPrefix = session.id?.split('-')[0]?.toUpperCase() || 'SESSION';

    // Status and turn count
    const turnCount = session.turns?.length || 0;
    const statusBadgeClass = session.status_name === 'Error'
        ? 'session-overview-status--error'
        : ['Active', 'Running', 'Pending', 'Thinking'].includes(session.status_name)
            ? 'session-overview-status--active'
            : 'session-overview-status--completed';

    // Total duration: sum all turn deltas
    const totalDuration = session.turns?.reduce((sum, turn) => {
        if (!turn.delta) return sum;
        const timeStr = String(turn.delta).match(/[\d.]+/)?.[0];
        return sum + (timeStr ? parseFloat(timeStr) : 0);
    }, 0) || 0;

    // Started datetime
    const startedDate = session.created ? new Date(session.created).toLocaleString() : 'Unknown';

    // Summary
    const summary = session.conclusion?.summary || 'No summary available';

    // Aggregate tool calls by tool_name
    const toolCallsByName = new Map<string, number>();
    session.turns?.forEach(turn => {
        turn.tool_calls?.forEach(call => {
            const name = call.tool_name || 'unknown';
            toolCallsByName.set(name, (toolCallsByName.get(name) || 0) + 1);
        });
    });

    // Engrams
    const engramsList = session.engrams?.map(e => e.name) || [];

    // Token budget: sum input/output tokens across all turns
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    session.turns?.forEach(turn => {
        if (turn.model_usage_record) {
            totalInputTokens += turn.model_usage_record.input_tokens || 0;
            totalOutputTokens += turn.model_usage_record.output_tokens || 0;
        }
    });
    const totalTokens = totalInputTokens + totalOutputTokens;
    const avgTokensPerTurn = turnCount > 0 ? Math.round(totalTokens / turnCount) : 0;

    // Identity: model name + provider from first turn
    const firstTurn = session.turns?.[0];
    const modelName = firstTurn?.model_usage_record?.ai_model_provider?.ai_model?.name || 'Unknown';
    const providerName = firstTurn?.model_usage_record?.ai_model_provider?.provider?.name || 'Unknown';

    return (
        <div className="scroll-hidden inspector-root">
            <div className="inspector-body">
                <h2 className="glass-panel-title inspector-section-title">
                    SESSION OVERVIEW
                </h2>

                {/* Header Card */}
                <div className="session-overview-header-card">
                    <div className="session-overview-id">
                        {sessionIdPrefix}
                    </div>
                    <div className={`session-overview-status ${statusBadgeClass}`}>
                        {session.status_name}
                    </div>
                </div>

                {/* Status & Turns & Duration */}
                <div className="session-overview-info-row">
                    <div className="session-overview-info-item">
                        <div className="session-overview-info-label">TURNS</div>
                        <div className="session-overview-info-value">{turnCount}</div>
                    </div>
                    <div className="session-overview-info-item">
                        <div className="session-overview-info-label">TOTAL DURATION</div>
                        <div className="session-overview-info-value">{totalDuration.toFixed(2)}s</div>
                    </div>
                </div>

                {/* Started datetime */}
                <div className="session-overview-datetime">
                    <span className="session-overview-datetime-label">Started:</span>
                    <span className="session-overview-datetime-value">{startedDate}</span>
                </div>

                {/* Summary section */}
                <Accordion title="CONCLUSION SUMMARY" color="#4ade80" open>
                    <div className="session-overview-summary-text">
                        {summary}
                    </div>
                </Accordion>

                {/* Parietal Lobe Actions */}
                <Accordion title="PARIETAL LOBE ACTIONS" color="#a855f7" open={toolCallsByName.size > 0}>
                    <div className="session-overview-tools-list">
                        {toolCallsByName.size > 0 ? (
                            Array.from(toolCallsByName.entries())
                                .sort((a, b) => b[1] - a[1])
                                .map(([toolName, count]) => (
                                    <div key={toolName} className="session-overview-tool-row">
                                        <span className="session-overview-tool-name">⚙ {toolName}</span>
                                        <span className="session-overview-tool-count">×{count}</span>
                                    </div>
                                ))
                        ) : (
                            <div className="session-overview-tools-empty">No tool calls</div>
                        )}
                    </div>
                </Accordion>

                {/* Engrams */}
                <Accordion title="ENGRAMS" color="#38bdf8" open={engramsList.length > 0}>
                    <div className="session-overview-engrams-list">
                        {engramsList.length > 0 ? (
                            engramsList.map((name, idx) => (
                                <div key={idx} className="session-overview-engram-row">
                                    📚 {name}
                                </div>
                            ))
                        ) : (
                            <div className="session-overview-engrams-empty">None formed</div>
                        )}
                    </div>
                </Accordion>

                {/* Token Budget */}
                <Accordion title="TOKEN BUDGET" color="#f59e0b" open>
                    <div className="session-overview-token-grid">
                        <div className="session-overview-token-item">
                            <div className="session-overview-token-label">INPUT</div>
                            <div className="session-overview-token-value">{totalInputTokens}</div>
                        </div>
                        <div className="session-overview-token-item">
                            <div className="session-overview-token-label">OUTPUT</div>
                            <div className="session-overview-token-value">{totalOutputTokens}</div>
                        </div>
                        <div className="session-overview-token-item">
                            <div className="session-overview-token-label">TOTAL</div>
                            <div className="session-overview-token-value">{totalTokens}</div>
                        </div>
                        <div className="session-overview-token-item">
                            <div className="session-overview-token-label">AVG/TURN</div>
                            <div className="session-overview-token-value">{avgTokensPerTurn}</div>
                        </div>
                    </div>
                </Accordion>

                {/* Identity */}
                <Accordion title="IDENTITY" color="#38bdf8" open>
                    <div className="session-overview-identity-grid">
                        <div className="session-overview-identity-item">
                            <div className="session-overview-identity-label">Model</div>
                            <div className="session-overview-identity-value">{modelName}</div>
                        </div>
                        <div className="session-overview-identity-item">
                            <div className="session-overview-identity-label">Provider</div>
                            <div className="session-overview-identity-value">{providerName}</div>
                        </div>
                    </div>
                </Accordion>
            </div>
        </div>
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
    const sessionEvent = useDendrite('ReasoningSession', null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await fetch('/api/v1/reasoning_sessions/');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setSessions(data.results || data);
            } catch (err) {
                console.error('Failed to fetch sessions', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionEvent]);

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
            const res = await fetch(`/api/v1/reasoning_sessions/${activeSessionId}/summary_dump/`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `session_summary_${String(activeSessionId).slice(0, 8)}.log`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Dump failed", e);
        }
    };

    const activeSession = sessions.find(s => s.id === activeSessionId);
    const isAlive = activeSession && ['Active', 'Pending', 'Running', 'Thinking'].includes(activeSession.status_name);
    const turnCount = activeSession?.turns?.length || 0;

    return (
        <div className="sidebar-root">
            <h2 className="glass-panel-title sidebar-title">COGNITIVE THREADS</h2>

            {/* Turn Counter - prominently displayed when session is active */}
            {activeSessionId && turnCount > 0 && (
                <div className={`sidebar-turn-counter ${isAlive ? 'sidebar-turn-counter--active' : ''}`}>
                    <div className="sidebar-turn-counter-label">TURNS</div>
                    <div className="sidebar-turn-counter-display">
                        {turnCount}
                    </div>
                </div>
            )}

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
    sessionId?: string;
}

export const ReasoningInspector = ({ node, sessionId }: ReasoningInspectorProps) => {
    const [sessionData, setSessionData] = useState<ReasoningSessionData | null>(null);
    const sessionEvent = useDendrite('ReasoningSession', null);

    useEffect(() => {
        let cancelled = false;
        if (!sessionId) return;
        const load = async () => {
            try {
                const res = await fetch(`/api/v1/reasoning_sessions/${sessionId}/graph_data/`);
                if (!res.ok || cancelled) return;
                const data: ReasoningSessionData = await res.json();
                if (cancelled) return;
                setSessionData(data);
            } catch (err) {
                console.error('Failed to fetch session data', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId, sessionEvent]);

    if (!node) {
        if (!sessionData) {
            return <div className="inspector-placeholder font-mono text-sm">Select a node on the graph.</div>;
        }
        return <SessionOverviewCard session={sessionData} />;
    }

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
            const roleColor =
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
                            const toolCallsCount = turn.tool_calls?.length || 0;

                            return (
                                <>
                        {/* TIER 1: Always visible header */}
                        <div className="turn-tier-1">
                            <div className="turn-tier-1-header">
                                <span className="turn-tier-1-title">TURN {turn.turn_number} of {sessionData?.turns?.length || '?'}</span>
                                <span className={`inspector-turn-status ${statusClass}`}>
                                    {n.status_name}
                                </span>
                            </div>
                            <div className="turn-tier-1-details">
                                <span>{modelName} · {timing} · {tokensIn}→{tokensOut} tokens</span>
                            </div>
                            <div className="turn-tier-1-timing">
                                Started {new Date(turn.created).toLocaleTimeString()} · On task {(turn.delta || '--')}
                            </div>
                        </div>

                        {/* TIER 2: PARIETAL LOBE section (default open) */}
                        {toolCallsCount > 0 && (
                            <Accordion title="PARIETAL LOBE" color="#a855f7" open>
                                <div className="turn-parietal-lobe-list">
                                    {turn.tool_calls?.map((call: ToolCallData, idx: number) => {
                                        const summary = summarizeTool(call);
                                        const thought = summary.thought;
                                        const showError = summary.hasError || summary.success === false;

                                        return (
                                            <div key={idx} className={`turn-parietal-call ${showError ? 'turn-parietal-call--error' : ''}`}>
                                                <div className="turn-parietal-call-header">
                                                    <span>⚙ {call.tool_name} → {summary.action}</span>
                                                    <span className={`turn-parietal-status ${summary.success === true ? 'turn-parietal-status--success' : summary.success === false ? 'turn-parietal-status--error' : 'turn-parietal-status--neutral'}`}>
                                                        {summary.success === true ? '✓' : summary.success === false ? '✗' : '○'}
                                                    </span>
                                                </div>

                                                {thought && (
                                                    <div className="turn-parietal-thought">
                                                        💭 {thought}
                                                    </div>
                                                )}

                                                {summary.errorMessage && (
                                                    <div className="turn-parietal-error">
                                                        ERROR: {summary.errorMessage}
                                                    </div>
                                                )}

                                                {summary.preview && (
                                                    <div className="turn-parietal-preview">
                                                        {summary.preview}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Accordion>
                        )}

                        {/* TIER 3: Collapsed accordions */}
                        {hasMessages && (
                            <Accordion title="WHAT THE AGENT SAW" color="#38bdf8">
                                {renderMessages(messages)}
                            </Accordion>
                        )}

                        {turn.tool_calls && Array.isArray(turn.tool_calls) && turn.tool_calls.length > 0 && (
                            <Accordion title="RAW PAYLOADS" color="#f59e0b">
                                <div className="turn-raw-payloads">
                                    {turn.tool_calls.map((call: ToolCallData, idx: number) => {
                                        const argsStr = typeof call.arguments === 'object' ? JSON.stringify(call.arguments, null, 2) : String(call.arguments || '');
                                        const resultStr = call.result_payload || call.traceback || "Pending...";

                                        return (
                                            <div key={idx} className="turn-raw-payload-item">
                                                <Accordion title={`CALL [${idx + 1}]: ${call.tool_name}`} color="#99ccff">
                                                    <div className="turn-raw-payload-args">
                                                        <div className="turn-raw-payload-label">Arguments:</div>
                                                        <pre className="inspector-args-pre--blue">
                                                            {argsStr || '{}'}
                                                        </pre>
                                                    </div>
                                                    <div className="turn-raw-payload-result">
                                                        <div className="turn-raw-payload-label">Result:</div>
                                                        <pre className="inspector-tool-result">
                                                            {resultStr}
                                                        </pre>
                                                    </div>
                                                </Accordion>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Accordion>
                        )}

                        {turnThought && (
                            <Accordion title="AGENT THOUGHT" color="#a855f7" open>
                                <div className="inspector-thought-text">
                                    {turnThought}
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
                        {(() => {
                            const tool = n as ToolCallData;
                            const summary = summarizeTool(tool);
                            const argsStr = typeof tool.arguments === 'object' ? JSON.stringify(tool.arguments, null, 2) : String(tool.arguments || '');

                            return (
                                <>
                                    <div className="tool-inspector-header">
                                        <Terminal size={16} /> {tool.tool_name}
                                    </div>

                                    <div className="tool-inspector-summary">
                                        <div className="tool-inspector-summary-action">
                                            {summary.action}
                                        </div>
                                        {summary.target && (
                                            <div className="tool-inspector-summary-target">
                                                Target: {summary.target}
                                            </div>
                                        )}
                                    </div>

                                    {summary.thought && (
                                        <Accordion title="THOUGHT" color="#a855f7" open>
                                            <div className="inspector-thought-text">
                                                {summary.thought}
                                            </div>
                                        </Accordion>
                                    )}

                                    <Accordion title="ARGUMENTS" color="#38bdf8" open>
                                        <pre className="inspector-args-pre">
                                            {argsStr || '{}'}
                                        </pre>
                                    </Accordion>

                                    <Accordion title="RESULT" color={summary.hasError ? '#ef4444' : '#4ade80'} open>
                                        <pre className={`inspector-tool-result ${summary.hasError ? 'inspector-tool-result--error' : ''}`}>
                                            {tool.result_payload || tool.traceback || "Pending..."}
                                        </pre>
                                    </Accordion>

                                    {summary.errorMessage && (
                                        <Accordion title="ERROR" color="#ef4444" open>
                                            <div className="inspector-error-box">
                                                {summary.errorMessage}
                                            </div>
                                        </Accordion>
                                    )}
                                </>
                            );
                        })()}
                    </div>
                )}

                {n.type === 'conclusion' && (
                    <div className="inspector-node-content">
                        {(() => {
                            const conclusion = n as SessionConclusionData;

                            return (
                                <>
                                    <Accordion title="SUMMARY" color="#4ade80" open>
                                        <div className="inspector-summary-text">
                                            {conclusion.summary}
                                        </div>
                                    </Accordion>

                                    <Accordion title="OUTCOME" color="#38bdf8" open>
                                        <div className="conclusion-outcome-value">
                                            {conclusion.outcome_status}
                                        </div>
                                    </Accordion>

                                    <Accordion title="RECOMMENDED ACTION" color="#f59e0b" open>
                                        <div className="conclusion-action-value">
                                            {conclusion.recommended_action}
                                        </div>
                                    </Accordion>

                                    <Accordion title="NEXT GOAL" color="#a855f7">
                                        <div className="conclusion-next-goal-value">
                                            {conclusion.next_goal_suggestion}
                                        </div>
                                    </Accordion>

                                    <Accordion title="REASONING TRACE" color="#99ccff">
                                        <div className="inspector-trace-text">
                                            {conclusion.reasoning_trace}
                                        </div>
                                    </Accordion>
                                </>
                            );
                        })()}
                    </div>
                )}

                {n.type === 'engram' && (
                    <div className="inspector-node-content">
                        {(() => {
                            const engram = n as TalosEngramData;

                            return (
                                <>
                                    <div className="inspector-engram-header">
                                        <Database size={16} /> {engram.name}
                                    </div>

                                    <div className="engram-info-row">
                                        <div className="engram-info-item">
                                            <div className="engram-info-label">RELEVANCE</div>
                                            <div className="engram-info-value">
                                                {(engram.relevance_score * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                        <div className="engram-info-item">
                                            <div className="engram-info-label">SOURCE TURNS</div>
                                            <div className="engram-info-value">
                                                {engram.source_turns?.length || 0}
                                            </div>
                                        </div>
                                    </div>

                                    <Accordion title="DESCRIPTION" color="#38bdf8" open>
                                        <div className="inspector-description-box">
                                            {engram.description}
                                        </div>
                                    </Accordion>

                                    {engram.source_turns && engram.source_turns.length > 0 && (
                                        <Accordion title="SOURCE TURNS" color="#a855f7">
                                            <div className="engram-source-turns">
                                                {engram.source_turns.map((turnNum, idx) => (
                                                    <div key={idx} className="engram-turn-badge">
                                                        Turn {turnNum}
                                                    </div>
                                                ))}
                                            </div>
                                        </Accordion>
                                    )}
                                </>
                            );
                        })()}
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

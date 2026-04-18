import "./ReasoningPanels.css";
import { type ReactNode, useEffect, useState } from 'react';
import { Power, RefreshCw, Terminal, Database, Target, Download, MessageSquare, Trash2 } from 'lucide-react';
import { useDendrite } from './SynapticCleft';
import type {
    GraphNode,
    ReasoningSessionData,
    ReasoningToolCallSummary,
    ReasoningTurnData,
    ReasoningTurnDigest,
    ToolCallData,
    TalosEngramData,
    SessionConclusionData
} from "../types.ts";
import { getCookie } from '../api';
import { summarizeTool } from '../utils/toolFormatters';

// --- Relative time formatter for "ago" strings ---
const formatAgo = (iso?: string): string => {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return '';
    const diff = Math.max(0, Date.now() - then);
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    const wk = Math.floor(day / 7);
    if (wk < 4) return `${wk}w ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    const yr = Math.floor(day / 365);
    return `${yr}y ago`;
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
    digests: ReasoningTurnDigest[];
}

const SessionOverviewCard = ({ session, digests }: SessionOverviewCardProps) => {
    const sessionIdPrefix = session.id?.split('-')[0]?.toUpperCase() || 'SESSION';

    const turnCount = digests.length;
    const statusBadgeClass = session.status_name === 'Error'
        ? 'session-overview-status--error'
        : ['Active', 'Running', 'Pending', 'Thinking'].includes(session.status_name)
            ? 'session-overview-status--active'
            : 'session-overview-status--completed';

    // Total duration from digest timestamps — sum of each turn's
    // modified-minus-created. Server-side query_time isn't on the digest.
    const totalDurationSec = digests.reduce((sum, d) => {
        if (!d.created || !d.modified) return sum;
        const start = Date.parse(d.created);
        const end = Date.parse(d.modified);
        if (isNaN(start) || isNaN(end) || end <= start) return sum;
        return sum + (end - start) / 1000;
    }, 0);

    const startedDate = session.created ? new Date(session.created).toLocaleString() : 'Unknown';

    // Conclusion summary used to come from the full blob; the digest
    // stream doesn't carry it. If inspector needs it, per-session fetch.
    const summary = session.conclusion?.summary || 'No summary available';

    const toolCallsByName = new Map<string, number>();
    digests.forEach(d => {
        (d.tool_calls_summary || []).forEach(call => {
            const name = call.tool_name || 'unknown';
            toolCallsByName.set(name, (toolCallsByName.get(name) || 0) + 1);
        });
    });

    // Engrams aggregated from digest engram_ids (deduped).
    const engramIds = new Set<string>();
    digests.forEach(d => (d.engram_ids || []).forEach(id => engramIds.add(id)));
    const engramCount = engramIds.size;

    const totalInputTokens = digests.reduce((s, d) => s + (d.tokens_in || 0), 0);
    const totalOutputTokens = digests.reduce((s, d) => s + (d.tokens_out || 0), 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const avgTokensPerTurn = turnCount > 0 ? Math.round(totalTokens / turnCount) : 0;

    const modelName = digests[0]?.model_name || 'Unknown';

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
                        <div className="session-overview-info-value">{totalDurationSec.toFixed(2)}s</div>
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

                {/* Engrams — digest only carries IDs, not names. Show count. */}
                <Accordion title="ENGRAMS" color="#38bdf8" open={engramCount > 0}>
                    <div className="session-overview-engrams-list">
                        {engramCount > 0 ? (
                            <div className="session-overview-engram-row">
                                📚 {engramCount} engram{engramCount === 1 ? '' : 's'} linked
                            </div>
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

                {/* Identity — provider isn't on digest; model name only. */}
                <Accordion title="IDENTITY" color="#38bdf8" open>
                    <div className="session-overview-identity-grid">
                        <div className="session-overview-identity-item">
                            <div className="session-overview-identity-label">Model</div>
                            <div className="session-overview-identity-value">{modelName}</div>
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
                const res = await fetch('/api/v2/reasoning_sessions/');
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
        await fetch(`/api/v2/reasoning_sessions/${activeSessionId}/${action}/`, {
            method: 'POST',
            headers: { 'X-CSRFToken': csrfToken, 'Content-Type': 'application/json' }
        });
    };

    const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this thread? This cannot be undone.')) return;
        const csrfToken = getCookie('csrftoken') || '';
        try {
            const res = await fetch(`/api/v2/reasoning_sessions/${id}/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': csrfToken }
            });
            if (res.ok || res.status === 204) {
                setSessions(prev => prev.filter(s => s.id !== id));
                if (id === activeSessionId) {
                    onSelectSession('');
                }
            } else {
                console.error('Delete failed', res.status);
            }
        } catch (err) {
            console.error('Delete failed', err);
        }
    };

    const handleDump = async () => {
        try {
            const res = await fetch(`/api/v2/reasoning_sessions/${activeSessionId}/summary_dump/`);
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
    const turnCount = activeSession?.turns_count ?? activeSession?.turns?.length ?? 0;

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
                    const turns = s.turns_count ?? s.turns?.length ?? 0;
                    const ago = formatAgo(s.modified || s.created);
                    return (
                        <div
                            key={s.id}
                            onClick={() => onSelectSession(s.id)}
                            className={`reasoningpanels-session-card ${isActive ? 'reasoningpanels-session-card--active' : ''}`}
                        >
                            <div className="sidebar-session-card-header">
                                <div className="font-mono text-xs sidebar-session-id">
                                    {s.id.split('-')[0].toUpperCase()}
                                </div>
                                <button
                                    type="button"
                                    className="sidebar-session-delete"
                                    onClick={(e) => handleDeleteSession(s.id, e)}
                                    title="Delete this thread"
                                    aria-label="Delete this thread"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className={`font-mono text-xs reasoningpanels-status-text ${isStatusActive ? 'reasoningpanels-status-text--active' : ''}`}>
                                {s.status_name} · {turns} turn{turns === 1 ? '' : 's'}{ago ? ` · ${ago}` : ''}
                            </div>
                            <div className="font-mono text-xs sidebar-session-datetime">
                                {new Date(s.created).toLocaleString()}
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
    const [digests, setDigests] = useState<ReasoningTurnDigest[]>([]);
    const [turnDetail, setTurnDetail] = useState<ReasoningTurnData | null>(null);
    const sessionEvent = useDendrite('ReasoningSession', sessionId ?? null);
    const digestEvent = useDendrite('ReasoningTurnDigest', null);

    // Minimal session fetch (status, created, turns_count). Replaces
    // the full blob — downstream consumers that need turns use digests.
    useEffect(() => {
        let cancelled = false;
        if (!sessionId) return;
        const load = async () => {
            try {
                const res = await fetch(`/api/v2/reasoning_sessions/${sessionId}/`);
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

    // Digest pull-fallback on mount + live upsert on vesicle.
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
            }
        };
        load();
        return () => { cancelled = true; };
    }, [sessionId]);

    useEffect(() => {
        if (!digestEvent || !sessionId) return;
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

    // Per-turn on-demand fetch — fires for both turn nodes (obvious)
    // and tool sub-nodes (the tool inspector reads arguments,
    // result_payload, and traceback off the ToolCall, which only lives
    // on the full turn payload; the digest carries only a compact
    // summary). Full ModelUsageRecord + ToolCall objects are never
    // cached on the session; we re-fetch every time the user opens a
    // different turn. That's the whole point of the digest cutover.
    const turnId = node?.type === 'turn' || node?.type === 'tool'
        ? (node.turn_id as string | undefined)
        : undefined;
    useEffect(() => {
        let cancelled = false;
        if (!turnId) {
            setTurnDetail(null);
            return;
        }
        const load = async () => {
            try {
                const res = await fetch(`/api/v2/reasoning_turns/${turnId}/`);
                if (!res.ok || cancelled) return;
                const data: ReasoningTurnData = await res.json();
                if (cancelled) return;
                setTurnDetail(data);
            } catch (err) {
                console.error('Failed to fetch turn detail', err);
            }
        };
        setTurnDetail(null);
        load();
        return () => { cancelled = true; };
    }, [turnId]);

    if (!node) {
        if (!sessionData) {
            return <div className="inspector-placeholder font-mono text-sm">Select a node on the graph.</div>;
        }
        return <SessionOverviewCard session={sessionData} digests={digests} />;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const n = node as any;

    const getAdminUrl = (nodeData: GraphNode) => {
        if (!nodeData || !nodeData.id) return '#';
        const dbId = nodeData.type === 'turn' && nodeData.turn_id
            ? String(nodeData.turn_id)
            : String(nodeData.id).split('-').slice(1).join('-');

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
                            // Digest data always available on the node (push/pull);
                            // full turn body fetched lazily when the turn is opened.
                            const digestExcerpt = (n.excerpt as string | undefined) || '';
                            const digestTokensIn = (n.tokens_in as number | undefined) ?? 0;
                            const digestTokensOut = (n.tokens_out as number | undefined) ?? 0;
                            const digestModelName = (n.model_name as string | undefined) || 'Unknown';
                            const digestToolSummaries = (n.tool_calls_summary as ReasoningToolCallSummary[] | undefined) || [];

                            const turn = turnDetail;
                            const tokensIn = turn?.model_usage_record?.input_tokens ?? digestTokensIn;
                            const tokensOut = turn?.model_usage_record?.output_tokens ?? digestTokensOut;
                            const timing = turn?.model_usage_record?.query_time || turn?.delta || '--';
                            const modelName = turn?.model_usage_record?.ai_model_provider?.ai_model?.name || digestModelName;
                            const messages = turn?.model_usage_record?.request_payload || [];
                            const hasMessages = Array.isArray(messages) && messages.length > 0;
                            const statusClass = n.status_name === 'Error'
                                ? 'inspector-status--error'
                                : ['Active', 'Running', 'Pending', 'Thinking'].includes(n.status_name)
                                    ? 'inspector-status--active'
                                    : 'inspector-status--completed';
                            const turnNumber = turn?.turn_number ?? n.turn_number ?? '?';
                            const created = turn?.created ?? n.created;
                            const startedLabel = created ? new Date(created).toLocaleTimeString() : '--';
                            const toolCalls: ToolCallData[] = turn?.tool_calls || [];
                            const hasFullCalls = toolCalls.length > 0;

                            return (
                                <>
                        {/* TIER 1: Always visible header (digest-backed until full turn loads) */}
                        <div className="turn-tier-1">
                            <div className="turn-tier-1-header">
                                <span className="turn-tier-1-title">TURN {turnNumber} of {sessionData?.turns_count ?? digests.length ?? '?'}</span>
                                <span className={`inspector-turn-status ${statusClass}`}>
                                    {n.status_name}
                                </span>
                            </div>
                            <div className="turn-tier-1-details">
                                <span>{modelName} · {timing} · {tokensIn}→{tokensOut} tokens</span>
                            </div>
                            <div className="turn-tier-1-timing">
                                Started {startedLabel}{turn?.delta ? ` · On task ${turn.delta}` : ''}
                            </div>
                        </div>

                        {/* TIER 2: PARIETAL LOBE — prefer full tool calls once loaded, else digest summary */}
                        {hasFullCalls ? (
                            <Accordion title="PARIETAL LOBE" color="#a855f7" open>
                                <div className="turn-parietal-lobe-list">
                                    {toolCalls.map((call: ToolCallData, idx: number) => {
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
                        ) : digestToolSummaries.length > 0 ? (
                            <Accordion title="PARIETAL LOBE" color="#a855f7" open>
                                <div className="turn-parietal-lobe-list">
                                    {digestToolSummaries.map((call, idx: number) => {
                                        const marker = call.success === true ? '✓' : call.success === false ? '✗' : '○';
                                        const markerClass = call.success === true ? 'turn-parietal-status--success' : call.success === false ? 'turn-parietal-status--error' : 'turn-parietal-status--neutral';
                                        return (
                                            <div key={idx} className="turn-parietal-call">
                                                <div className="turn-parietal-call-header">
                                                    <span>⚙ {call.tool_name}{call.target ? ` → ${call.target}` : ''}</span>
                                                    <span className={`turn-parietal-status ${markerClass}`}>{marker}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </Accordion>
                        ) : null}

                        {/* TIER 3: Collapsed accordions (full body required) */}
                        {hasMessages && (
                            <Accordion title="WHAT THE AGENT SAW" color="#38bdf8">
                                {renderMessages(messages)}
                            </Accordion>
                        )}

                        {hasFullCalls && (
                            <Accordion title="RAW PAYLOADS" color="#f59e0b">
                                <div className="turn-raw-payloads">
                                    {toolCalls.map((call: ToolCallData, idx: number) => {
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

                        {digestExcerpt && (
                            <Accordion title="AGENT THOUGHT" color="#a855f7" open>
                                <div className="inspector-thought-text">
                                    {digestExcerpt}
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
                            // Tool sub-nodes carry only the compact
                            // {id, tool_name, success, target} summary from
                            // the digest. The full ToolCall row (arguments,
                            // result_payload, traceback) is on the fetched
                            // turn — we look it up by stable id so a
                            // reordered or deleted call doesn't mis-match.
                            const toolCallId = (n.tool_call_id as string | undefined) || '';
                            const toolCalls: ToolCallData[] = turnDetail?.tool_calls || [];
                            const tool = toolCalls.find(
                                (c) => String(c.id) === toolCallId
                            );

                            if (!tool) {
                                const digestToolName = (n.tool_name as string | undefined) || n.label || 'Tool';
                                return (
                                    <>
                                        <div className="tool-inspector-header">
                                            <Terminal size={16} /> {digestToolName}
                                        </div>
                                        <div className="inspector-placeholder font-mono text-sm">
                                            Data loading...
                                        </div>
                                    </>
                                );
                            }

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

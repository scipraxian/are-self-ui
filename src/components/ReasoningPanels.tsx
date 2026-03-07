import { useEffect, useState } from 'react';
import { Power, RefreshCw, LogOut, Terminal, Database, Target, AlertTriangle, Download } from 'lucide-react';

// --- HELPER COMPONENT: Reusable Accordion ---
const Accordion = ({ title, color, open = false, children }: any) => {
    return (
        <details open={open} style={{ marginBottom: '10px', border: `1px solid ${color}`, borderRadius: '8px', background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <summary style={{ backgroundColor: `${color}33`, color: color, padding: '8px 15px', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}>
                ► {title}
            </summary>
            <div style={{ padding: '12px' }}>
                {children}
            </div>
        </details>
    );
};

// --- LEFT PANEL: Threads & Controls ---
export const ReasoningSidebar = ({ activeSessionId, onSelectSession, onExit }: any) => {
    const [sessions, setSessions] = useState<any[]>([]);

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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 className="glass-panel-title" style={{ marginBottom: '16px' }}>COGNITIVE THREADS</h2>
            <div className="scroll-hidden" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sessions.map(s => (
                    <div key={s.id} onClick={() => onSelectSession(s.id)}
                         style={{
                             padding: '12px', borderRadius: '8px', cursor: 'pointer',
                             background: s.id === activeSessionId ? 'rgba(168, 85, 247, 0.15)' : 'rgba(255,255,255,0.02)',
                             border: `1px solid ${s.id === activeSessionId ? '#a855f7' : 'var(--border-glass)'}`
                         }}>
                        <div className="font-mono text-xs" style={{ color: '#f8fafc', fontWeight: 700 }}>{s.id.split('-')[0].toUpperCase()}</div>
                        <div className="font-mono text-xs" style={{ color: s.status_name === 'Active' ? '#facc15' : '#94a3b8', marginTop: '4px' }}>
                            {s.status_name}
                        </div>
                    </div>
                ))}
            </div>

            {activeSessionId && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-glass)' }}>
                    {isAlive ? (
                        <button className="btn-ghost" onClick={() => handleAction('stop')} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', justifyContent: 'flex-start' }}>
                            <Power size={14} /> HALT CORTEX
                        </button>
                    ) : (
                        <>
                            <button className="btn-ghost" onClick={() => handleAction('rerun')} style={{ color: '#facc15', borderColor: 'rgba(250,204,21,0.3)', justifyContent: 'flex-start' }}>
                                <RefreshCw size={14} /> REBOOT CORTEX
                            </button>
                            <button className="btn-ghost" onClick={handleDump} style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)', justifyContent: 'flex-start' }}>
                                <Download size={14} /> DUMP DATA
                            </button>
                        </>
                    )}
                    <button className="btn-ghost" onClick={onExit} style={{ justifyContent: 'flex-start' }}>
                        <LogOut size={14} /> EXIT TO MAP
                    </button>
                </div>
            )}
        </div>
    );
};


// --- RIGHT PANEL: Node Inspector Parity ---
export const ReasoningInspector = ({ node }: { node: any }) => {
    if (!node) return <div className="bbb-placeholder font-mono text-sm">Select a node on the graph.</div>;

    const renderPayload = (payload: any) => {
        if (!payload || !payload.messages) return null;

        return payload.messages.map((msg: any, i: number) => {
            const roleStr = String(msg.role).toUpperCase();
            const roleColor = msg.role === 'system' ? '#cc99cc' : (msg.role === 'user' ? '#99ccff' : '#4ade80');

            return (
                <Accordion key={i} title={`[${roleStr}] PROMPT`} color={roleColor}>
                    {msg.role === 'user' ? (
                        // Basic split based on your regex logic for User blocks
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
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#cbd5e1' }}>
                                            {body}
                                        </pre>
                                    </Accordion>
                                );
                            }
                            return <div key={idx} style={{ color: '#cbd5e1', fontSize: '0.8rem', marginBottom: '8px' }}>{sec.trim()}</div>;
                        })
                    ) : (
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#e2e8f0' }}>
                            {msg.content}
                        </pre>
                    )}
                </Accordion>
            );
        });
    };

    return (
        <div className="scroll-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {node.type === 'turn' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', fontFamily: 'Outfit', textTransform: 'uppercase' }}>
                        <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#f99f1b', color: 'black', fontWeight: 800, borderRadius: '20px' }}>TURN {node.turn_number}</div>
                        <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#a855f7', color: 'black', fontWeight: 800, borderRadius: '20px' }}>IN {node.tokens_input}</div>
                        <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#38bdf8', color: 'black', fontWeight: 800, borderRadius: '20px' }}>OUT {node.tokens_output}</div>
                        <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#4ade80', color: 'black', fontWeight: 800, borderRadius: '20px' }}>{node.inference_time || node.delta || '--'}</div>
                    </div>

                    <div style={{ color: node.status_name === 'Error' ? '#ef4444' : '#4ade80', fontWeight: 700, marginTop: '8px' }}>Status: {node.status_name}</div>

                    {node.thought_process && (
                        <Accordion title="THOUGHT PROCESS" color="#a855f7" open>
                            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                                {node.thought_process.replace(/^(THOUGHT:\s*)+/i, '').trim()}
                            </div>
                        </Accordion>
                    )}

                    {node.request_payload && (
                        <Accordion title="VIEW REQUEST PAYLOAD" color="#f99f1b">
                            {renderPayload(node.request_payload)}
                        </Accordion>
                    )}
                </div>
            )}

            {node.type === 'tool' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        <Terminal size={16} /> {node.tool_name || node.label}
                    </div>

                    <Accordion title="ARGUMENTS" color="#38bdf8" open>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: '#e2e8f0' }}>
                            {node.arguments ? (typeof node.arguments === 'object' ? JSON.stringify(node.arguments, null, 2) : node.arguments) : '{}'}
                        </pre>
                    </Accordion>

                    <Accordion title="RESULT" color={node.traceback ? '#ef4444' : '#4ade80'} open>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: node.traceback ? '#ef4444' : '#4ade80', maxHeight: '400px', overflowY: 'auto' }}>
                            {node.result_payload || node.traceback || "Pending..."}
                        </pre>
                    </Accordion>
                </div>
            )}

            {node.type === 'conclusion' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Accordion title="EXECUTIVE SUMMARY" color="#4ade80" open>
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            {node.summary}
                        </div>
                    </Accordion>
                    <Accordion title="REASONING TRACE" color="#a855f7">
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'JetBrains Mono', color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.5 }}>
                            {node.reasoning_trace}
                        </div>
                    </Accordion>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #38bdf8', borderRadius: '5px' }}>
                            <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase' }}>Outcome Status</div>
                            <div style={{ color: 'white', fontSize: '1rem', marginTop: '4px' }}>{node.outcome_status}</div>
                        </div>
                        <div style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.5)', border: '1px solid #f99f1b', borderRadius: '5px' }}>
                            <div style={{ color: '#f99f1b', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase' }}>Recommended Action</div>
                            <div style={{ color: 'white', fontSize: '1rem', marginTop: '4px' }}>{node.recommended_action}</div>
                        </div>
                    </div>
                </div>
            )}

            {node.type === 'engram' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        <Database size={16} /> {node.name}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        {node.description}
                    </div>
                    <div className="font-mono text-xs text-muted">Relevance: {node.relevance_score}</div>
                </div>
            )}

            {node.type === 'goal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        <Target size={16} /> {node.label}
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        {node.rendered_goal}
                    </div>
                </div>
            )}
        </div>
    );
};
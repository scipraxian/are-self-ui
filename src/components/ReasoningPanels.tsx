import { useEffect, useState } from 'react';
import { Loader2, Power, RefreshCw, LogOut, Terminal, Database, Target, AlertTriangle } from 'lucide-react';

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
                    <button className="btn-ghost" onClick={() => handleAction('stop')} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', justifyContent: 'flex-start' }}>
                        <Power size={14} /> HALT CORTEX
                    </button>
                    <button className="btn-ghost" onClick={() => handleAction('rerun')} style={{ color: '#facc15', borderColor: 'rgba(250,204,21,0.3)', justifyContent: 'flex-start' }}>
                        <RefreshCw size={14} /> REBOOT CORTEX
                    </button>
                    <button className="btn-ghost" onClick={onExit} style={{ justifyContent: 'flex-start' }}>
                        <LogOut size={14} /> EXIT TO MAP
                    </button>
                </div>
            )}
        </div>
    );
};

// --- RIGHT PANEL: Node Inspector ---
export const ReasoningInspector = ({ node }: { node: any }) => {
    if (!node) {
        return <div className="bbb-placeholder font-mono text-sm">Select a node on the graph.</div>;
    }

    return (
        <div className="scroll-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h2 className="glass-panel-title" style={{ marginBottom: '16px', color: '#f8fafc' }}>
                {node.type.toUpperCase()} DETAILS
            </h2>

            {node.type === 'turn' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#facc15', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        <span>TURN {node.turn_number}</span>
                        <span>{node.status_name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                        <div style={{ background: '#000', padding: '6px', borderRadius: '4px', flex: 1 }}>IN: {node.tokens_input}</div>
                        <div style={{ background: '#000', padding: '6px', borderRadius: '4px', flex: 1 }}>OUT: {node.tokens_output}</div>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>
                        {node.thought_process || "Processing..."}
                    </div>
                </div>
            )}

            {node.type === 'tool' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        <Terminal size={16} /> {node.tool_name}
                    </div>
                    <div>
                        <div className="font-mono text-xs text-muted" style={{ marginBottom: '4px' }}>Arguments</div>
                        <div style={{ background: '#000', padding: '10px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#38bdf8', overflowX: 'auto' }}>
                            {node.arguments}
                        </div>
                    </div>
                    <div>
                        <div className="font-mono text-xs text-muted" style={{ marginBottom: '4px' }}>Result</div>
                        <div style={{ background: '#000', padding: '10px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#4ade80', overflowX: 'auto', maxHeight: '300px', overflowY: 'auto' }}>
                            {node.result_payload || "Pending..."}
                        </div>
                    </div>
                    {node.traceback && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                            <div style={{ fontWeight: 800, marginBottom: '4px' }}><AlertTriangle size={12}/> Traceback</div>
                            {node.traceback}
                        </div>
                    )}
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
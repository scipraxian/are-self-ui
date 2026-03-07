import { useState } from 'react';
import { Settings, MessageSquare, Terminal } from 'lucide-react';
import { BackgroundCanvas } from './BackgroundCanvas';
import { IdentityRoster } from './IdentityRoster';
import { TemporalMatrix } from './TemporalMatrix';
import { PrefrontalCortex } from './PrefrontalCortex';
import { IdentitySheet } from './IdentitySheet';
import { ReasoningGraph3D } from './ReasoningGraph3D';
import { ReasoningSidebar, ReasoningInspector } from './ReasoningPanels';
import './BloodBrainBarrier.css';

export const BloodBrainBarrier = () => {
    const [activeViewport, setActiveViewport] = useState<'iteration' | 'identity' | 'pfc' | 'reasoning' | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<{ id: number | string, type: 'base' | 'disc' } | null>(null);

    // Frontal Lobe State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [cortexStats, setCortexStats] = useState<any>(null);

    const handleLobeClick = (path: string) => {
        if (path === 'temporal') setActiveViewport('iteration');
        else if (path === 'pfc') setActiveViewport('pfc');
        else if (path === 'frontal') {
            setActiveViewport('reasoning');
        }
        else setActiveViewport(null);
    };

    const handleIdentitySelect = (id: number | string, type: 'base' | 'disc') => {
        setSelectedEntity({ id, type });
        setActiveViewport('identity');
    };

    const isReasoningGraphActive = activeViewport === 'reasoning' && activeSessionId !== null;

    return (
        <div className="bbb-wrapper">

            {/* --- DYNAMIC BACKGROUND LAYER --- */}
            <div className="bbb-layer-3d">
                {isReasoningGraphActive ? (
                    <ReasoningGraph3D
                        sessionId={activeSessionId}
                        onNodeSelect={setSelectedNode}
                        onStatsUpdate={setCortexStats}
                    />
                ) : (
                    <BackgroundCanvas onLobeClick={handleLobeClick} />
                )}
            </div>

            <div className="bbb-layer-ui">
                <header className="glass-panel bbb-header">
                    <div className="bbb-header-brand">
                        <Settings size={18} className="bbb-header-icon" />
                        <h1 className="font-display heading-tracking text-base bbb-header-title">ARE-SELF</h1>
                    </div>
                </header>

                <div className="bbb-main-content">
                    {/* LEFT PANEL */}
                    <aside className="glass-panel bbb-panel-side">
                        {activeViewport === 'reasoning' ? (
                            <ReasoningSidebar
                                activeSessionId={activeSessionId}
                                onSelectSession={setActiveSessionId}
                                onExit={() => { setActiveSessionId(null); setActiveViewport(null); }}
                            />
                        ) : (
                            <>
                                <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                                <IdentityRoster onSelectIdentity={handleIdentitySelect} />
                            </>
                        )}
                    </aside>

                    {/* CENTER STAGE - Layout Preserver */}
                    <main className={activeViewport && !isReasoningGraphActive ? "bbb-panel-center-active" : "bbb-panel-center-wrapper"}>

                        {/* Render standard windows */}
                        {activeViewport && !isReasoningGraphActive && activeViewport !== 'reasoning' && (
                            <div className="glass-panel bbb-panel-center-active" style={{ width: '100%' }}>
                                <button className="bbb-close-btn" onClick={() => setActiveViewport(null)}>✕</button>
                                {activeViewport === 'iteration' && <TemporalMatrix />}
                                {activeViewport === 'pfc' && <PrefrontalCortex />}
                                {activeViewport === 'identity' && selectedEntity ? (
                                    <IdentitySheet id={selectedEntity.id} type={selectedEntity.type} />
                                ) : activeViewport === 'identity' && !selectedEntity ? (
                                    <div className="bbb-placeholder font-mono text-sm">Select an identity from the roster to view synaptic data.</div>
                                ) : null}
                            </div>
                        )}

                        {/* Special Case: Prompt to select a session */}
                        {activeViewport === 'reasoning' && !activeSessionId && (
                            <div className="glass-panel bbb-panel-center-active" style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <button className="bbb-close-btn" onClick={() => setActiveViewport(null)}>✕</button>
                                <div className="bbb-placeholder font-mono text-sm">Select a Cognitive Thread from the left panel to engage the Cortex.</div>
                            </div>
                        )}

                        {/* If isReasoningGraphActive is TRUE, this <main> wrapper is entirely empty but holds its Flex space so the Right Panel doesn't move! */}
                    </main>

                    {/* RIGHT PANEL */}
                    <aside className="glass-panel bbb-panel-right">
                        {isReasoningGraphActive ? (
                            <ReasoningInspector node={selectedNode} />
                        ) : (
                            <>
                                <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                                <div className="bbb-placeholder font-mono text-sm">[Contextual Node Details]</div>
                            </>
                        )}
                    </aside>
                </div>

                <footer className="glass-panel bbb-footer">
                    <div className="font-mono text-xs bbb-footer-ticker" style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
                        <Terminal size={14} style={{ flexShrink: 0, color: 'var(--accent-purple)' }} />
                        {isReasoningGraphActive && cortexStats ? (
                            <div style={{ display: 'flex', gap: '24px', width: '100%', alignItems: 'center' }}>
                                <span style={{ color: '#facc15', fontWeight: 800 }}>LVL {cortexStats.level}</span>
                                <span style={{ color: '#a855f7', fontWeight: 800 }}>FOCUS {cortexStats.focus}</span>
                                <span style={{ color: '#4ade80', fontWeight: 800 }}>{cortexStats.xp} XP</span>
                                <span style={{ color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    "{cortexStats.latestThought}"
                                </span>
                            </div>
                        ) : (
                            <span className="bbb-footer-ticker-text">"Awaiting neural synchronization..."</span>
                        )}
                    </div>
                    <div className="bbb-footer-chat">
                        <MessageSquare size={18} />
                    </div>
                </footer>
            </div>
        </div>
    );
};
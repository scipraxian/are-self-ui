import { useState } from 'react';
import { Settings, MessageSquare, Terminal } from 'lucide-react';
import { BackgroundCanvas } from './BackgroundCanvas';
import { IdentityRoster } from './IdentityRoster';
import { TemporalMatrix } from './TemporalMatrix';
import { IdentitySheet } from './IdentitySheet';
import './BloodBrainBarrier.css';

export const BloodBrainBarrier = () => {
    const [activeViewport, setActiveViewport] = useState<'iteration' | 'identity' | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<{ id: number | string, type: 'base' | 'disc' } | null>(null);

    // --- THE MASTER ROUTER ---
    const handleLobeClick = (path: string) => {
        if (path === 'temporal') {
            // Temporal Lobe -> Time/Iterations -> Mounts the Kanban Matrix
            setActiveViewport('iteration');
        } else if (path === 'frontal') {
            // Frontal Lobe -> Identity/Logic -> Mounts the Character Sheet
            setActiveViewport('identity');
        } else {
            // Click anywhere else to close the center window
            setActiveViewport(null);
        }
    };

    const handleIdentitySelect = (id: number | string, type: 'base' | 'disc') => {
        setSelectedEntity({ id, type });
        setActiveViewport('identity');
    };

    return (
        <div className="bbb-wrapper">
            <div className="bbb-layer-3d">
                <BackgroundCanvas onLobeClick={handleLobeClick} />
            </div>

            <div className="bbb-layer-ui">
                <header className="glass-panel bbb-header">
                    <div className="bbb-header-brand">
                        <Settings size={18} className="bbb-header-icon" />
                        <h1 className="font-display heading-tracking text-base bbb-header-title">
                            ARE-SELF
                        </h1>
                    </div>
                </header>

                <div className="bbb-main-content">
                    {/* LEFT PANEL */}
                    <aside className="glass-panel bbb-panel-side">
                        <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                        <IdentityRoster onSelectIdentity={handleIdentitySelect} />
                    </aside>

                    {/* CENTER STAGE */}
                    <main className={activeViewport ? "bbb-panel-center-active" : "bbb-panel-center-wrapper"}>
                        {activeViewport && (
                            <div className="glass-panel bbb-panel-center-active">
                                <button className="bbb-close-btn" onClick={() => setActiveViewport(null)}>✕</button>

                                {activeViewport === 'iteration' && <TemporalMatrix />}

                                {activeViewport === 'identity' && selectedEntity ? (
                                    <IdentitySheet id={selectedEntity.id} type={selectedEntity.type} />
                                ) : activeViewport === 'identity' && !selectedEntity ? (
                                    <div className="bbb-placeholder font-mono text-sm">Select an identity from the roster to view synaptic data.</div>
                                ) : null}

                            </div>
                        )}
                    </main>

                    {/* RIGHT PANEL */}
                    <aside className="glass-panel bbb-panel-right">
                        <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                        <div className="bbb-placeholder font-mono text-sm">
                            [Contextual Node Details]
                        </div>
                    </aside>
                </div>

                <footer className="glass-panel bbb-footer">
                    <div className="font-mono text-xs bbb-footer-ticker">
                        <Terminal size={14} />
                        <span className="bbb-footer-ticker-text">"Awaiting neural spike_train synchronization..."</span>
                    </div>
                    <div className="bbb-footer-chat">
                        <MessageSquare size={18} />
                    </div>
                </footer>
            </div>
        </div>
    );
};
import { useState } from 'react';
import { Settings, MessageSquare, Terminal } from 'lucide-react';
import { BackgroundCanvas } from './BackgroundCanvas';

export const BloodBrainBarrier = () => {
    // Controls what is mounted in the center overlay.
    // null = closed (unobstructed 3D view)
    const [activeViewport, setActiveViewport] = useState<'iteration' | 'identity' | null>(null);

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-obsidian)' }}>

            {/* LAYER 0: The 3D World Space */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <BackgroundCanvas />
            </div>

            {/* LAYER 1 & 2: The HUD and Viewport Container */}
            {/* The wrapper ignores clicks so you can manipulate the 3D canvas through the empty space */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>

                {/* TOP: SystemMenu */}
                <header className="glass-panel" style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none', pointerEvents: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Settings size={18} color="var(--text-secondary)" style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'} />
                        <h1 className="font-display heading-tracking text-base" style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>
                            ARE-SELF
                        </h1>
                    </div>
                    {/* Dummy trigger to test opening the viewport */}
                    <button
                        className="btn-ghost text-xs"
                        onClick={() => setActiveViewport('iteration')}
                    >
                        OPEN TEMPORAL MATRIX
                    </button>
                </header>

                {/* MIDDLE: Left Panel, Center Viewport, Right Panel */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '20px', gap: '20px' }}>

                    {/* LEFT: IdentityPanel (The Roster) */}
                    <aside className="glass-panel" style={{ width: '320px', padding: '20px', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
                        <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                        <div style={{ flex: 1, border: '1px dashed var(--text-muted)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '16px' }}>
                            [IdentityList / IdentityDiscList]
                        </div>
                    </aside>

                    {/* CENTER: ActiveViewport */}
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', pointerEvents: activeViewport ? 'auto' : 'none' }}>
                        {activeViewport && (
                            <div className="glass-panel" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                <button
                                    onClick={() => setActiveViewport(null)}
                                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem', padding: '4px', transition: 'color 0.2s' }}
                                    onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                                    onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                >✕</button>
                                <h2 className="font-display heading-tracking text-xl" style={{ margin: 0, color: 'var(--text-primary)' }}>
                                    {activeViewport === 'iteration' ? 'TEMPORAL MATRIX' : 'IDENTITY SHEET'}
                                </h2>
                                <div style={{ flex: 1, border: '1px dashed var(--text-muted)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '16px' }}>
                                    [The Assembly Line / Character Sheet goes here]
                                </div>
                            </div>
                        )}
                    </main>

                    {/* RIGHT: InspectorPanel */}
                    <aside className="glass-panel" style={{ width: '350px', padding: '20px', display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}>
                        <h2 className="glass-panel-title">TACTICAL ANALYTICS</h2>
                        <div style={{ flex: 1, border: '1px dashed var(--text-muted)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginTop: '16px' }}>
                            [Hover/Click Context Details]
                        </div>
                    </aside>

                </div>

                {/* BOTTOM: ThoughtStream & ChatToggle */}
                <footer className="glass-panel" style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderRadius: 0, borderBottom: 'none', borderLeft: 'none', borderRight: 'none', pointerEvents: 'auto' }}>
                    <div className="font-mono text-xs" style={{ color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={14} />
                        <span style={{ color: 'var(--text-primary)' }}>"Awaiting neural spike_train synchronization..."</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: 'var(--accent-orange)' }}>
                        <MessageSquare size={18} />
                    </div>
                </footer>

            </div>
        </div>
    );
};
import React, { useState } from 'react';
import { Settings, MessageSquare, Terminal } from 'lucide-react';
import { BackgroundCanvas } from './BackgroundCanvas';

export const BloodBrainBarrier = () => {
    // Controls what is mounted in the center overlay.
    // null = closed (unobstructed 3D view)
    const [activeViewport, setActiveViewport] = useState<'iteration' | 'identity' | null>(null);

    const glassStyle: React.CSSProperties = {
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        color: '#e2e8f0',
        pointerEvents: 'auto', // Re-enable clicks for the actual panels
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#020617' }}>

            {/* LAYER 0: The 3D World Space */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <BackgroundCanvas />
            </div>

            {/* LAYER 1 & 2: The HUD and Viewport Container */}
            {/* The wrapper ignores clicks so you can manipulate the 3D canvas through the empty space */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', flexDirection: 'column' }}>

                {/* TOP: SystemMenu */}
                <header style={{ height: '50px', ...glassStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Settings size={18} color="#94a3b8" style={{ cursor: 'pointer' }} />
                        <h1 style={{ margin: 0, fontSize: '1rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '0.2em', color: '#f8fafc' }}>
                            ARE-SELF
                        </h1>
                    </div>
                    {/* Dummy trigger to test opening the viewport */}
                    <button
                        onClick={() => setActiveViewport('iteration')}
                        style={{ background: 'transparent', border: '1px solid #38bdf8', color: '#38bdf8', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                    >
                        OPEN TEMPORAL MATRIX
                    </button>
                </header>

                {/* MIDDLE: Left Panel, Center Viewport, Right Panel */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', padding: '20px', gap: '20px' }}>

                    {/* LEFT: IdentityPanel (The Roster) */}
                    <aside style={{ width: '320px', ...glassStyle, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.1em', marginTop: 0, fontWeight: 800 }}>IDENTITY ROSTER</h2>
                        <div style={{ flex: 1, border: '1px dashed #334155', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            [IdentityList / IdentityDiscList]
                        </div>
                    </aside>

                    {/* CENTER: ActiveViewport */}
                    <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        {activeViewport ? (
                            <div style={{ flex: 1, ...glassStyle, borderRadius: '16px', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                <button
                                    onClick={() => setActiveViewport(null)}
                                    style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                                >✕</button>
                                <h2 style={{ marginTop: 0, color: '#f8fafc', fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif' }}>
                                    {activeViewport === 'iteration' ? 'TEMPORAL MATRIX' : 'IDENTITY SHEET'}
                                </h2>
                                <div style={{ flex: 1, border: '1px dashed #334155', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    [The Assembly Line / Character Sheet goes here]
                                </div>
                            </div>
                        ) : null}
                    </main>

                    {/* RIGHT: InspectorPanel */}
                    <aside style={{ width: '350px', ...glassStyle, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <h2 style={{ fontSize: '0.75rem', color: '#94a3b8', letterSpacing: '0.1em', marginTop: 0, fontWeight: 800 }}>TACTICAL ANALYTICS</h2>
                        <div style={{ flex: 1, border: '1px dashed #334155', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            [Hover/Click Context Details]
                        </div>
                    </aside>

                </div>

                {/* BOTTOM: ThoughtStream & ChatToggle */}
                <footer style={{ height: '40px', ...glassStyle, borderBottom: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', color: '#a855f7', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Terminal size={14} />
                        <span style={{ color: '#e2e8f0' }}>"Awaiting neural spike_train synchronization..."</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#f99f1b' }}>
                        <MessageSquare size={18} />
                    </div>
                </footer>

            </div>
        </div>
    );
};
import React from 'react';
import { ActionIcon } from '@lobehub/ui';
import { Settings, Brain, Crosshair, TerminalSquare } from 'lucide-react';

interface CommandCenterLayoutProps {
    children: React.ReactNode; // The 3D Background
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
}

export const CommandCenterLayout = ({ children, leftPanel, rightPanel }: CommandCenterLayoutProps) => {
    // Shared glassmorphism aesthetic for the floating panels
    const glassStyle: React.CSSProperties = {
        background: 'rgba(15, 23, 42, 0.7)', // Deep Slate with opacity
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
    };

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', backgroundColor: '#020617' }}>

            {/* 1. Base Layer: The 3D Canvas */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                {children}
            </div>

            {/* 2. Top HUD Bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '60px',
                ...glassStyle, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Brain color="#38bdf8" size={26} />
                    <h1 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'Outfit, sans-serif', fontWeight: 800, letterSpacing: '0.15em', color: '#f8fafc' }}>
                        TALOS CORTEX
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', color: '#4ade80' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80', boxShadow: '0 0 10px #4ade80' }} />
                        SYSTEM ONLINE
                    </div>
                    <ActionIcon icon={Settings} title="System Settings" style={{ color: '#94a3b8' }} />
                </div>
            </div>

            {/* 3. Left Panel: Temporal Lobe (Strategy & Agile Board) */}
            <div style={{
                position: 'absolute', top: '80px', left: '20px', bottom: '20px', width: '380px',
                borderRadius: '16px', ...glassStyle, zIndex: 10, padding: '20px'
            }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Crosshair size={18} color="#facc15" />
                    <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em' }}>TEMPORAL LOBE (STRATEGY)</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {leftPanel || (
                        <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            Agile Board context initializing...
                        </div>
                    )}
                </div>
            </div>

            {/* 4. Right Panel: Parietal Lobe (Sensory & Telemetry) */}
            <div style={{
                position: 'absolute', top: '80px', right: '20px', bottom: '20px', width: '450px',
                borderRadius: '16px', ...glassStyle, zIndex: 10, padding: '20px'
            }}>
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TerminalSquare size={18} color="#a855f7" />
                    <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.1em' }}>PARIETAL LOBE (TELEMETRY)</h2>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {rightPanel || (
                        <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            Awaiting telemetry stream...
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
import "./CommandCenterLayout.css";
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
        <div className="commandcenterlayout-ui-48">

            {/* 1. Base Layer: The 3D Canvas */}
            <div className="common-layout-2">
                {children}
            </div>

            {/* 2. Top HUD Bar */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '60px',
                ...glassStyle, borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0,
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10
            }}>
                <div className="commandcenterlayout-ui-47">
                    <Brain color="#38bdf8" size={26} />
                    <h1 className="commandcenterlayout-ui-46">
                        TALOS CORTEX
                    </h1>
                </div>
                <div className="commandcenterlayout-ui-45">
                    <div className="commandcenterlayout-ui-44">
                        <span className="commandcenterlayout-ui-43" />
                        SYSTEM ONLINE
                    </div>
                    <ActionIcon className="common-layout-19" icon={Settings} title="System Settings" />
                </div>
            </div>

            {/* 3. Left Panel: Temporal Lobe (Strategy & Agile Board) */}
            <div style={{
                position: 'absolute', top: '80px', left: '20px', bottom: '20px', width: '380px',
                borderRadius: '16px', ...glassStyle, zIndex: 10, padding: '20px'
            }}>
                <div className="commandcenterlayout-ui-42">
                    <Crosshair size={18} color="#facc15" />
                    <h2 className="commandcenterlayout-ui-41">TEMPORAL LOBE (STRATEGY)</h2>
                </div>
                <div className="commandcenterlayout-ui-40">
                    {leftPanel || (
                        <div className="commandcenterlayout-ui-39">
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
                <div className="commandcenterlayout-ui-38">
                    <TerminalSquare size={18} color="#a855f7" />
                    <h2 className="commandcenterlayout-ui-37">PARIETAL LOBE (TELEMETRY)</h2>
                </div>
                <div className="commandcenterlayout-ui-36">
                    {rightPanel || (
                        <div className="commandcenterlayout-ui-35">
                            Awaiting telemetry stream...
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
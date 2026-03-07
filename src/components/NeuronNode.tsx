import React from 'react';
import { Handle, Position } from 'reactflow';

// The data injected by React Flow when mapping your Django Neurons
interface NeuronNodeData {
    label: string;
    effectorName: string | null;
    status?: string;
}

export const NeuronNode = ({ data, id }: { data: NeuronNodeData, id: string }) => {
    return (
        <div className="glass-panel" style={{
            width: '260px',
            position: 'relative',
            color: 'var(--text-primary)',
            padding: 0
        }}>
            {/* CARD HEADER */}
            <div className="glass-panel-header" style={{
                margin: 0,
                padding: '12px 16px',
                borderTopLeftRadius: '15px', /* matching the 16px border-radius minus 1 */
                borderTopRightRadius: '15px',
                background: 'rgba(56, 189, 248, 0.08)',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-glass)'
            }}>
                <span className="font-display" style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                    {data.label}
                </span>
                <span className="font-mono text-xs text-muted">#{id}</span>
            </div>

            {/* CARD BODY */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ marginBottom: '4px' }}>
                    <span className="font-mono text-xs" style={{
                        background: 'rgba(255,255,255,0.05)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-secondary)'
                    }}>
                        ENV: {data.effectorName || 'N/A'}
                    </span>
                </div>

                {/* Ports container */}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>

                    {/* INPUTS (Left) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                            <Handle
                                type="target"
                                position={Position.Left}
                                id="in"
                                style={{
                                    background: '#94a3b8',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--bg-obsidian)',
                                    left: '-23px',
                                    zIndex: 10
                                }}
                            />
                            <span className="font-mono text-xs text-muted">INPUT</span>
                        </div>
                    </div>

                    {/* OUTPUTS (Right) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', height: '16px' }}>
                            <span className="font-mono text-xs" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>FLOW</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="always"
                                style={{
                                    background: 'var(--accent-blue)',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--bg-obsidian)',
                                    right: '-23px',
                                    zIndex: 10
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', height: '16px' }}>
                            <span className="font-mono text-xs" style={{ color: 'var(--accent-green)', fontWeight: 600 }}>SUCCESS</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="success"
                                style={{
                                    background: 'var(--accent-green)',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--bg-obsidian)',
                                    right: '-23px',
                                    zIndex: 10
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', height: '16px' }}>
                            <span className="font-mono text-xs" style={{ color: 'var(--accent-red)', fontWeight: 600 }}>FAIL</span>
                            <Handle
                                type="source"
                                position={Position.Right}
                                id="failure"
                                style={{
                                    background: 'var(--accent-red)',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--bg-obsidian)',
                                    right: '-23px',
                                    zIndex: 10
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
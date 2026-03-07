import React from 'react';
import { Handle, Position } from 'reactflow';
import { Eye, Play, Square } from 'lucide-react';

// The data injected by React Flow when mapping your Django Neurons
interface NeuronNodeData {
    label: string;
    effectorName: string | null;
    status?: string;
    is_root?: boolean;
    invoked_pathway_name?: string | null;
    invoked_pathway_id?: number | string | null;
    onDrillDown?: (id: string | number) => void;
}

export const NeuronNode = ({ data, id }: { data: NeuronNodeData, id: string }) => {

    // Determine colors & styling based on node type
    const isRoot = !!data.is_root;
    const isSubgraph = !!data.invoked_pathway_id;

    // Display names
    const displayName = isSubgraph ? data.invoked_pathway_name || 'Sub-Graph' : data.label;

    const headerBg = isRoot
        ? 'rgba(239, 68, 68, 0.15)' // Red tint for root
        : isSubgraph
            ? 'linear-gradient(135deg, rgba(249, 159, 27, 0.15) 0%, rgba(180, 83, 9, 0.15) 100%)' // Orange/Amber tint for subgraph
            : 'rgba(56, 189, 248, 0.08)'; // Default blue tint

    const headerBorder = isRoot
        ? 'rgba(239, 68, 68, 0.3)'
        : isSubgraph
            ? 'rgba(249, 159, 27, 0.3)'
            : 'var(--border-glass)';

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
                borderTopLeftRadius: '15px',
                borderTopRightRadius: '15px',
                background: headerBg,
                justifyContent: 'space-between',
                borderBottom: `1px solid ${headerBorder}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-display" style={{ fontSize: '0.9rem', fontWeight: 800, letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                        {isSubgraph && '🌀 '}{displayName}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isSubgraph && data.onDrillDown && (
                        <button
                            style={{
                                background: '#38bdf8',
                                border: 'none',
                                color: '#0f172a',
                                borderRadius: '4px',
                                padding: '2px',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Drill down to Sub-Graph"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                data.onDrillDown && data.invoked_pathway_id && data.onDrillDown(data.invoked_pathway_id);
                            }}
                        >
                            <Eye size={12} />
                        </button>
                    )}

                    {isRoot && (
                        <>
                            <button
                                style={{ background: '#38bdf8', border: 'none', color: '#0f172a', borderRadius: '4px', padding: '2px', cursor: 'pointer' }}
                                title="Start Execution"
                            >
                                <Play size={10} fill="#0f172a" />
                            </button>
                            <button
                                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', borderRadius: '4px', padding: '2px', cursor: 'pointer' }}
                                title="Stop Execution"
                            >
                                <Square size={10} fill="#e2e8f0" />
                            </button>
                        </>
                    )}
                    <span className="font-mono text-xs text-muted" style={{ marginLeft: '4px' }}>#{id}</span>
                </div>
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

                    {/* INPUTS (Left) - Only show if NOT root */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {!isRoot && (
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
                        )}
                    </div>

                    {/* OUTPUTS (Right) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-end' }}>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', height: '16px' }}>
                            <span className="font-mono text-xs" style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{isRoot ? '' : 'FLOW'}</span>
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

                        {!isRoot && (
                            <>
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
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
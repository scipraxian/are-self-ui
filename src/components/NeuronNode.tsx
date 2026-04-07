import "./NeuronNode.css";
import { Handle, Position } from 'reactflow';
import { Eye, Play, Square } from 'lucide-react';
import { EFFECTOR_STYLE } from './nodeConstants';

// The data injected by React Flow when mapping your Django Neurons
interface NeuronNodeData {
    label: string;
    effectorName: string | null;
    effectorId?: number | null;
    status?: string;
    is_root?: boolean;
    invoked_pathway_name?: string | null;
    invoked_pathway_id?: number | string | null;
    onDrillDown?: (id: string | number) => void;
    onPlay?: (id: string) => void;
    onStop?: (id: string) => void;
}

export const NeuronNode = ({ data, id }: { data: NeuronNodeData, id: string }) => {

    // Determine colors & styling based on node type
    const isRoot = !!data.is_root;
    const isSubgraph = !!data.invoked_pathway_id;
    const effectorStyle = data.effectorId ? EFFECTOR_STYLE[data.effectorId] : null;

    // Display names
    const displayName = isSubgraph ? data.invoked_pathway_name || 'Sub-Graph' : data.label;

    const headerVariantClass = isRoot ? 'neuronnode-header--root' : isSubgraph ? 'neuronnode-header--subgraph' : 'neuronnode-header--default';

    return (
        <div className="glass-panel neuronnode-ui-106">
            {/* CARD HEADER */}
            <div
                className={`glass-panel-header neuronnode-header ${headerVariantClass}`}
                style={effectorStyle ? { borderTop: `3px solid ${effectorStyle.color}` } : undefined}
            >
                <div className="common-layout-15">
                    {effectorStyle && (
                        <span
                            className="font-mono text-xs"
                            style={{ color: effectorStyle.color, fontWeight: 700, marginRight: 6 }}
                        >
                            {effectorStyle.label}
                        </span>
                    )}
                    <span className="font-display neuronnode-ui-105">
                        {isSubgraph && '🌀 '}{displayName}
                    </span>
                </div>

                <div className="neuronnode-ui-104">
                    {/* Replace the existing Subgraph, Play, and Stop buttons in NeuronNode.tsx with this: */}

                    {isSubgraph && data.onDrillDown && (
                        <button
                            className="nodrag neuronnode-ui-103"
                            title="Drill down to Sub-Graph"
                            onClick={(e) => {
                                e.stopPropagation();
                                data.onDrillDown && data.invoked_pathway_id && data.onDrillDown(data.invoked_pathway_id.toString());
                            }}
                        >
                            <Eye size={12} />
                        </button>
                    )}

                    {isRoot && (
                        <>
                            <button
                                className="nodrag neuronnode-ui-102"
                                title="Start Execution (Root Node)"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    data.onPlay && data.onPlay(id);
                                }}
                            >
                                <Play size={10} fill="#0f172a" />
                            </button>
                            <button
                                className="nodrag neuronnode-ui-101"
                                title="Stop Execution (Root Node)"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    data.onStop && data.onStop(id);
                                }}
                            >
                                <Square size={10} fill="#e2e8f0" />
                            </button>
                        </>
                    )}
                    <span className="font-mono text-xs text-muted neuronnode-ui-100">#{id}</span>
                </div>
            </div>

            {/* CARD BODY */}
            <div className="neuronnode-ui-99">
                <div className="common-layout-30">
                    <span className="font-mono text-xs neuronnode-ui-98">
                        ENV: {data.effectorName || 'N/A'}
                    </span>
                </div>

                {/* Ports container */}
                <div className="neuronnode-ui-97">

                    {/* INPUTS (Left) - Only show if NOT root */}
                    <div className="common-layout-10">
                        {!isRoot && (
                            <div className="neuronnode-ui-96">
                                <Handle className="neuronnode-ui-95"
                                    type="target"
                                    position={Position.Left}
                                    id="in"
                                />
                                <span className="font-mono text-xs text-muted">INPUT</span>
                            </div>
                        )}
                    </div>

                    {/* OUTPUTS (Right) */}
                    <div className="neuronnode-ui-94">

                        <div className="neuronnode-ui-93">
                            <span className="font-mono text-xs neuronnode-ui-92">{isRoot ? '' : 'FLOW'}</span>
                            <Handle className="neuronnode-ui-91"
                                type="source"
                                position={Position.Right}
                                id="always"
                            />
                        </div>

                        {!isRoot && (
                            <>
                                <div className="neuronnode-ui-90">
                                    <span className="font-mono text-xs neuronnode-ui-89">SUCCESS</span>
                                    <Handle className="neuronnode-ui-88"
                                        type="source"
                                        position={Position.Right}
                                        id="success"
                                    />
                                </div>

                                <div className="neuronnode-ui-87">
                                    <span className="font-mono text-xs neuronnode-ui-86">FAIL</span>
                                    <Handle className="neuronnode-ui-85"
                                        type="source"
                                        position={Position.Right}
                                        id="failure"
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
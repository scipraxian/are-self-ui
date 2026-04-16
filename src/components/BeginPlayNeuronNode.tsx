import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';
import './CustomNeuronNodes.css';

const COLOR = '#991b1b';  // deep Unreal-style crimson

interface BeginPlayNodeData {
    label: string;
    neuronId: string;
    readonly?: boolean;
    onPlay?: (id: string) => void;
    onStop?: (id: string) => void;
}

export const BeginPlayNeuronNode = ({ data, id }: { data: BeginPlayNodeData; id: string }) => {
    const ro = !!data.readonly;

    return (
        <div className={`custom-node custom-node--begin-play${ro ? ' custom-node--readonly' : ''}`}>
            <div className="custom-node-header" style={{ background: COLOR }}>
                <div className="custom-node-header-left">
                    <Play size={16} className="custom-node-header-icon" color="#fff" fill="#fff" />
                    <span className="custom-node-header-title">{data.label || 'Begin Play'}</span>
                </div>
                <div className="custom-node-header-right">
                    {data.onPlay && (
                        <button
                            className="nodrag custom-node-action-btn"
                            title="Launch Spike Train"
                            onClick={(e) => {
                                e.stopPropagation();
                                data.onPlay && data.onPlay(id);
                            }}
                        >
                            <Play size={10} fill="#fff" color="#fff" />
                        </button>
                    )}
                    <span className="custom-node-header-id">#{id}</span>
                </div>
            </div>

            <div className="custom-node-body">
                <div className="custom-node-field">
                    <span className="custom-node-field-label" style={{ color: '#dc2626', fontWeight: 700 }}>ROOT NODE</span>
                </div>

                <div className="custom-node-ports">
                    <div />
                    <div className="custom-node-outputs">
                        <div className="custom-node-port-row">
                            <span className="custom-node-port-label">FLOW</span>
                            <Handle className="custom-node-handle custom-node-handle--flow" type="source" position={Position.Right} id="always" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

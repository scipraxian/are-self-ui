import { Handle, Position } from 'reactflow';
import { Bug } from 'lucide-react';
import { useNeuronContext } from './useNeuronContext';
import './CustomNeuronNodes.css';

const COLOR = '#ef4444';

interface DebugNodeData {
    label: string;
    neuronId: string;
    readonly?: boolean;
}

export const DebugNeuronNode = ({ data, id }: { data: DebugNodeData; id: string }) => {
    const nId = data.neuronId || id;
    const { context, loaded } = useNeuronContext(nId);
    const ro = !!data.readonly;

    return (
        <div className={`custom-node custom-node--debug${ro ? ' custom-node--readonly' : ''}`}>
            <div className="custom-node-header" style={{ background: COLOR }}>
                <div className="custom-node-header-left">
                    <Bug size={16} className="custom-node-header-icon" color="#fff" />
                    <span className="custom-node-header-title">{data.label || 'Debug'}</span>
                </div>
                <span className="custom-node-header-id">#{id}</span>
            </div>

            <div className="custom-node-body">
                {loaded ? (
                    Object.keys(context).length > 0 ? (
                        Object.entries(context).map(([key, value]) => (
                            <div key={key} className="custom-node-field">
                                <span className="custom-node-field-label">{key.toUpperCase()}</span>
                                <span className="custom-node-field-value">{value}</span>
                            </div>
                        ))
                    ) : (
                        <div className="custom-node-field">
                            <span className="custom-node-field-label" style={{ color: COLOR }}>DEBUG BREAKPOINT</span>
                        </div>
                    )
                ) : (
                    <span className="custom-node-field-label">Loading...</span>
                )}

                <div className="custom-node-ports">
                    <div>
                        <div className="custom-node-port-row">
                            <Handle className="custom-node-handle custom-node-handle--in" type="target" position={Position.Left} id="in" />
                            <span className="custom-node-port-label custom-node-port-label--input">IN</span>
                        </div>
                    </div>
                    <div className="custom-node-outputs">
                        <div className="custom-node-port-row">
                            <span className="custom-node-port-label">FLOW</span>
                            <Handle className="custom-node-handle custom-node-handle--flow" type="source" position={Position.Right} id="always" />
                        </div>
                        <div className="custom-node-port-row">
                            <span className="custom-node-port-label custom-node-port-label--success">PASS</span>
                            <Handle className="custom-node-handle custom-node-handle--success" type="source" position={Position.Right} id="success" />
                        </div>
                        <div className="custom-node-port-row">
                            <span className="custom-node-port-label custom-node-port-label--fail">FAIL</span>
                            <Handle className="custom-node-handle custom-node-handle--fail" type="source" position={Position.Right} id="failure" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

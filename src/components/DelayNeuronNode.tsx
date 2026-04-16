import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';
import { useNeuronContext } from './useNeuronContext';
import './CustomNeuronNodes.css';

const COLOR = '#6366f1';

interface DelayNodeData {
    label: string;
    neuronId: string;
    readonly?: boolean;
}

export const DelayNeuronNode = ({ data, id }: { data: DelayNodeData; id: string }) => {
    const nId = data.neuronId || id;
    const { context, loaded, updateContext } = useNeuronContext(nId);
    const ro = !!data.readonly;

    return (
        <div className={`custom-node custom-node--delay${ro ? ' custom-node--readonly' : ''}`}>
            <div className="custom-node-header" style={{ background: COLOR }}>
                <div className="custom-node-header-left">
                    <Clock size={16} className="custom-node-header-icon" color="#fff" />
                    <span className="custom-node-header-title">{data.label || 'Delay'}</span>
                </div>
                <span className="custom-node-header-id">#{id}</span>
            </div>

            <div className="custom-node-body">
                {loaded ? (
                    <div className="custom-node-field">
                        <span className="custom-node-field-label">WAIT</span>
                        <input
                            className="nodrag custom-node-field-input"
                            type="number"
                            min="0"
                            step="1"
                            value={context.delay || '5'}
                            onChange={e => updateContext('delay', e.target.value)}
                        />
                        <span className="custom-node-field-label" style={{ minWidth: 'auto' }}>seconds</span>
                    </div>
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
                            <span className="custom-node-port-label custom-node-port-label--flow">OUT</span>
                            <Handle className="custom-node-handle custom-node-handle--flow" type="source" position={Position.Right} id="flow" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';
import { useNeuronContext } from './useNeuronContext';
import './CustomNeuronNodes.css';

const COLOR = '#06b6d4';
const OPERATORS = ['exists', 'equals', 'not_equals', 'gt', 'lt'];

interface GateNodeData {
    label: string;
    neuronId: string;
    readonly?: boolean;
}

export const GateNeuronNode = ({ data, id }: { data: GateNodeData; id: string }) => {
    const nId = data.neuronId || id;
    const { context, loaded, updateContext } = useNeuronContext(nId);
    const ro = !!data.readonly;

    return (
        <div className={`custom-node${ro ? ' custom-node--readonly' : ''}`}>
            <div className="custom-node-header" style={{ background: COLOR }}>
                <div className="custom-node-header-left">
                    <GitBranch size={16} className="custom-node-header-icon" color="#fff" />
                    <span className="custom-node-header-title">{data.label || 'Gate'}</span>
                </div>
                <span className="custom-node-header-id">#{id}</span>
            </div>

            <div className="custom-node-body">
                {loaded ? (
                    <>
                        <div className="custom-node-field">
                            <span className="custom-node-field-label">KEY</span>
                            <input
                                className="nodrag custom-node-field-input"
                                value={context.gate_key || ''}
                                placeholder="blackboard key"
                                onChange={e => updateContext('gate_key', e.target.value)}
                            />
                        </div>
                        <div className="custom-node-field">
                            <span className="custom-node-field-label">OP</span>
                            <select
                                className="nodrag custom-node-field-select"
                                value={context.gate_operator || 'exists'}
                                onChange={e => updateContext('gate_operator', e.target.value)}
                            >
                                {OPERATORS.map(op => (
                                    <option key={op} value={op}>{op}</option>
                                ))}
                            </select>
                        </div>
                        {context.gate_operator && context.gate_operator !== 'exists' && (
                            <div className="custom-node-field">
                                <span className="custom-node-field-label">VALUE</span>
                                <input
                                    className="nodrag custom-node-field-input"
                                    value={context.gate_value || ''}
                                    placeholder="expected value"
                                    onChange={e => updateContext('gate_value', e.target.value)}
                                />
                            </div>
                        )}
                    </>
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

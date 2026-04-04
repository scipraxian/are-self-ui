import { Handle, Position } from 'reactflow';
import { RotateCw } from 'lucide-react';
import { useNeuronContext } from './useNeuronContext';
import './CustomNeuronNodes.css';

const COLOR = '#f59e0b';

interface RetryNodeData {
    label: string;
    neuronId: string;
    readonly?: boolean;
}

export const RetryNeuronNode = ({ data, id }: { data: RetryNodeData; id: string }) => {
    const nId = data.neuronId || id;
    const { context, loaded, updateContext } = useNeuronContext(nId);
    const ro = !!data.readonly;

    return (
        <div className={`custom-node${ro ? ' custom-node--readonly' : ''}`}>
            <div className="custom-node-header" style={{ background: COLOR }}>
                <div className="custom-node-header-left">
                    <RotateCw size={16} className="custom-node-header-icon" color="#fff" />
                    <span className="custom-node-header-title">{data.label || 'Retry'}</span>
                </div>
                <span className="custom-node-header-id">#{id}</span>
            </div>

            <div className="custom-node-body">
                {loaded ? (
                    <>
                        <div className="custom-node-field">
                            <span className="custom-node-field-label">RETRIES</span>
                            <input
                                className="nodrag custom-node-field-input"
                                type="number"
                                min="1"
                                max="99"
                                value={context.max_retries || '3'}
                                onChange={e => updateContext('max_retries', e.target.value)}
                            />
                        </div>
                        <div className="custom-node-field">
                            <span className="custom-node-field-label">DELAY</span>
                            <input
                                className="nodrag custom-node-field-input"
                                type="number"
                                min="0"
                                step="1"
                                value={context.retry_delay || context.delay || '0'}
                                placeholder="seconds between"
                                onChange={e => updateContext('retry_delay', e.target.value)}
                            />
                            <span className="custom-node-field-label" style={{ minWidth: 'auto' }}>s</span>
                        </div>
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

import './NeuronMonitorNode.css';
import { Handle, Position } from 'reactflow';
import type { Spike } from '../types';

interface NeuronMonitorData {
    label: string;
    effectorName: string | null;
    is_root?: boolean;
    invoked_pathway_name?: string | null;
    invoked_pathway_id?: number | string | null;
    spikeStatus: 'unrun' | 'running' | 'success' | 'failed' | 'pending';
    spike: Spike | null;
    spikeId?: number;
}

const statusClasses: Record<string, string> = {
    unrun: 'neuron-monitor--unrun',
    running: 'neuron-monitor--running',
    success: 'neuron-monitor--success',
    failed: 'neuron-monitor--failed',
    pending: 'neuron-monitor--pending',
};

function formatDuration(created: string, modified: string): string {
    const start = new Date(created).getTime();
    const end = new Date(modified).getTime();
    const ms = end - start;
    if (ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(0);
    return `${m}m ${rem}s`;
}

export const NeuronMonitorNode = ({ data }: { data: NeuronMonitorData }) => {
    const statusClass = statusClasses[data.spikeStatus] || statusClasses.unrun;
    const isRoot = !!data.is_root;

    const hasSubGraph = !!data.invoked_pathway_id;

    return (
        <div className={`neuron-monitor-node ${statusClass}${hasSubGraph ? ' neuron-monitor--subgraph' : ''}`}>
            {!isRoot && (
                <Handle type="target" position={Position.Left} id="in" className="neuron-monitor-handle neuron-monitor-handle--in" />
            )}

            <div className="neuron-monitor-body">
                <div className="neuron-monitor-label">
                    {data.invoked_pathway_id && <span className="neuron-monitor-subgraph-icon" title="Sub-graph — double-click to drill in">⧉ </span>}
                    {data.label}
                </div>
                {data.spike && (
                    <div className="neuron-monitor-timing">
                        {formatDuration(data.spike.created, data.spike.modified)}
                    </div>
                )}
                {data.effectorName && data.effectorName !== data.label && (
                    <div className="neuron-monitor-effector">{data.effectorName}</div>
                )}
            </div>

            <Handle type="source" position={Position.Right} id="always" className="neuron-monitor-handle neuron-monitor-handle--flow" />
            {!isRoot && (
                <>
                    <Handle type="source" position={Position.Right} id="success" className="neuron-monitor-handle neuron-monitor-handle--success" />
                    <Handle type="source" position={Position.Right} id="failure" className="neuron-monitor-handle neuron-monitor-handle--fail" />
                </>
            )}
        </div>
    );
};

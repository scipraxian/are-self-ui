import './NeuronMonitorNode.css';
import { Handle, Position } from 'reactflow';
import { Network, Play, GitBranch, RotateCw, Clock, Brain, Bug } from 'lucide-react';
import { EFFECTOR, EFFECTOR_STYLE } from './nodeConstants';
import type { Spike } from '../types';

interface NeuronMonitorData {
    label: string;
    effectorName: string | null;
    effectorId?: string | null;
    is_root?: boolean;
    invoked_pathway_name?: string | null;
    invoked_pathway_id?: string | null;
    spikeStatus: 'unrun' | 'running' | 'success' | 'failed' | 'pending';
    spike: Spike | null;
    spikeId?: string;
}

const statusClasses: Record<string, string> = {
    unrun: 'neuron-monitor--unrun',
    running: 'neuron-monitor--running',
    success: 'neuron-monitor--success',
    failed: 'neuron-monitor--failed',
    pending: 'neuron-monitor--pending',
};

/** Pick the right icon component for a known effector type */
const EFFECTOR_ICON: Record<string, typeof GitBranch> = {
    [EFFECTOR.BEGIN_PLAY]: Play,
    [EFFECTOR.LOGIC_GATE]: GitBranch,
    [EFFECTOR.LOGIC_RETRY]: RotateCw,
    [EFFECTOR.LOGIC_DELAY]: Clock,
    [EFFECTOR.FRONTAL_LOBE]: Brain,
    [EFFECTOR.DEBUG]: Bug,
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

    // Effector-type-aware accent
    const effId = data.effectorId;
    const style = effId ? EFFECTOR_STYLE[effId] : undefined;
    const IconComponent = effId ? EFFECTOR_ICON[effId] : undefined;
    const accentColor = style?.color;

    return (
        <div
            className={`neuron-monitor-node ${statusClass}${hasSubGraph ? ' neuron-monitor--subgraph' : ''}`}
            style={accentColor ? { '--monitor-accent': accentColor } as React.CSSProperties : undefined}
        >
            {!isRoot && (
                <Handle type="target" position={Position.Left} id="in" className="neuron-monitor-handle neuron-monitor-handle--in" />
            )}

            {data.invoked_pathway_id && (
                <span className="neuron-monitor-subgraph-indicator" title="Sub-graph — double-click to drill">
                    <Network size={10} />
                </span>
            )}

            <div className="neuron-monitor-body">
                <div className="neuron-monitor-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {IconComponent && (
                        <IconComponent size={13} style={{ color: accentColor, flexShrink: 0 }} />
                    )}
                    {data.label}
                </div>
                {style && (
                    <div className="neuron-monitor-type-badge" style={{ color: accentColor }}>
                        {style.label}
                    </div>
                )}
                {data.spike && (
                    <div className="neuron-monitor-timing">
                        {formatDuration(data.spike.created, data.spike.modified)}
                    </div>
                )}
                {data.effectorName && data.effectorName !== data.label && !style && (
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

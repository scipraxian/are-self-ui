import { useDuration } from '../hooks/useDuration';
import type {SpikeTrain} from "../types.ts";
import React from "react";

// Define the exact shape of your props
interface SpikeTrainCardProps {
    spikeTrain: SpikeTrain;
    onViewGraph: (id: number) => void;
    onEditGraph: (pathwayId: number) => void;
    onStop: (id: number) => void;
}


export const SpikeTrainCard: React.FC<SpikeTrainCardProps> = ({
                                                                  spikeTrain,
                                                                  onViewGraph,
                                                                  onEditGraph,
                                                                  onStop
                                                              }) => {
    const { formattedDuration, isActive } = useDuration(
        spikeTrain.created,
        spikeTrain.modified,
        spikeTrain.status_name
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Completed': return '#10b981';
            case 'Running': return '#38bdf8';
            case 'Failed': return '#ef4444';
            default: return '#64748b';
        }
    };

    return (
        <div style={{
            border: `1px solid ${isActive ? '#38bdf8' : '#334155'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            backgroundColor: 'var(--bg-panel, #0f172a)',
            boxShadow: isActive ? '0 0 15px rgba(56, 189, 248, 0.1)' : 'none'
        }}>
            {/* Header: Title and Live Timer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h3 style={{ color: '#e2e8f0', margin: '0 0 4px 0' }}>{spikeTrain.pathway_name}</h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {spikeTrain.id}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ color: getStatusColor(spikeTrain.status_name), fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                        {spikeTrain.status_name}
                    </div>
                    <div style={{ fontFamily: 'monospace', color: '#cbd5e1', fontSize: '1.2rem' }}>
                        {formattedDuration}
                    </div>
                </div>
            </div>

            {/* The Swimlane: Mapping the Spikes */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px' }}>
                {spikeTrain.spikes.map(spike => (
                    <div key={spike.id} style={{
                        minWidth: '140px',
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b',
                        borderLeft: `4px solid ${getStatusColor(spike.status_name)}`
                    }}>
                        <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {spike.effector_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{spike.status_name}</span>
                            {spike.target_hostname && <span>{spike.target_hostname}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                <button className="cns-btn" onClick={() => onViewGraph(spikeTrain.id)}>
                    View Graph
                </button>
                <button className="cns-btn" onClick={() => onEditGraph(spikeTrain.pathway)}>
                    Edit NeuralPathway
                </button>
                {isActive && (
                    <button className="cns-btn danger" onClick={() => onStop(spikeTrain.id)} style={{ marginLeft: 'auto', color: '#ef4444', borderColor: '#7f1d1d' }}>
                        Stop Execution
                    </button>
                )}
            </div>
        </div>
    );
};
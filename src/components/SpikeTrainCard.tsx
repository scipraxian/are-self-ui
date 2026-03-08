import "./SpikeTrainCard.css";
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
            <div className="common-layout-3">
                <div>
                    <h3 className="spiketraincard-ui-199">{spikeTrain.pathway_name}</h3>
                    <span className="common-layout-29">ID: {spikeTrain.id}</span>
                </div>
                <div className="spiketraincard-ui-198">
                    <div style={{ color: getStatusColor(spikeTrain.status_name), fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                        {spikeTrain.status_name}
                    </div>
                    <div className="spiketraincard-ui-197">
                        {formattedDuration}
                    </div>
                </div>
            </div>

            {/* The Swimlane: Mapping the Spikes */}
            <div className="spiketraincard-ui-196">
                {spikeTrain.spikes.map(spike => (
                    <div key={spike.id} style={{
                        minWidth: '140px',
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: '#1e293b',
                        borderLeft: `4px solid ${getStatusColor(spike.status_name)}`
                    }}>
                        <div className="spiketraincard-ui-195">
                            {spike.effector_name}
                        </div>
                        <div className="spiketraincard-ui-194">
                            <span>{spike.status_name}</span>
                            {spike.target_hostname && <span>{spike.target_hostname}</span>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Action Bar */}
            <div className="spiketraincard-ui-193">
                <button className="cns-btn" onClick={() => onViewGraph(spikeTrain.id)}>
                    View Graph
                </button>
                <button className="cns-btn" onClick={() => onEditGraph(spikeTrain.pathway)}>
                    Edit NeuralPathway
                </button>
                {isActive && (
                    <button className="cns-btn danger spiketraincard-ui-192" onClick={() => onStop(spikeTrain.id)}>
                        Stop Execution
                    </button>
                )}
            </div>
        </div>
    );
};
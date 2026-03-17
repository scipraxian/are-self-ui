import "./SpikeTrainCard.css";
import { useDuration } from '../hooks/useDuration';
import type {SpikeTrain} from "../types.ts";
import React from "react";
import { SpikeNode } from "./SpikeNode";

// Define the exact shape of your props
interface SpikeTrainCardProps {
    spikeTrain: SpikeTrain;
    onViewGraph: (id: number) => void;
    onEditGraph: (pathwayId: number) => void;
    onStop: (id: number) => void;
    onSpikeClick?: (spikeId: string) => void;
}


export const SpikeTrainCard: React.FC<SpikeTrainCardProps> = ({
                                                                  spikeTrain,
                                                                  onViewGraph,
                                                                  onEditGraph,
                                                                  onStop,
                                                                  onSpikeClick
                                                              }) => {
    const { formattedDuration, isActive } = useDuration(
        spikeTrain.created,
        spikeTrain.modified,
        spikeTrain.status_name
    );

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'Completed': return 'success';
            case 'Running': return 'running';
            case 'Failed': return 'failed';
            default: return 'pending';
        }
    };

    const statusClass = getStatusClass(spikeTrain.status_name);

    return (
        <div className={`spiketraincard-root ${isActive ? "spiketraincard-root--active" : ""}`}>
            {/* Header: Title and Live Timer */}
            <div className="common-layout-3">
                <div>
                    <h3 className="spiketraincard-ui-199">{spikeTrain.pathway_name}</h3>
                    <span className="common-layout-29">ID: {spikeTrain.id}</span>
                </div>
                <div className="spiketraincard-ui-198">
                    <div className={`spiketraincard-status spiketraincard-status--${statusClass}`}>
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
                    <SpikeNode
                        key={spike.id}
                        spike={{
                            id: String(spike.id),
                            status_name: spike.status_name,
                            effector_name: spike.effector_name,
                            target_name: spike.target_hostname ?? undefined,
                            result_code: spike.result_code,
                        }}
                        onClick={onSpikeClick}
                    />
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
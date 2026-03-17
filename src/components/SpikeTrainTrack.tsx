import "./SpikeTrainTrack.css";
import { Eye, Edit, RotateCw } from "lucide-react";
import { useMemo } from "react";
import type { SpikeTrainData } from "../types";
import { SpikeNode } from "./SpikeNode";

interface SpikeTrainTrackProps {
    spikeTrain: SpikeTrainData;
    depth?: number;
    onViewGraph?: (pathwayId: string) => void;
    onEditGraph?: (pathwayId: string) => void;
    onRerunTrain?: (pathwayId: string) => void;
    onSpikeClick?: (spikeId: string) => void;
}

const getTrainStatusClass = (train: SpikeTrainData) => {
    if (train.is_alive) return "running";
    if (train.ended_successfully) return "success";
    if (train.ended_badly) return "failed";
    return "pending";
};

export const SpikeTrainTrack = ({
    spikeTrain,
    depth = 0,
    onViewGraph,
    onEditGraph,
    onRerunTrain,
    onSpikeClick,
}: SpikeTrainTrackProps) => {
    const statusClass = getTrainStatusClass(spikeTrain);
    const depthClass = `cns-spike_train-wrapper--depth-${Math.min(8, Math.max(0, depth))}`;

    const spikes = useMemo(() => {
        const history = spikeTrain.history || [];
        const liveChildren = spikeTrain.live_children || [];
        return [...history, ...liveChildren];
    }, [spikeTrain.history, spikeTrain.live_children]);

    const subTrains = spikeTrain.subgraphs || [];

    return (
        <div
            className={`cns-spike_train-wrapper ${depthClass} cns-spike_train-wrapper--${statusClass}`}
        >
            <div className="cns-spike_train-left">
                <div className="cns-spike_train-title" title={spikeTrain.pathway_name}>
                    {spikeTrain.pathway_name}
                </div>
                <div className={`cns-spike_train-status cns-spike_train-status--${statusClass}`}>
                    <span className="cns-spike_train-id">#{spikeTrain.id?.substring?.(0, 8) ?? spikeTrain.id}</span>
                    {spikeTrain.status?.name || "UNKNOWN"}
                </div>

                <div className="cns-spike_train-controls">
                    <button
                        className="cns-spike_train-btn"
                        onClick={() => onViewGraph?.(spikeTrain.pathway)}
                        title="View Graph"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        className="cns-spike_train-btn"
                        onClick={() => onEditGraph?.(spikeTrain.pathway)}
                        title="Edit Graph"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        className="cns-spike_train-btn"
                        onClick={() => onRerunTrain?.(spikeTrain.pathway)}
                        title="Rerun Train"
                        disabled={spikeTrain.is_alive}
                    >
                        <RotateCw size={16} />
                    </button>
                </div>
            </div>

            <div className="cns-spike_train">
                <div className="cns-spike_train-scroll">
                    {spikes.map((spike) => (
                        <SpikeNode key={spike.id} spike={spike} onClick={onSpikeClick} />
                    ))}
                </div>

                {subTrains.length > 0 && (
                    <div className="nested-spike_trains">
                        {subTrains.map((child) => (
                            <SpikeTrainTrack
                                key={child.id}
                                spikeTrain={child}
                                depth={depth + 1}
                                onViewGraph={onViewGraph}
                                onEditGraph={onEditGraph}
                                onRerunTrain={onRerunTrain}
                                onSpikeClick={onSpikeClick}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


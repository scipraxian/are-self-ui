import "./CNSView.css";
import React, { useEffect, useState } from 'react';
import { SpikeTrainCard } from './SpikeTrainCard';
import type { SpikeTrain } from "../types.ts";
import { apiFetch } from '../api';

// Add a prop to talk to your BloodBrainBarrier
interface CNSViewProps {
    onOpenPathway: (pathwayId: string) => void;
}

export const CNSView: React.FC<CNSViewProps> = ({ onOpenPathway }) => {
    const [spikeTrains, setSpikeTrains] = useState<SpikeTrain[]>([]);

    useEffect(() => {
        const fetchCNSData = async () => {
            try {
                const response = await fetch('/api/v2/spiketrains/');
                const data = await response.json();
                setSpikeTrains(data);
            } catch (error) {
                console.error("Failed to fetch CNS data", error);
            }
        };

        fetchCNSData();
        const interval = setInterval(fetchCNSData, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleStop = async (spikeTrainId: number) => {
        await apiFetch(`/api/v2/spiketrains/${spikeTrainId}/stop/`, { method: 'POST' });
    };

    return (
        <div className="cnsview-ui-34">
            <h2 className="cnsview-ui-33">Active SpikeTrains</h2>
            {spikeTrains.length === 0 ? (
                <div className="common-layout-19">No activity in the CNS.</div>
            ) : (
                spikeTrains.map(st => (
                    <SpikeTrainCard
                        key={st.id}
                        spikeTrain={st}
                        // Route BOTH buttons to your BBB state for now to stop the crash
                        onViewGraph={() => onOpenPathway(st.pathway.toString())}
                        onEditGraph={() => onOpenPathway(st.pathway.toString())}
                        onStop={handleStop}
                    />
                ))
            )}
        </div>
    );
};
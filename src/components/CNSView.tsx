import "./CNSView.css";
import React, { useEffect, useState } from 'react';
import type { DashboardSummary, SpikeTrainData } from "../types.ts";
import { apiFetch } from '../api';
import { SpikeTrainTrack } from './SpikeTrainTrack';
import { SpikeView } from '../pages/SpikeView';

interface CNSViewProps {
    /** Open pathway in read-only monitor mode (view graph). */
    onViewPathway: (pathwayId: string) => void;
    /** Open pathway in edit mode (edit neural pathway). */
    onEditPathway: (pathwayId: string) => void;
    selectedEnvironmentId: string;
}

export const CNSView: React.FC<CNSViewProps> = ({ onViewPathway, onEditPathway }) => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [selectedSpikeId, setSelectedSpikeId] = useState<string | null>(null);

    useEffect(() => {
        const fetchCNSData = async () => {
            try {
                const res = await apiFetch('/api/v2/dashboard/summary/');
                if (!res.ok) return;
                const data = (await res.json()) as DashboardSummary;
                setSummary(data);
            } catch (error) {
                console.error("Failed to fetch CNS data", error);
            }
        };

        fetchCNSData();
        const interval = setInterval(fetchCNSData, 5000);
        return () => clearInterval(interval);
    }, []);
    const missions: SpikeTrainData[] = summary?.recent_missions ?? [];

    return (
        <div className="cnsview-ui-34">
            <h2 className="cnsview-ui-33">Active SpikeTrains</h2>

            {missions.length === 0 ? (
                <div className="common-layout-19">No activity in the CNS.</div>
            ) : (
                <div className="cnsview-tracklist">
                    {missions.map((mission) => (
                        <SpikeTrainTrack
                            key={mission.id}
                            spikeTrain={mission}
                            onViewGraph={onViewPathway}
                            onEditGraph={onEditPathway}
                            onRerunTrain={(pid) => {
                                apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pid)}/launch/`, { method: 'POST' }).catch(() => undefined);
                            }}
                            onSpikeClick={(spikeId) => setSelectedSpikeId(spikeId)}
                        />
                    ))}
                </div>
            )}

            {selectedSpikeId && (
                <div className="cnsview-terminal glass-panel">
                    <SpikeView initialSpikeId={selectedSpikeId} />
                </div>
            )}
        </div>
    );
};
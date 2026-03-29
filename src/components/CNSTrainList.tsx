import './CNSTrainList.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Edit, RefreshCw } from 'lucide-react';
import { apiFetch } from '../api';
import { useDendrite } from './SynapticCleft';
import type { SpikeTrain, Spike } from '../types';

interface CNSTrainListProps {
    filterPathwayId?: string | null;
    onSpikeSelect: (spikeId: string) => void;
    selectedSpikeId?: string | null;
}

const getTrainStatus = (train: SpikeTrain): string => {
    const name = (train.status_name || '').toLowerCase();
    if (name.includes('success') || name.includes('completed')) return 'success';
    if (name.includes('fail') || name.includes('error')) return 'failed';
    if (name.includes('running') || name.includes('active')) return 'running';
    if (name.includes('pending') || name.includes('queued')) return 'pending';
    return 'unknown';
};

const getSpikeStatus = (spike: Spike): string => {
    const name = (spike.status_name || '').toLowerCase();
    if (name.includes('success') || name.includes('completed')) return 'success';
    if (name.includes('fail') || name.includes('error')) return 'failed';
    if (name.includes('running') || name.includes('active')) return 'running';
    if (name.includes('pending') || name.includes('queued')) return 'pending';
    return 'unknown';
};

const computeDuration = (created: string, modified: string): string => {
    try {
        const ms = new Date(modified).getTime() - new Date(created).getTime();
        if (!Number.isFinite(ms) || ms < 0) return '—';
        const sec = ms / 1000;
        if (sec < 60) return `${sec.toFixed(1)}s`;
        const min = Math.floor(sec / 60);
        const rem = Math.floor(sec % 60);
        return `${min}m ${rem}s`;
    } catch {
        return '—';
    }
};

const parseSeconds = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value !== 'string') return 0;
    const clean = (value as string).trim().replace(/s$/i, '');
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
};

export const CNSTrainList = ({ filterPathwayId, onSpikeSelect, selectedSpikeId }: CNSTrainListProps) => {
    const navigate = useNavigate();
    const [trains, setTrains] = useState<SpikeTrain[]>([]);
    const [expandedTrains, setExpandedTrains] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    const fetchTrains = useCallback(async () => {
        try {
            let url = '/api/v2/spiketrains/?ordering=-created&limit=50';
            if (filterPathwayId) {
                url += `&pathway=${encodeURIComponent(filterPathwayId)}`;
            }
            const res = await apiFetch(url);
            if (!res.ok) return;
            const data = await res.json();
            setTrains(Array.isArray(data) ? data : data.results ?? []);
        } catch (err) {
            console.error('Failed to fetch spike trains', err);
        } finally {
            setIsLoading(false);
        }
    }, [filterPathwayId]);

    useEffect(() => {
        setIsLoading(true);
        fetchTrains();
    }, [fetchTrains]);

    // Real-time updates via Synaptic Cleft
    const spikeTrainEvent = useDendrite('SpikeTrain', null);
    const spikeEvent = useDendrite('Spike', null);

    useEffect(() => {
        if (spikeTrainEvent) fetchTrains();
    }, [spikeTrainEvent, fetchTrains]);

    useEffect(() => {
        if (spikeEvent) fetchTrains();
    }, [spikeEvent, fetchTrains]);

    const toggleExpand = (trainId: number) => {
        setExpandedTrains(prev => {
            const next = new Set(prev);
            if (next.has(trainId)) next.delete(trainId);
            else next.add(trainId);
            return next;
        });
    };

    const filterLabel = filterPathwayId
        ? trains.length > 0 ? trains[0].pathway_name : 'Filtered'
        : null;

    const headerText = filterLabel
        ? `${trains.length} Spike Train${trains.length !== 1 ? 's' : ''} (${filterLabel})`
        : `${trains.length} Spike Train${trains.length !== 1 ? 's' : ''}`;

    return (
        <div className="cns-trainlist">
            <div className="cns-trainlist-header">
                <span>{isLoading ? 'Loading…' : headerText}</span>
                <button className="cns-trainlist-refresh" onClick={fetchTrains} title="Refresh">
                    <RefreshCw size={12} />
                </button>
            </div>

            <div className="cns-trainlist-scroll">
                {!isLoading && trains.length === 0 && (
                    <div className="cns-trainlist-empty">No spike trains found.</div>
                )}

                {trains.map(train => {
                    const status = getTrainStatus(train);
                    const isExpanded = expandedTrains.has(train.id);
                    const spikeCount = train.spikes?.length ?? 0;
                    const duration = computeDuration(train.created, train.modified);
                    const shortHash = String(train.id).substring(0, 6).toUpperCase();

                    return (
                        <div key={train.id} className={`cns-train-row cns-train-row--${status}`}>
                            <div className="cns-train-summary" onClick={() => toggleExpand(train.id)}>
                                <span className={`cns-train-chevron ${isExpanded ? 'cns-train-chevron--open' : ''}`}>
                                    ▶
                                </span>
                                <span className="cns-train-pathway">{train.pathway_name}</span>
                                <span className="cns-train-hash">#{shortHash}</span>
                                <span className={`cns-train-status cns-train-status--${status}`}>
                                    {train.status_name || 'UNKNOWN'}
                                </span>
                                <span className="cns-train-spike-count">
                                    {spikeCount} spike{spikeCount !== 1 ? 's' : ''}
                                </span>
                                <span className="cns-train-duration">{duration}</span>
                                <div className="cns-train-actions" onClick={e => e.stopPropagation()}>
                                    <button
                                        className="cns-train-action-btn"
                                        onClick={() => navigate(`/cns/monitor/${train.pathway}`)}
                                        title="View Graph"
                                    >
                                        <Eye size={13} />
                                    </button>
                                    <button
                                        className="cns-train-action-btn"
                                        onClick={() => navigate(`/cns/edit/${train.pathway}`)}
                                        title="Edit Graph"
                                    >
                                        <Edit size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className={`cns-train-spikes ${isExpanded ? 'cns-train-spikes--expanded' : 'cns-train-spikes--collapsed'}`}>
                                {(train.spikes || []).map((spike: Spike) => {
                                    const spikeStatus = getSpikeStatus(spike);
                                    const isSelected = selectedSpikeId === String(spike.id);
                                    const deltaSec = parseSeconds(spike.delta);
                                    const avgSec = parseSeconds(spike.average_delta);
                                    let trendClass = 'flat';
                                    if (avgSec > 0) {
                                        if (deltaSec > avgSec * 1.2) trendClass = 'slower';
                                        else if (deltaSec < avgSec * 0.8) trendClass = 'faster';
                                    }

                                    return (
                                        <div
                                            key={spike.id}
                                            className={`cns-spike-row ${isSelected ? 'cns-spike-row--selected' : ''}`}
                                            onClick={() => onSpikeSelect(String(spike.id))}
                                        >
                                            <span className="cns-spike-effector" title={spike.effector_name}>
                                                {spike.effector_name}
                                            </span>
                                            <span className={`cns-spike-status cns-spike-status--${spikeStatus}`}>
                                                {spike.status_name}
                                            </span>
                                            {spike.delta && (
                                                <span className={`cns-spike-delta cns-spike-delta--${trendClass}`}>
                                                    {deltaSec.toFixed(1)}s
                                                </span>
                                            )}
                                            {avgSec > 0 && (
                                                <span className="cns-spike-avg">AVG {avgSec.toFixed(1)}s</span>
                                            )}
                                            {spike.target_hostname && (
                                                <span className="cns-spike-host">{spike.target_hostname}</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

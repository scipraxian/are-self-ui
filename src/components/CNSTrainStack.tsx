import './CNSTrainStack.css';
import { useNavigate } from 'react-router-dom';
import { CNSSpikeBar } from './CNSSpikeBar';
import type { SpikeTrain } from '../types';

interface CNSTrainStackProps {
    trains: SpikeTrain[];
    pathwayId: string;
}

const getTrainStatus = (train: SpikeTrain): string => {
    const name = (train.status_name || '').toLowerCase();
    if (name.includes('success') || name.includes('completed')) return 'success';
    if (name.includes('fail') || name.includes('error')) return 'failed';
    if (name.includes('running') || name.includes('active')) return 'running';
    if (name.includes('pending') || name.includes('queued')) return 'pending';
    return 'unknown';
};

const computeDuration = (created: string, modified: string): number => {
    try {
        const ms = new Date(modified).getTime() - new Date(created).getTime();
        if (!Number.isFinite(ms) || ms < 0) return 0;
        return ms / 1000;
    } catch {
        return 0;
    }
};

const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const min = Math.floor(seconds / 60);
    const rem = Math.floor(seconds % 60);
    return `${min}m ${rem}s`;
};

const formatTimeAgo = (dateStr: string): string => {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 0) return 'just now';
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    } catch {
        return '';
    }
};

const shortHash = (id: number | string): string => {
    const s = String(id);
    return '#' + s.slice(0, 6).toUpperCase();
};

export const CNSTrainStack = ({ trains, pathwayId }: CNSTrainStackProps) => {
    const navigate = useNavigate();

    if (trains.length === 0) {
        return (
            <div className="cns-train-stack">
                <div className="cns-train-stack-empty">No spike trains recorded for this pathway.</div>
            </div>
        );
    }

    const handleSpikeClick = (spikeId: string) => {
        navigate(`/cns/spike/${spikeId}`);
    };

    const handleTrainClick = () => {
        navigate(`/cns/monitor/${pathwayId}`);
    };

    return (
        <div className="cns-train-stack">
            {trains.map(train => {
                const status = getTrainStatus(train);
                const duration = computeDuration(train.created, train.modified);

                return (
                    <div
                        key={train.id}
                        className={`cns-train-row cns-train-row--${status}`}
                        onClick={handleTrainClick}
                    >
                        <div className="cns-train-header">
                            <span className="cns-train-hash">{shortHash(train.id)}</span>
                            <span className={`cns-train-status-pill cns-train-status-pill--${status}`}>
                                {train.status_name || 'UNKNOWN'}
                            </span>
                            <span className="cns-train-duration">{formatDuration(duration)}</span>
                            <span className="cns-train-spike-count">{train.spikes.length} spike{train.spikes.length !== 1 ? 's' : ''}</span>
                            <span className="cns-train-time-ago">{formatTimeAgo(train.modified)}</span>
                        </div>

                        {train.spikes.length > 0 && (
                            <CNSSpikeBar
                                spikes={train.spikes}
                                onSpikeClick={handleSpikeClick}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
};

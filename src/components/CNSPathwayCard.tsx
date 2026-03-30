import './CNSPathwayCard.css';
import { useNavigate } from 'react-router-dom';
import { Play, Edit } from 'lucide-react';
import { CNSSparkline } from './CNSSparkline';
import { apiFetch } from '../api';
import type { NeuralPathway, SpikeTrain } from '../types';

interface CNSPathwayCardProps {
    pathway: NeuralPathway;
    trains: SpikeTrain[];
}

const getTrainStatus = (train: SpikeTrain): string => {
    const name = (train.status_name || '').toLowerCase();
    if (name.includes('success') || name.includes('completed')) return 'success';
    if (name.includes('fail') || name.includes('error')) return 'failed';
    if (name.includes('running') || name.includes('active')) return 'running';
    if (name.includes('pending') || name.includes('queued')) return 'pending';
    return 'unknown';
};

const isLiveStatus = (status: string): boolean =>
    status === 'running' || status === 'pending';

const computeDurationSeconds = (created: string, modified: string): number => {
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

const mean = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
};

export const CNSPathwayCard = ({ pathway, trains }: CNSPathwayCardProps) => {
    const navigate = useNavigate();

    const sortedTrains = [...trains].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    const lastTrain = sortedTrains[0] || null;
    const lastStatus = lastTrain ? getTrainStatus(lastTrain) : 'unknown';
    const lastDuration = lastTrain ? computeDurationSeconds(lastTrain.created, lastTrain.modified) : 0;
    const lastTimeAgo = lastTrain ? formatTimeAgo(lastTrain.modified) : '';

    const durations = sortedTrains
        .slice(0, 15)
        .map(t => computeDurationSeconds(t.created, t.modified))
        .reverse(); // oldest first for sparkline (newest on right)

    const totalRuns = trains.length;
    const failCount = trains.filter(t => {
        const s = getTrainStatus(t);
        return s === 'failed';
    }).length;
    const liveTrains = trains.filter(t => isLiveStatus(getTrainStatus(t))).length;
    const avgDuration = mean(durations);

    // Compute trend
    let trend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (durations.length >= 4) {
        const firstHalf = durations.slice(0, Math.floor(durations.length / 2));
        const secondHalf = durations.slice(Math.floor(durations.length / 2));
        const avgFirst = mean(firstHalf);
        const avgSecond = mean(secondHalf);
        if (avgSecond < avgFirst * 0.9) trend = 'improving';
        else if (avgSecond > avgFirst * 1.1) trend = 'worsening';
    }

    const handleLaunch = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathway.id)}/launch/`, { method: 'POST' });
        } catch {
            // ignore
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/cns/pathway/${pathway.id}/edit`);
    };

    const accentClass = lastStatus === 'success' ? 'cns-card--success'
        : lastStatus === 'failed' ? 'cns-card--failed'
        : (lastStatus === 'running' || lastStatus === 'pending') ? 'cns-card--running'
        : '';

    return (
        <div
            className={`cns-card ${accentClass} ${liveTrains > 0 ? 'cns-card--live' : ''}`}
            onClick={() => navigate(`/cns/pathway/${pathway.id}`)}
        >
            <div className="cns-card-header">
                <span className="cns-card-name">{pathway.name}</span>
                <div className="cns-card-header-actions">
                    {pathway.is_favorite && <span className="cns-card-star">★</span>}
                    <button className="cns-card-action cns-card-action--launch" onClick={handleLaunch} title="Launch">
                        <Play size={12} />
                    </button>
                    <button className="cns-card-action" onClick={handleEdit} title="Edit Graph">
                        <Edit size={12} />
                    </button>
                </div>
            </div>

            {pathway.description && (
                <div className="cns-card-description">{pathway.description}</div>
            )}

            <div className="cns-card-divider" />

            {lastTrain ? (
                <>
                    <div className="cns-card-last-run">
                        <span className={`cns-card-status cns-card-status--${lastStatus}`}>
                            {lastTrain.status_name || 'UNKNOWN'}
                        </span>
                        <span className="cns-card-duration">{formatDuration(lastDuration)}</span>
                        <span className="cns-card-time-ago">({lastTimeAgo})</span>
                    </div>

                    <CNSSparkline data={durations} trend={trend} />

                    <div className="cns-card-divider" />

                    <div className="cns-card-stats">
                        <span className="cns-card-stat">AVG {formatDuration(avgDuration)}</span>
                        <span className="cns-card-stat-sep">·</span>
                        <span className="cns-card-stat">{totalRuns} runs</span>
                        <span className="cns-card-stat-sep">·</span>
                        <span className="cns-card-stat">{failCount} fails</span>
                    </div>

                    {liveTrains > 0 && (
                        <div className="cns-card-live">
                            <span className="cns-card-live-dot" />
                            {liveTrains} live train{liveTrains !== 1 ? 's' : ''}
                        </div>
                    )}
                </>
            ) : (
                <div className="cns-card-no-runs">No runs yet</div>
            )}
        </div>
    );
};

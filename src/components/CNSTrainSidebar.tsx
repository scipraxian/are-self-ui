import './CNSTrainSidebar.css';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import type { NeuralPathway, SpikeTrain } from '../types';

interface CNSTrainSidebarProps {
    pathway: NeuralPathway | null;
    trains: SpikeTrain[];
    pathwayId: string;
}

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
        return '-';
    }
};

export const CNSTrainSidebar = ({ pathway, trains, pathwayId }: CNSTrainSidebarProps) => {
    const navigate = useNavigate();

    const totalRuns = trains.length;

    const successCount = trains.filter(t => {
        const s = (t.status_name || '').toLowerCase();
        return s.includes('success') || s.includes('completed');
    }).length;

    const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;

    const durations = trains.map(t => computeDuration(t.created, t.modified));
    const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const lastRun = trains.length > 0 ? trains[0].modified : null;

    const handleLaunch = async () => {
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/launch/`, { method: 'POST' });
        } catch {
            // ignore
        }
    };

    return (
        <div className="cns-train-sidebar">
            <h2 className="cns-train-sidebar-title">
                {pathway?.name || `Pathway #${pathwayId}`}
            </h2>

            {pathway?.description && (
                <p className="cns-train-sidebar-desc">{pathway.description}</p>
            )}

            <div className="cns-train-sidebar-actions">
                <button className="cns-train-sidebar-action cns-train-sidebar-action--launch" onClick={handleLaunch}>
                    &#9654; Launch New Train
                </button>
                <button className="cns-train-sidebar-action" onClick={() => navigate(`/cns/monitor/${pathwayId}`)}>
                    &#8857; View Graph
                </button>
                <button className="cns-train-sidebar-action" onClick={() => navigate(`/cns/edit/${pathwayId}`)}>
                    &#9998; Edit Graph
                </button>
            </div>

            <div className="cns-train-sidebar-stats">
                <div className="cns-train-sidebar-stat">
                    <span className="cns-train-sidebar-stat-label">Total Runs</span>
                    <span className="cns-train-sidebar-stat-value">{totalRuns}</span>
                </div>
                <div className="cns-train-sidebar-stat">
                    <span className="cns-train-sidebar-stat-label">Success Rate</span>
                    <span className="cns-train-sidebar-stat-value">{successRate}%</span>
                </div>
                <div className="cns-train-sidebar-stat">
                    <span className="cns-train-sidebar-stat-label">Avg Duration</span>
                    <span className="cns-train-sidebar-stat-value">{formatDuration(avgDuration)}</span>
                </div>
                <div className="cns-train-sidebar-stat">
                    <span className="cns-train-sidebar-stat-label">Last Run</span>
                    <span className="cns-train-sidebar-stat-value">{lastRun ? formatTimeAgo(lastRun) : '-'}</span>
                </div>
            </div>
        </div>
    );
};

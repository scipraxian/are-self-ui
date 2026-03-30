import './CNSMonitorSidebar.css';
import type { SpikeTrain } from '../types';

interface CNSMonitorSidebarProps {
    pathwayName: string;
    pathwayDescription: string;
    trains: SpikeTrain[];
    selectedTrainId: string;
    onSelectTrain: (id: string) => void;
    autoPan: boolean;
    onAutoPanChange: (enabled: boolean) => void;
    onLaunch: () => void;
    onEdit: () => void;
    onBack: () => void;
}

function shortHash(id: number | string): string {
    return String(id).substring(0, 8);
}

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatDuration(created: string, modified: string): string {
    const ms = new Date(modified).getTime() - new Date(created).getTime();
    if (ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(0);
    return `${m}m ${rem}s`;
}

export function CNSMonitorSidebar({
    pathwayName,
    pathwayDescription,
    trains,
    selectedTrainId,
    onSelectTrain,
    autoPan,
    onAutoPanChange,
    onLaunch,
    onEdit,
    onBack,
}: CNSMonitorSidebarProps) {
    const selectedTrain = trains.find(t => String(t.id) === selectedTrainId) || trains[0];

    return (
        <div className="cns-monitor-sidebar">
            <h3 className="cns-monitor-sidebar-title font-display">{pathwayName}</h3>
            {pathwayDescription && (
                <p className="cns-monitor-sidebar-desc">{pathwayDescription}</p>
            )}

            <div className="cns-monitor-sidebar-section">
                <label className="cns-monitor-sidebar-label font-mono">SPIKE TRAIN</label>
                <select
                    className="cns-monitor-sidebar-select"
                    value={selectedTrainId}
                    onChange={(e) => onSelectTrain(e.target.value)}
                >
                    {trains.map(t => (
                        <option key={t.id} value={String(t.id)}>
                            #{shortHash(t.id)} — {t.status_name} — {timeAgo(t.created)}
                        </option>
                    ))}
                </select>
            </div>

            {selectedTrain && (
                <div className="cns-monitor-sidebar-stats">
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">STATUS</span>
                        <span className="cns-monitor-sidebar-stat-value">{selectedTrain.status_name}</span>
                    </div>
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">SPIKES</span>
                        <span className="cns-monitor-sidebar-stat-value">{selectedTrain.spikes?.length ?? 0}</span>
                    </div>
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">DURATION</span>
                        <span className="cns-monitor-sidebar-stat-value">
                            {formatDuration(selectedTrain.created, selectedTrain.modified)}
                        </span>
                    </div>
                </div>
            )}

            <div className="cns-monitor-sidebar-actions">
                <button className="btn-action cns-monitor-sidebar-btn cns-monitor-sidebar-btn--launch" onClick={onLaunch}>
                    Launch New Train
                </button>
                <button className="btn-ghost cns-monitor-sidebar-btn" onClick={onEdit}>
                    Edit Graph
                </button>
                <button className="btn-ghost cns-monitor-sidebar-btn" onClick={onBack}>
                    Back to Timeline
                </button>
            </div>

            <label className="cns-monitor-sidebar-toggle">
                <input
                    type="checkbox"
                    checked={autoPan}
                    onChange={(e) => onAutoPanChange(e.target.checked)}
                />
                <span className="cns-monitor-sidebar-toggle-text font-mono">Auto-pan to active node</span>
            </label>
        </div>
    );
}

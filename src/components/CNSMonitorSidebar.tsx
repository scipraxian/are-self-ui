import { useState } from 'react';
import { OctagonX, Square } from 'lucide-react';
import { apiFetch } from '../api';
import './CNSMonitorSidebar.css';
import type { SpikeTrain } from '../types';

interface CNSMonitorSidebarProps {
    pathwayName: string;
    pathwayDescription: string;
    pathwayId: string;
    train: SpikeTrain | null;
    autoPan: boolean;
    onAutoPanChange: (enabled: boolean) => void;
    onLaunch: () => void;
    onEdit: () => void;
    onBack: () => void;
}

const ALIVE_STATUSES = ['created', 'pending', 'running', 'delegated', 'stopping'];

function shortHash(id: number | string): string {
    return String(id).substring(0, 8);
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
    train,
    autoPan,
    onAutoPanChange,
    onLaunch,
    onEdit,
    onBack,
}: CNSMonitorSidebarProps) {
    const [stopping, setStopping] = useState(false);

    const trainIsAlive = train && ALIVE_STATUSES.includes((train.status_name || '').toLowerCase());
    const trainIsStopping = train && (train.status_name || '').toLowerCase() === 'stopping';

    const handleStop = async () => {
        if (!train) return;
        setStopping(true);
        try {
            await apiFetch(`/api/v2/spiketrains/${train.id}/stop/`, { method: 'POST' });
        } catch (err) {
            console.error('Failed to stop train:', err);
        } finally {
            setStopping(false);
        }
    };

    const handleTerminate = async () => {
        if (!train) return;
        setStopping(true);
        try {
            await apiFetch(`/api/v2/spiketrains/${train.id}/terminate/`, { method: 'POST' });
        } catch (err) {
            console.error('Failed to terminate train:', err);
        } finally {
            setStopping(false);
        }
    };

    return (
        <div className="cns-monitor-sidebar">
            <h3 className="cns-monitor-sidebar-title font-display">{pathwayName}</h3>
            {pathwayDescription && (
                <p className="cns-monitor-sidebar-desc">{pathwayDescription}</p>
            )}

            {train && (
                <div className="cns-monitor-sidebar-stats">
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">TRAIN</span>
                        <span className="cns-monitor-sidebar-stat-value">#{shortHash(train.id)}</span>
                    </div>
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">STATUS</span>
                        <span className="cns-monitor-sidebar-stat-value">{train.status_name}</span>
                    </div>
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">SPIKES</span>
                        <span className="cns-monitor-sidebar-stat-value">{train.spikes?.length ?? 0}</span>
                    </div>
                    <div className="cns-monitor-sidebar-stat">
                        <span className="cns-monitor-sidebar-stat-label font-mono">DURATION</span>
                        <span className="cns-monitor-sidebar-stat-value">
                            {formatDuration(train.created, train.modified)}
                        </span>
                    </div>
                </div>
            )}

            <div className="cns-monitor-sidebar-actions">
                <button className="btn-action cns-monitor-sidebar-btn cns-monitor-sidebar-btn--launch" onClick={onLaunch}>
                    Launch New Train
                </button>

                {trainIsAlive && !trainIsStopping && (
                    <button
                        className="btn-ghost cns-monitor-sidebar-btn cns-monitor-sidebar-btn--stop"
                        onClick={handleStop}
                        disabled={stopping}
                    >
                        <Square size={14} />
                        {stopping ? 'Stopping...' : 'Stop Train'}
                    </button>
                )}

                {trainIsAlive && (
                    <button
                        className="btn-ghost cns-monitor-sidebar-btn cns-monitor-sidebar-btn--terminate"
                        onClick={handleTerminate}
                        disabled={stopping}
                    >
                        <OctagonX size={14} />
                        {stopping ? 'Terminating...' : 'Terminate'}
                    </button>
                )}

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

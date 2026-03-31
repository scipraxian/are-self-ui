import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api';
import './HeartbeatControlPanel.css';

const BEAT_STATUS_URL = '/api/v2/beat/status/';
const BEAT_START_URL = '/api/v2/beat/start/';
const BEAT_STOP_URL = '/api/v2/beat/stop/';
const POLL_INTERVAL_MS = 4000;

export interface BeatStatus {
    running: boolean;
    pid?: number;
}

export const HeartbeatControlPanel: React.FC = () => {
    const [status, setStatus] = useState<BeatStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await apiFetch(BEAT_STATUS_URL);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            const next = { running: !!data.running, pid: data.pid as number | undefined };
            setStatus((prev) => {
                if (prev && prev.running === next.running && prev.pid === next.pid) return prev;
                return next;
            });
            setError((prev) => (prev === null ? prev : null));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to fetch status');
            setStatus(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    const handleStart = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await apiFetch(BEAT_START_URL, { method: 'POST' });
            if (!res.ok) throw new Error(`Start failed: ${res.status}`);
            await fetchStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to start');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStop = async () => {
        setActionLoading(true);
        setError(null);
        try {
            const res = await apiFetch(BEAT_STOP_URL, { method: 'POST' });
            if (!res.ok) throw new Error(`Stop failed: ${res.status}`);
            await fetchStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to stop');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && status === null) {
        return (
            <div className="heartbeat-control-panel">
                <h2 className="glass-panel-title heartbeat-control-panel__title">HEARTBEAT</h2>
                <div className="bbb-placeholder font-mono text-sm">Checking status...</div>
            </div>
        );
    }

    const isRunning = status?.running ?? false;

    return (
        <div className="heartbeat-control-panel">
            <h2 className="glass-panel-title heartbeat-control-panel__title">HEARTBEAT</h2>

            <div className="heartbeat-control-panel__status common-layout-3">
                <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Celery Beat
                </span>
                <div className="heartbeat-control-panel__status-badge">
                    <span
                        className={`status-dot ${isRunning ? 'status-online' : ''}`}
                        style={!isRunning ? { backgroundColor: 'var(--text-muted)' } : undefined}
                    />
                    <span
                        className="font-mono text-sm"
                        style={{
                            color: isRunning ? 'var(--accent-green)' : 'var(--text-muted)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}
                    >
                        {isRunning ? 'Running' : 'Offline'}
                    </span>
                </div>
            </div>

            {isRunning && status?.pid != null && (
                <div className="heartbeat-control-panel__pid font-mono text-xs" style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
                    PID: {status.pid}
                </div>
            )}

            <div className="heartbeat-control-panel__actions">
                {isRunning ? (
                    <button
                        type="button"
                        className="btn-ghost"
                        onClick={handleStop}
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Stopping…' : 'Off'}
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-action"
                        onClick={handleStart}
                        disabled={actionLoading}
                    >
                        {actionLoading ? 'Starting…' : 'On'}
                    </button>
                )}
            </div>

            {error && (
                <div className="heartbeat-control-panel__error font-mono text-xs" style={{ color: 'var(--accent-red)', marginTop: 12 }}>
                    {error}
                </div>
            )}

            <p className="heartbeat-control-panel__disclaimer font-mono text-xs" style={{ color: 'var(--text-muted)', marginTop: 24 }}>
                Note: “Off” only stops the heartbeat started from this panel. It does not stop processes started manually (e.g. via talos.bat).
            </p>
        </div>
    );
};

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api';
import './SystemControlPanel.css';

const STATUS_URL = '/api/v2/system-control/status/';
const SHUTDOWN_URL = '/api/v2/system-control/shutdown/';
const RESTART_URL = '/api/v2/system-control/restart/';
const POLL_INTERVAL_MS = 5000;

export interface SystemStatus {
    worker_count: number;
}

export const SystemControlPanel: React.FC = () => {
    const [status, setStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await apiFetch(STATUS_URL);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            const next = { worker_count: data.workers_online as number };
            setStatus((prev) => {
                if (prev && prev.worker_count === next.worker_count) return prev;
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

    const handleShutdown = async () => {
        if (!window.confirm('Are you sure you want to shut down the system? This cannot be undone immediately.')) {
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            const res = await apiFetch(SHUTDOWN_URL, { method: 'POST' });
            if (!res.ok) throw new Error(`Shutdown failed: ${res.status}`);
            await fetchStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to shutdown');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRestart = async () => {
        if (!window.confirm('Are you sure you want to restart all workers?')) {
            return;
        }
        setActionLoading(true);
        setError(null);
        try {
            const res = await apiFetch(RESTART_URL, { method: 'POST' });
            if (!res.ok) throw new Error(`Restart failed: ${res.status}`);
            await fetchStatus();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to restart');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && status === null) {
        return (
            <div className="system-control-panel">
                <h2 className="glass-panel-title system-control-panel__title">SYSTEM CONTROL</h2>
                <div className="bbb-placeholder font-mono text-sm">Checking status...</div>
            </div>
        );
    }

    const workerCount = status?.worker_count ?? 0;

    return (
        <div className="system-control-panel">
            <h2 className="glass-panel-title system-control-panel__title">SYSTEM CONTROL</h2>

            <div className="system-control-panel__status common-layout-3">
                <span className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Active Workers
                </span>
                <div className="system-control-panel__status-badge">
                    <span
                        className={`status-dot ${workerCount > 0 ? 'status-online' : ''}`}
                        style={workerCount === 0 ? { backgroundColor: 'var(--text-muted)' } : undefined}
                    />
                    <span
                        className="font-mono text-sm"
                        style={{
                            color: workerCount > 0 ? 'var(--accent-green)' : 'var(--text-muted)',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}
                    >
                        {workerCount}
                    </span>
                </div>
            </div>

            <div className="system-control-panel__actions">
                <button
                    type="button"
                    className="btn-action"
                    onClick={handleRestart}
                    disabled={actionLoading}
                >
                    {actionLoading ? 'Restarting…' : 'Restart Workers'}
                </button>
                <button
                    type="button"
                    className="btn-ghost"
                    onClick={handleShutdown}
                    disabled={actionLoading}
                    style={{ color: 'var(--accent-red)' }}
                >
                    {actionLoading ? 'Shutting Down…' : 'Shutdown System'}
                </button>
            </div>

            {error && (
                <div className="system-control-panel__error font-mono text-xs" style={{ color: 'var(--accent-red)', marginTop: 12 }}>
                    {error}
                </div>
            )}
        </div>
    );
};

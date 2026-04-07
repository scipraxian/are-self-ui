import './PNSPage.css';
import { useEffect, useRef, useState } from 'react';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useWorkerSet } from '../context/WorkerSetProvider';
import { useDendrite } from '../components/SynapticCleft';
import { SystemControlPanel } from '../components/SystemControlPanel';
import { apiFetch } from '../api';
import type { CeleryTask, NorepinephrineEvent } from '../types';

interface WorkerCardState {
    hostname: string;
    status: 'online' | 'offline';
    pid: number | null;
    activeTasks: CeleryTask[];
    lastHeartbeat: string | null;
    loadavg: number[] | null;
    totalTasksCompleted: number;
    recentLogs: string[];
    sw_ident: string | null;
    sw_ver: string | null;
    prefetchCount: number | null;
    pool: Record<string, unknown> | null;
    rusage: Record<string, unknown> | null;
}

interface BeatStatus {
    running: boolean;
    pid?: number;
}

const MAX_LOG_LINES = 50;

function formatElapsed(timeStart: number | null): string {
    if (!timeStart) return '—';
    const elapsed = Math.floor(Date.now() / 1000 - timeStart);
    if (elapsed < 60) return `${elapsed}s`;
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    return `${min}m ${sec}s`;
}

function shortTaskName(name: string): string {
    const parts = name.split('.');
    return parts[parts.length - 1];
}

export function PNSPage() {
    const { setCrumbs } = useBreadcrumbs();
    const { addWorker, isSelected } = useWorkerSet();
    const [workers, setWorkers] = useState<Map<string, WorkerCardState>>(new Map());
    const [beatStatus, setBeatStatus] = useState<BeatStatus | null>(null);
    const [beatLoading, setBeatLoading] = useState(false);
    const workersRef = useRef(workers);
    workersRef.current = workers;

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([{ label: 'Peripheral Nervous System', path: '/pns' }]);
        document.title = 'PNS Fleet | Are-Self';
        return () => setCrumbs([]);
    }, [setCrumbs]);

    // Fetch beat status
    const workerEvent = useDendrite('CeleryWorker', null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/beat/status/');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setBeatStatus({ running: !!data.running, pid: data.pid });
            } catch (err) {
                console.error('Failed to fetch beat status', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [workerEvent]);

    // Fetch initial workers
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/celery-workers/');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                const newMap = new Map<string, WorkerCardState>();
                for (const w of data.workers || []) {
                    const existing = workersRef.current.get(w.hostname);
                    const totalCompleted = Object.values(w.total || {}).reduce(
                        (sum: number, v) => sum + (v as number), 0
                    );
                    newMap.set(w.hostname, {
                        hostname: w.hostname,
                        status: 'online',
                        pid: w.pid ?? null,
                        activeTasks: w.active_tasks || [],
                        lastHeartbeat: existing?.lastHeartbeat ?? null,
                        loadavg: existing?.loadavg ?? null,
                        totalTasksCompleted: totalCompleted,
                        recentLogs: existing?.recentLogs ?? [],
                        sw_ident: existing?.sw_ident ?? null,
                        sw_ver: existing?.sw_ver ?? null,
                        prefetchCount: w.prefetch_count ?? null,
                        pool: (w.pool as Record<string, unknown>) ?? null,
                        rusage: (w.rusage as Record<string, unknown>) ?? null,
                    });
                }
                setWorkers(newMap);
            } catch (err) {
                console.error('Failed to fetch workers', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [workerEvent]);

    // Process real-time worker events
    useEffect(() => {
        if (!workerEvent) return;
        const event = workerEvent as unknown as NorepinephrineEvent;
        const hostname = event.dendrite_id;
        if (!hostname) return;

        setWorkers(prev => {
            const next = new Map(prev);
            const existing = next.get(hostname) || {
                hostname,
                status: 'online' as const,
                pid: null,
                activeTasks: [],
                lastHeartbeat: null,
                loadavg: null,
                totalTasksCompleted: 0,
                recentLogs: [],
                sw_ident: null,
                sw_ver: null,
                prefetchCount: null,
                pool: null,
                rusage: null,
            };

            const updated = { ...existing };

            switch (event.activity) {
                case 'worker_online':
                    updated.status = 'online';
                    if (event.vesicle.sw_ident) updated.sw_ident = event.vesicle.sw_ident as string;
                    if (event.vesicle.sw_ver) updated.sw_ver = event.vesicle.sw_ver as string;
                    break;

                case 'worker_offline':
                    updated.status = 'offline';
                    break;

                case 'heartbeat':
                    updated.status = 'online';
                    updated.lastHeartbeat = event.timestamp;
                    if (event.vesicle.loadavg) updated.loadavg = event.vesicle.loadavg as number[];
                    if (event.vesicle.active != null) {
                        // Update active count from heartbeat
                    }
                    if (event.vesicle.sw_ident) updated.sw_ident = event.vesicle.sw_ident as string;
                    if (event.vesicle.sw_ver) updated.sw_ver = event.vesicle.sw_ver as string;
                    break;

                case 'task_started': {
                    const task: CeleryTask = {
                        id: event.vesicle.uuid as string,
                        name: event.vesicle.name as string,
                        args: '',
                        kwargs: '',
                        time_start: Date.now() / 1000,
                        worker_pid: event.vesicle.pid as number | undefined,
                    };
                    updated.activeTasks = [...updated.activeTasks.filter(t => t.id !== task.id), task];
                    break;
                }

                case 'task_succeeded':
                    updated.activeTasks = updated.activeTasks.filter(
                        t => t.id !== (event.vesicle.uuid as string)
                    );
                    updated.totalTasksCompleted += 1;
                    break;

                case 'task_failed':
                    updated.activeTasks = updated.activeTasks.filter(
                        t => t.id !== (event.vesicle.uuid as string)
                    );
                    break;

                case 'log': {
                    const msg = event.vesicle.message as string;
                    if (msg) {
                        const logs = [...updated.recentLogs, msg];
                        updated.recentLogs = logs.slice(-MAX_LOG_LINES);
                    }
                    break;
                }
            }

            next.set(hostname, updated);
            return next;
        });
    }, [workerEvent]);

    // Beat controls
    const handleBeatToggle = async () => {
        setBeatLoading(true);
        try {
            const url = beatStatus?.running ? '/api/v2/beat/stop/' : '/api/v2/beat/start/';
            const res = await apiFetch(url, { method: 'POST' });
            if (res.ok) {
                const statusRes = await apiFetch('/api/v2/beat/status/');
                if (statusRes.ok) {
                    const data = await statusRes.json();
                    setBeatStatus({ running: !!data.running, pid: data.pid });
                }
            }
        } catch (err) {
            console.error('Beat toggle failed', err);
        } finally {
            setBeatLoading(false);
        }
    };

    const handleCardClick = (hostname: string, e: React.MouseEvent) => {
        if (e.shiftKey) {
            e.preventDefault();
            addWorker(hostname);
        }
    };

    const workerList = Array.from(workers.values());
    const beatRunning = beatStatus?.running ?? false;

    return (
        <div className="pns-page">
            <SystemControlPanel />

            <div className="pns-beat-bar">
                <div className="pns-beat-status">
                    <span className={`pns-beat-dot ${beatRunning ? 'pns-beat-dot--active' : ''}`} />
                    <span className="pns-beat-label">
                        {beatRunning ? 'Heartbeat Active' : 'Heartbeat Stopped'}
                    </span>
                    {beatRunning && beatStatus?.pid != null && (
                        <span className="pns-beat-pid">PID {beatStatus.pid}</span>
                    )}
                </div>
                <button
                    className={`pns-beat-btn ${beatRunning ? 'pns-beat-btn--stop' : 'pns-beat-btn--start'}`}
                    onClick={handleBeatToggle}
                    disabled={beatLoading}
                >
                    {beatLoading ? '...' : beatRunning ? 'Stop' : 'Start'}
                </button>
            </div>

            {workerList.length === 0 ? (
                <div className="pns-empty">
                    <div className="pns-empty-title">No Workers Detected</div>
                    <div className="pns-empty-text">
                        Celery workers must be running with the <code>-E</code> flag
                        to enable event monitoring.
                    </div>
                    <div className="pns-empty-hint">
                        <code>celery -A talos worker -E --loglevel=info</code>
                    </div>
                </div>
            ) : (
                <div className="pns-card-grid">
                    {workerList.map(worker => (
                        <div
                            key={worker.hostname}
                            className={`pns-card ${isSelected(worker.hostname) ? 'pns-card--selected' : ''}`}
                            onClick={(e) => handleCardClick(worker.hostname, e)}
                        >
                            <div className="pns-card-header">
                                <span className={`pns-card-dot ${worker.status === 'online' ? 'pns-card-dot--online' : 'pns-card-dot--offline'}`} />
                                <span className="pns-card-hostname">{worker.hostname}</span>
                                {worker.sw_ver && (
                                    <span className="pns-card-version">{worker.sw_ver}</span>
                                )}
                            </div>

                            <div className="pns-card-stats">
                                <div className="pns-card-stat">
                                    <span className="pns-card-stat-value">{worker.activeTasks.length}</span>
                                    <span className="pns-card-stat-label">Active</span>
                                </div>
                                <div className="pns-card-stat">
                                    <span className="pns-card-stat-value">{worker.totalTasksCompleted}</span>
                                    <span className="pns-card-stat-label">Completed</span>
                                </div>
                                {worker.loadavg && (
                                    <div className="pns-card-stat">
                                        <span className="pns-card-stat-value">
                                            {worker.loadavg[0]?.toFixed(2)}
                                        </span>
                                        <span className="pns-card-stat-label">Load</span>
                                    </div>
                                )}
                                {worker.pid && (
                                    <div className="pns-card-stat">
                                        <span className="pns-card-stat-value">{worker.pid}</span>
                                        <span className="pns-card-stat-label">PID</span>
                                    </div>
                                )}
                                {worker.prefetchCount != null && (
                                    <div className="pns-card-stat">
                                        <span className="pns-card-stat-value">{worker.prefetchCount}</span>
                                        <span className="pns-card-stat-label">Prefetch</span>
                                    </div>
                                )}
                            </div>

                            {worker.activeTasks.length > 0 && (
                                <div className="pns-card-task">
                                    <span className="pns-card-task-name">
                                        {shortTaskName(worker.activeTasks[0].name)}
                                    </span>
                                    <span className="pns-card-task-elapsed">
                                        {formatElapsed(worker.activeTasks[0].time_start)}
                                    </span>
                                </div>
                            )}

                            {(worker.pool || worker.rusage) && (
                                <div className="pns-card-sysinfo">
                                    {worker.pool && (typeof worker.pool === 'object' && worker.pool.max_concurrency != null) && (
                                        <div className="pns-card-sysinfo-row">
                                            <span className="pns-card-sysinfo-label">Concurrency:</span>
                                            <span className="pns-card-sysinfo-value">{worker.pool.max_concurrency}</span>
                                        </div>
                                    )}
                                    {worker.rusage && (typeof worker.rusage === 'object' && worker.rusage.utime != null) && (
                                        <div className="pns-card-sysinfo-row">
                                            <span className="pns-card-sysinfo-label">CPU (user):</span>
                                            <span className="pns-card-sysinfo-value">{Number(worker.rusage.utime).toFixed(1)}s</span>
                                        </div>
                                    )}
                                    {worker.rusage && (typeof worker.rusage === 'object' && worker.rusage.stime != null) && (
                                        <div className="pns-card-sysinfo-row">
                                            <span className="pns-card-sysinfo-label">CPU (sys):</span>
                                            <span className="pns-card-sysinfo-value">{Number(worker.rusage.stime).toFixed(1)}s</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <pre className="pns-card-logs">
                                {worker.recentLogs.slice(-5).join('\n') || 'No log output yet'}
                            </pre>

                            <div className="pns-card-hint">Shift+click to select</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

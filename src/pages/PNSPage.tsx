import './PNSPage.css';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Power, Radio, RefreshCw, RotateCcw, Zap } from 'lucide-react';
import { apiFetch } from '../api';
import { CeleryBeatCard } from '../components/CeleryBeatCard';
import { InfrastructureCard } from '../components/InfrastructureCard';
import { MachineVitalsCard } from '../components/MachineVitalsCard';
import { NerveTerminalCard } from '../components/NerveTerminalCard';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useWorkerSet } from '../context/WorkerSetProvider';
import type { CeleryTask, InfraStatus, NerveTerminal, NorepinephrineEvent, Spike, VitalsData } from '../types';

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

interface ScheduledTask {
    name: string;
    task: string;
    schedule: string;
    total_run_count: number;
    last_run_at: string | null;
}

interface BeatStatus {
    running: boolean;
    pid?: number;
    scheduled_tasks?: ScheduledTask[];
}

interface DjangoServerState {
    hostname: string;
    recentLogs: string[];
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

function formatUptime(seconds: number): string {
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

export function PNSPage() {
    const { setCrumbs } = useBreadcrumbs();
    const { addWorker, isSelected } = useWorkerSet();
    const navigate = useNavigate();

    // State
    const [workers, setWorkers] = useState<Map<string, WorkerCardState>>(new Map());
    const [beatStatus, setBeatStatus] = useState<BeatStatus | null>(null);
    const [vitals, setVitals] = useState<VitalsData | null>(null);
    const [cpuHistory, setCpuHistory] = useState<number[]>([]);
    const [gpuHistory, setGpuHistory] = useState<number[]>([]);
    const [infraStatus, setInfraStatus] = useState<InfraStatus | null>(null);
    const [terminals, setTerminals] = useState<NerveTerminal[]>([]);
    const [activeSpikes, setActiveSpikes] = useState<Map<string, string>>(new Map());
    const [beatLoading, setBeatLoading] = useState(false);
    const [refreshLoading, setRefreshLoading] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanResult, setScanResult] = useState<string | null>(null);
    const [sysActionLoading, setSysActionLoading] = useState(false);
    const [djangoServers, setDjangoServers] = useState<Map<string, DjangoServerState>>(new Map());

    const workersRef = useRef(workers);
    workersRef.current = workers;

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([{
            label: 'Peripheral Nervous System',
            path: '/pns',
            tip: 'The PNS is the worker fleet — Celery workers send heartbeats, pick up tasks, and fire the tick cycle that drives every loop.',
            doc: 'docs/brain-regions/peripheral-nervous-system',
        }]);
        document.title = 'PNS Fleet | Are-Self';
        return () => setCrumbs([]);
    }, [setCrumbs]);

    // Dendrite subscriptions
    const workerEvent = useDendrite('CeleryWorker', null);
    const terminalEvent = useDendrite('NerveTerminalRegistry', null);
    const djangoEvent = useDendrite('Django', null);

    // Vitals polling (3-second interval — the ONE polling exception)
    useEffect(() => {
        let cancelled = false;
        const poll = async () => {
            try {
                const res = await apiFetch('/api/v2/vital-signs/vitals/');
                if (!res.ok || cancelled) return;
                const data: VitalsData = await res.json();
                if (cancelled) return;
                setVitals(data);
                setCpuHistory(prev => [...prev.slice(-59), data.cpu_percent]);
                if (data.gpu_utilization != null) {
                    setGpuHistory(prev => [...prev.slice(-59), data.gpu_utilization!]);
                }
            } catch (err) {
                console.error('Vitals fetch failed', err);
            }
        };
        poll(); // immediate first fetch
        const interval = setInterval(poll, 3000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    // Refresh handler: fetches all non-vitals data
    const handleRefresh = async () => {
        setRefreshLoading(true);
        try {
            const [infraRes, termRes, workerRes, spikeRes, beatRes] = await Promise.all([
                apiFetch('/api/v2/vital-signs/status/'),
                apiFetch('/api/v2/nerve_terminal_registry/'),
                apiFetch('/api/v2/celery-workers/'),
                apiFetch('/api/v2/spikes/?is_active=true'),
                apiFetch('/api/v2/beat/status/'),
            ]);

            // Infrastructure status
            if (infraRes.ok) {
                const data = await infraRes.json();
                setInfraStatus(data);
            }

            // Nerve terminals (DRF returns flat array, no pagination)
            if (termRes.ok) {
                const data = await termRes.json();
                setTerminals(Array.isArray(data) ? data : []);
            }

            // Celery workers
            if (workerRes.ok) {
                const data = await workerRes.json();
                const newMap = new Map<string, WorkerCardState>();
                for (const w of data.workers || []) {
                    const existing = workersRef.current.get(w.hostname);
                    const totalCompleted = Object.values(w.total || {}).reduce(
                        (sum: number, v) => sum + (v as number),
                        0
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
            }

            // Active spikes (build hostname -> spike_train map)
            if (spikeRes.ok) {
                const data = await spikeRes.json();
                const spikeMap = new Map<string, string>();
                const spikeList = (Array.isArray(data) ? data : []) as Spike[];
                for (const spike of spikeList) {
                    if (spike.target_hostname && spike.spike_train) {
                        spikeMap.set(spike.target_hostname, spike.spike_train);
                    }
                }
                setActiveSpikes(spikeMap);
            }

            // Beat status + scheduled tasks
            if (beatRes.ok) {
                const data = await beatRes.json();
                setBeatStatus({
                    running: !!data.running,
                    pid: data.pid,
                    scheduled_tasks: data.scheduled_tasks || [],
                });
            }
        } catch (err) {
            console.error('Refresh failed', err);
        } finally {
            setRefreshLoading(false);
        }
    };

    // Initial load
    useEffect(() => {
        handleRefresh();
    }, []);

    // Refresh on nerve terminal changes (infrequent — only when agents register/deregister)
    useEffect(() => {
        if (!terminalEvent) return;
        handleRefresh();
    }, [terminalEvent]);

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

    // Process real-time Django server events
    useEffect(() => {
        if (!djangoEvent) return;
        const event = djangoEvent as unknown as NorepinephrineEvent;
        const hostname = event.dendrite_id;
        if (!hostname) return;

        if (event.activity === 'log') {
            const msg = event.vesicle.message as string;
            if (!msg) return;

            setDjangoServers(prev => {
                const next = new Map(prev);
                const existing = next.get(hostname) || {
                    hostname,
                    recentLogs: [],
                };
                const logs = [...existing.recentLogs, msg];
                next.set(hostname, {
                    ...existing,
                    recentLogs: logs.slice(-MAX_LOG_LINES),
                });
                return next;
            });
        }
    }, [djangoEvent]);

    // Scan network for agents
    const handleScan = async () => {
        setScanLoading(true);
        setScanResult(null);
        try {
            const res = await apiFetch('/api/v2/nerve_terminal_registry/scan/', {
                method: 'POST',
            });
            if (res.ok) {
                const data = await res.json();
                setScanResult(data.message || `Found ${data.found} agents`);
                // The thalamus Acetylcholine signal will trigger terminalEvent → refresh
                // But also do a manual refresh to pick up any changes immediately
                await handleRefresh();
            } else {
                setScanResult('Scan failed');
            }
        } catch (err) {
            console.error('Scan failed', err);
            setScanResult('Scan error');
        } finally {
            setScanLoading(false);
        }
    };

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

    // System controls (restart/shutdown)
    const handleRestart = async () => {
        if (!window.confirm('Restart all workers?')) return;
        setSysActionLoading(true);
        try {
            await apiFetch('/api/v2/system-control/restart/', { method: 'POST' });
        } catch (err) {
            console.error('Restart failed', err);
        } finally {
            setSysActionLoading(false);
        }
    };

    const handleShutdown = async () => {
        if (!window.confirm('Shut down the system? This cannot be undone immediately.')) return;
        setSysActionLoading(true);
        try {
            await apiFetch('/api/v2/system-control/shutdown/', { method: 'POST' });
        } catch (err) {
            console.error('Shutdown failed', err);
        } finally {
            setSysActionLoading(false);
        }
    };

    const handleWorkerClick = (hostname: string) => {
        // Single click: select worker into worker set
        addWorker(hostname);
    };

    const handleWorkerDoubleClick = (hostname: string) => {
        // Double-click: navigate to neural terminal monitor
        navigate(`/pns/monitor?w1=${encodeURIComponent(hostname)}`);
    };

    const handleTaskClick = async (celeryTaskId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Don't trigger worker card click
        try {
            const res = await apiFetch(`/api/v2/spikes/?celery_task_id=${celeryTaskId}`);
            if (res.ok) {
                const data = await res.json();
                const spikes = Array.isArray(data) ? data : [];
                if (spikes.length > 0) {
                    navigate(`/cns/spike/${spikes[0].id}`);
                    return;
                }
            }
        } catch (err) {
            console.error('Spike lookup failed', err);
        }
        // No spike found for this task — it may not be a CNS-managed task
    };

    const handleTerminalClick = (trainId: string) => {
        navigate(`/cns/spiketrain/${trainId}`);
    };

    const workerList = Array.from(workers.values());
    const djangoList = Array.from(djangoServers.values());
    const beatRunning = beatStatus?.running ?? false;
    const hasContent = workerList.length > 0 || djangoList.length > 0 || terminals.length > 0 || vitals != null;

    return (
        <div className="pns-page">
            <div className="pns-top-bar">
                <span className="pns-page-title">Peripheral Nervous System</span>

                <div className="pns-top-divider" />

                <button
                    className="pns-scan-btn"
                    onClick={handleScan}
                    disabled={scanLoading}
                    title="Scan subnet for agents"
                >
                    <Radio size={14} />
                    {scanLoading ? 'Scanning...' : 'Scan'}
                </button>

                {scanResult && (
                    <span className="pns-scan-result">{scanResult}</span>
                )}

                <button
                    className="pns-refresh-btn"
                    onClick={handleRefresh}
                    disabled={refreshLoading}
                    title="Refresh all data"
                >
                    <RefreshCw size={14} />
                    {refreshLoading ? '...' : 'Refresh'}
                </button>

                <div className="pns-top-spacer" />

                <button
                    className="pns-sys-btn"
                    onClick={handleRestart}
                    disabled={sysActionLoading}
                    title="Restart all workers"
                >
                    <RotateCcw size={13} />
                    Restart
                </button>
                <button
                    className="pns-sys-btn pns-sys-btn--danger"
                    onClick={handleShutdown}
                    disabled={sysActionLoading}
                    title="Shutdown system"
                >
                    <Power size={13} />
                    Shutdown
                </button>
            </div>

            {!hasContent ? (
                <div className="pns-empty">
                    <div className="pns-empty-title">No Vital Signs Detected</div>
                    <div className="pns-empty-text">
                        Celery workers must be running with the <code>-E</code> flag
                        to enable event monitoring. Neural endpoints and services must also be online.
                    </div>
                    <div className="pns-empty-hint">
                        <code>celery -A config worker -E --loglevel=info</code>
                    </div>
                </div>
            ) : (
                <div className="pns-card-grid">
                    {/* Machine Vitals */}
                    <MachineVitalsCard vitals={vitals} cpuHistory={cpuHistory} gpuHistory={gpuHistory} />

                    {/* Infrastructure services */}
                    {infraStatus && (
                        <>
                            <InfrastructureCard
                                name="PostgreSQL"
                                service={infraStatus.postgres ?? null}
                                icon={<Database size={16} />}
                                accentColor="#6366f1"
                                details={[
                                    { label: 'DB Size', value: infraStatus.postgres?.db_size ?? null },
                                    { label: 'Connections', value: infraStatus.postgres?.active_connections ?? null },
                                    {
                                        label: 'Latency',
                                        value: infraStatus.postgres?.latency_ms != null ? `${infraStatus.postgres.latency_ms}ms` : null,
                                    },
                                ]}
                            />
                            <InfrastructureCard
                                name="Redis"
                                service={infraStatus.redis ?? null}
                                icon={<Zap size={16} />}
                                accentColor="#f59e0b"
                                details={[
                                    { label: 'Memory', value: infraStatus.redis?.memory_used ?? null },
                                    { label: 'Clients', value: infraStatus.redis?.connected_clients ?? null },
                                    {
                                        label: 'Uptime',
                                        value:
                                            infraStatus.redis?.uptime_seconds != null
                                                ? formatUptime(infraStatus.redis.uptime_seconds)
                                                : null,
                                    },
                                ]}
                            />
                        </>
                    )}

                    {/* Django servers */}
                    {djangoList.map(server => (
                        <div
                            key={`django-${server.hostname}`}
                            className="pns-worker-card pns-worker-card--django"
                        >
                            <div className="pns-card-header">
                                <span className="pns-card-dot pns-card-dot--online" />
                                <span className="pns-card-hostname">{server.hostname}</span>
                                <span className="pns-card-version">Django</span>
                            </div>

                            <pre className="pns-card-logs">
                                {server.recentLogs.slice(-5).join('\n') || 'No log output yet'}
                            </pre>

                            <div className="pns-card-hint">Server log stream</div>
                        </div>
                    ))}

                    {/* Celery workers */}
                    {workerList.map(worker => (
                        <div
                            key={worker.hostname}
                            className={`pns-worker-card ${isSelected(worker.hostname) ? 'pns-worker-card--selected' : ''}`}
                            onClick={() => handleWorkerClick(worker.hostname)}
                            onDoubleClick={() => handleWorkerDoubleClick(worker.hostname)}
                            style={{ cursor: 'pointer' }}
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
                                <div className="pns-card-tasks">
                                    {worker.activeTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className="pns-card-task pns-card-task--clickable"
                                            onClick={(e) => handleTaskClick(task.id, e)}
                                            title="View spike forensics"
                                        >
                                            <span className="pns-card-task-name">
                                                {shortTaskName(task.name)}
                                            </span>
                                            <span className="pns-card-task-elapsed">
                                                {formatElapsed(task.time_start)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {(worker.pool || worker.rusage) && (
                                <div className="pns-card-sysinfo">
                                    {worker.pool && (typeof worker.pool === 'object' && worker.pool.max_concurrency != null) && (
                                        <div className="pns-card-sysinfo-row">
                                            <span className="pns-card-sysinfo-label">Concurrency:</span>
                                            <span className="pns-card-sysinfo-value">{String(worker.pool.max_concurrency)}</span>
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

                            <div className="pns-card-hint">Click to select · Double-click for logs</div>
                        </div>
                    ))}

                    {/* Heartbeat (Celery Beat) */}
                    <CeleryBeatCard
                        running={beatRunning}
                        pid={beatStatus?.pid ?? null}
                        scheduledTasks={beatStatus?.scheduled_tasks ?? []}
                        loading={beatLoading}
                        onToggle={handleBeatToggle}
                    />

                    {/* Neural endpoints */}
                    {terminals.map(terminal => (
                        <NerveTerminalCard
                            key={terminal.id}
                            terminal={terminal}
                            activeSpikeTrainId={activeSpikes.get(terminal.hostname) ?? null}
                            onClick={() => {
                                const trainId = activeSpikes.get(terminal.hostname);
                                if (trainId) handleTerminalClick(trainId);
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

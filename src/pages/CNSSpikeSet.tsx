import './CNSSpikeSet.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CNSTerminalPane } from '../components/CNSTerminalPane';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { apiFetch } from '../api';

interface SpikeDetail {
    id: string;
    status_name: string;
    effector_name: string;
    target_hostname: string | null;
    result_code: number | null;
    created: string;
    modified: string;
    application_log?: string;
    execution_log?: string;
}

const getStatusVariant = (name: string): 'success' | 'failed' | 'running' | 'default' => {
    const lower = (name || '').toLowerCase();
    if (lower.includes('success') || lower.includes('completed')) return 'success';
    if (lower.includes('fail') || lower.includes('error')) return 'failed';
    if (lower.includes('running') || lower.includes('active') || lower.includes('pending')) return 'running';
    return 'default';
};

const isRunningStatus = (name: string): boolean => {
    const lower = (name || '').toLowerCase();
    return lower.includes('running') || lower.includes('active') || lower.includes('pending');
};

const formatDuration = (spike: SpikeDetail): string => {
    try {
        const ms = new Date(spike.modified).getTime() - new Date(spike.created).getTime();
        if (!Number.isFinite(ms) || ms < 0) return '—';
        const seconds = ms / 1000;
        if (seconds < 60) return `${seconds.toFixed(1)}s`;
        const min = Math.floor(seconds / 60);
        const rem = Math.floor(seconds % 60);
        return `${min}m ${rem}s`;
    } catch {
        return '—';
    }
};

export function CNSSpikeSet() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    const spikeIds = ['s1', 's2', 's3', 's4']
        .map(key => searchParams.get(key))
        .filter(Boolean) as string[];

    const [spikes, setSpikes] = useState<(SpikeDetail | null)[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [logFields, setLogFields] = useState<Record<string, 'application_log' | 'execution_log'>>({});

    // Redirect single spike to forensics
    useEffect(() => {
        if (spikeIds.length === 1) {
            navigate(`/cns/spike/${spikeIds[0]}`, { replace: true });
        }
    }, [spikeIds, navigate]);

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([
            { label: 'Central Nervous System', path: '/cns' },
            { label: `Spike Set (${spikeIds.length})`, path: window.location.pathname + window.location.search },
        ]);
        return () => setCrumbs([]);
    }, [spikeIds.length, setCrumbs]);

    // Fetch all spikes in parallel
    const fetchSpikes = useCallback(async () => {
        if (spikeIds.length === 0) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const results = await Promise.all(
                spikeIds.map(async (id) => {
                    try {
                        const res = await apiFetch(`/api/v2/spikes/${encodeURIComponent(id)}/`);
                        if (!res.ok) return null;
                        return await res.json() as SpikeDetail;
                    } catch {
                        return null;
                    }
                })
            );
            setSpikes(results);
        } finally {
            setIsLoading(false);
        }
    }, [spikeIds.join(',')]);

    useEffect(() => {
        fetchSpikes();
    }, [fetchSpikes]);

    const toggleLogField = (spikeId: string) => {
        setLogFields(prev => ({
            ...prev,
            [spikeId]: prev[spikeId] === 'application_log' ? 'execution_log' : 'application_log',
        }));
    };

    if (spikeIds.length === 0) {
        return (
            <div className="spikeset-empty">
                <p>No spikes selected. Shift+click spike segments to build a comparison set.</p>
                <button className="btn-action" onClick={() => navigate('/cns')}>
                    Back to CNS
                </button>
            </div>
        );
    }

    if (isLoading) {
        return <div className="spikeset-loading">Loading spike data...</div>;
    }

    const gridClass = `spikeset-grid spikeset-grid--${Math.min(spikeIds.length, 4)}`;

    return (
        <div className="spikeset-page">
            <div className="spikeset-header">
                <span className="spikeset-header-title">Spike Set</span>
                <span className="spikeset-header-count">{spikeIds.length} spike{spikeIds.length !== 1 ? 's' : ''}</span>
            </div>
            <div className={gridClass}>
                {spikeIds.map((id, i) => {
                    const spike = spikes[i];
                    if (!spike) {
                        return (
                            <div key={id} className="spikeset-cell">
                                <div className="spikeset-cell-header">
                                    <span className="spikeset-cell-effector">Spike not found</span>
                                    <span className="spikeset-cell-status">#{id.slice(0, 6)}</span>
                                </div>
                                <div className="spikeset-cell-terminal" />
                            </div>
                        );
                    }

                    const logField = logFields[id] || 'execution_log';
                    const variant = getStatusVariant(spike.status_name);
                    const running = isRunningStatus(spike.status_name);

                    return (
                        <div key={id} className="spikeset-cell">
                            <div className="spikeset-cell-header">
                                <span className="spikeset-cell-effector">{spike.effector_name}</span>
                                <span className={`spikeset-cell-status spikeset-cell-status--${variant}`}>
                                    {spike.status_name}
                                </span>
                                <span className="spikeset-cell-duration">{formatDuration(spike)}</span>
                                <button
                                    className="spikeset-cell-toggle"
                                    onClick={() => toggleLogField(id)}
                                >
                                    {logField === 'execution_log' ? 'EXEC' : 'APP'}
                                </button>
                            </div>
                            <div className="spikeset-cell-terminal">
                                <CNSTerminalPane
                                    title={logField === 'execution_log' ? 'Execution Log' : 'Application Log'}
                                    spikeId={id}
                                    logField={logField}
                                    initialContent={spike[logField] || ''}
                                    isRunning={running}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

import './CNSSpikeForensics.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { CNSTerminalPane } from '../components/CNSTerminalPane';
import { CNSMetaPill } from '../components/CNSMetaPill';

interface SpikeDetail {
    id: string;
    status: number;
    status_name: string;
    effector_name: string;
    target_hostname: string | null;
    result_code: number | null;
    created: string;
    modified: string;
    application_log?: string;
    execution_log?: string;
    neuron: number;
    effector: number;
    spike_train?: string;
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

const shortHash = (id: string): string => {
    return '#' + String(id).slice(0, 6).toUpperCase();
};

export function CNSSpikeForensics() {
    const { spikeId } = useParams<{ spikeId: string }>();
    const navigate = useNavigate();
    const [spike, setSpike] = useState<SpikeDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSpike = useCallback(async () => {
        if (!spikeId) return;
        try {
            const res = await apiFetch(`/api/v2/spikes/${encodeURIComponent(spikeId)}/`);
            if (!res.ok) return;
            const data = await res.json();
            setSpike(data);
        } catch (err) {
            console.error('Failed to fetch spike detail', err);
        } finally {
            setIsLoading(false);
        }
    }, [spikeId]);

    useEffect(() => {
        fetchSpike();
    }, [fetchSpike]);

    // ESC navigates back (only when search is not open — search handles its own ESC)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                // Don't navigate if focus is inside a search input
                const active = document.activeElement;
                if (active && active.classList.contains('cns-terminal-search-input')) return;
                navigate(-1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="spike-forensics">
                <div className="spike-forensics-loading">Loading spike detail...</div>
            </div>
        );
    }

    if (!spike) {
        return (
            <div className="spike-forensics">
                <div className="spike-forensics-loading">
                    Spike not found.
                    <button className="spike-forensics-back-btn" onClick={() => navigate(-1)} style={{ marginLeft: 12 }}>
                        &larr; Back
                    </button>
                </div>
            </div>
        );
    }

    const statusVariant = getStatusVariant(spike.status_name);
    const running = isRunningStatus(spike.status_name);

    return (
        <div className="spike-forensics">
            <div className="spike-forensics-header">
                <div className="spike-forensics-breadcrumb">
                    <button className="spike-forensics-back-btn" onClick={() => navigate(-1)}>
                        &larr; Back
                    </button>
                    <span className="spike-forensics-breadcrumb-sep">/</span>
                    <span className="spike-forensics-breadcrumb-name">{spike.effector_name}</span>
                    <span className="spike-forensics-breadcrumb-hash">{shortHash(String(spike.id))}</span>
                </div>
                <div className="spike-forensics-meta">
                    <CNSMetaPill label="EFFECTOR" value={spike.effector_name} />
                    <CNSMetaPill label="STATUS" value={spike.status_name} variant={statusVariant} />
                    <CNSMetaPill label="DELTA" value={formatDuration(spike)} />
                    <CNSMetaPill label="TARGET" value={spike.target_hostname || 'LOCAL'} />
                    <CNSMetaPill label="EXIT CODE" value={String(spike.result_code ?? '—')} />
                    <CNSMetaPill label="CREATED" value={new Date(spike.created).toLocaleString()} />
                </div>
            </div>

            <div className="spike-forensics-terminals">
                <CNSTerminalPane
                    title="Application Log"
                    spikeId={spikeId || ''}
                    logField="application_log"
                    initialContent={spike.application_log || ''}
                    isRunning={running}
                />
                <CNSTerminalPane
                    title="Execution Log"
                    spikeId={spikeId || ''}
                    logField="execution_log"
                    initialContent={spike.execution_log || ''}
                    isRunning={running}
                />
            </div>
        </div>
    );
}

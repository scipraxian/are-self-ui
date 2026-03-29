import './CNSSpikeDetail.css';
import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { SpikeStream } from './SpikeStream';

interface CNSSpikeDetailProps {
    spikeId: string | null;
}

interface SpikeDetail {
    id: number;
    effector_name: string;
    status_name: string;
    created: string;
    modified: string;
    target_hostname: string | null;
    result_code: number | null;
    delta?: string;
}

const getSpikeStatusClass = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('success') || lower.includes('completed')) return 'success';
    if (lower.includes('fail') || lower.includes('error')) return 'failed';
    if (lower.includes('running') || lower.includes('active')) return 'running';
    return 'pending';
};

const formatTimestamp = (ts: string): string => {
    try {
        return new Date(ts).toLocaleString();
    } catch {
        return ts;
    }
};

export const CNSSpikeDetail = ({ spikeId }: CNSSpikeDetailProps) => {
    const [detail, setDetail] = useState<SpikeDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!spikeId) {
            setDetail(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        apiFetch(`/api/v2/spikes/${encodeURIComponent(spikeId)}/`)
            .then(res => {
                if (!res.ok) throw new Error('Failed');
                return res.json();
            })
            .then(data => {
                if (!cancelled) setDetail(data);
            })
            .catch(console.error)
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [spikeId]);

    if (!spikeId) {
        return (
            <div className="cns-spike-detail-empty">
                Select a spike to view execution detail.
            </div>
        );
    }

    if (isLoading && !detail) {
        return <div className="cns-spike-detail-loading">Loading spike detail…</div>;
    }

    const statusClass = detail ? getSpikeStatusClass(detail.status_name) : 'pending';
    const shortId = String(spikeId).substring(0, 8);

    return (
        <div className="cns-spike-detail">
            <div className="cns-spike-detail-header">
                <span className="cns-spike-detail-effector">
                    {detail?.effector_name || 'Spike'}
                </span>
                {detail && (
                    <span className={`cns-spike-status cns-spike-status--${statusClass}`}>
                        {detail.status_name}
                    </span>
                )}
                <span className="cns-spike-detail-id">#{shortId}</span>
            </div>

            {detail && (
                <div className="cns-spike-detail-meta">
                    <span className="cns-spike-detail-label">Created</span>
                    <span className="cns-spike-detail-value">{formatTimestamp(detail.created)}</span>

                    {detail.delta && (
                        <>
                            <span className="cns-spike-detail-label">Duration</span>
                            <span className="cns-spike-detail-value">{detail.delta}</span>
                        </>
                    )}

                    {detail.target_hostname && (
                        <>
                            <span className="cns-spike-detail-label">Host</span>
                            <span className="cns-spike-detail-value">{detail.target_hostname}</span>
                        </>
                    )}

                    {detail.result_code !== null && detail.result_code !== undefined && (
                        <>
                            <span className="cns-spike-detail-label">Result</span>
                            <span className="cns-spike-detail-value">{detail.result_code}</span>
                        </>
                    )}
                </div>
            )}

            <div className="cns-spike-detail-terminal">
                <SpikeStream spikeId={spikeId} key={spikeId} />
            </div>
        </div>
    );
};

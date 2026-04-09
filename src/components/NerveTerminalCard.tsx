import './NerveTerminalCard.css';
import { Zap } from 'lucide-react';
import type { NerveTerminal } from '../types';

interface Props {
    terminal: NerveTerminal;
    activeSpikeTrainId: string | null;
    onClick: () => void;
}

function formatLastSeen(lastSeen: string | null): string {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

export function NerveTerminalCard({ terminal, activeSpikeTrainId, onClick }: Props) {
    const isOnline = terminal.status?.name?.toLowerCase() === 'online';
    const hasActiveSpike = activeSpikeTrainId != null;

    return (
        <div
            className={`pns-nerve-card ${isOnline ? 'pns-nerve-card--online' : 'pns-nerve-card--offline'} ${
                hasActiveSpike ? 'pns-nerve-card--active' : ''
            }`}
            onClick={onClick}
        >
            <div className="pns-nerve-header">
                <span className={`pns-nerve-dot ${isOnline ? 'pns-nerve-dot--online' : 'pns-nerve-dot--offline'}`} />
                <span className="pns-nerve-hostname">{terminal.hostname}</span>
                {hasActiveSpike && <span className="pns-nerve-badge">Live</span>}
            </div>

            {hasActiveSpike && (
                <div className="pns-nerve-spike-banner">
                    <Zap size={12} />
                    <span className="pns-nerve-spike-text">Spike Running</span>
                </div>
            )}

            <div className="pns-nerve-details">
                {terminal.ip_address && (
                    <div className="pns-nerve-detail-row">
                        <span className="pns-nerve-detail-label">IP</span>
                        <span className="pns-nerve-detail-value">{terminal.ip_address}</span>
                    </div>
                )}
                {terminal.port && (
                    <div className="pns-nerve-detail-row">
                        <span className="pns-nerve-detail-label">Port</span>
                        <span className="pns-nerve-detail-value">{terminal.port}</span>
                    </div>
                )}
                {terminal.version && (
                    <div className="pns-nerve-detail-row">
                        <span className="pns-nerve-detail-label">Ver</span>
                        <span className="pns-nerve-detail-value">{terminal.version}</span>
                    </div>
                )}
                <div className="pns-nerve-detail-row">
                    <span className="pns-nerve-detail-label">Seen</span>
                    <span className="pns-nerve-detail-value">{formatLastSeen(terminal.last_seen)}</span>
                </div>
            </div>

            <div className={`pns-nerve-status-bar ${isOnline ? 'pns-nerve-status-bar--online' : 'pns-nerve-status-bar--offline'}`}>
                {isOnline ? 'Online' : 'Offline'}
            </div>

            {hasActiveSpike && <div className="pns-nerve-hint">Click to view spike train</div>}
        </div>
    );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Loader2, TrendingUp, Brain, Zap, Network, Clock, LayoutGrid,
    BookOpen, Activity
} from 'lucide-react';
import { apiFetch } from '../api';
import { useDendrite } from '../components/SynapticCleft';
import type { Spike, ReasoningSessionData } from '../types';
import './BloodBrainBarrier.css';

interface ReasoningSession extends Partial<ReasoningSessionData> {
    id: string;
    status?: string;
    status_name?: string;
    created: string;
    modified: string;
    identity_disc?: { name?: string };
    identity_disc_name?: string;
    turns_count?: number;
}

interface SystemStats {
    identity_disc_count: number;
    ai_model_count: number;
    reasoning_session_count: number;
}

const getStatusColor = (status: unknown): string => {
    const lowerStatus = String(status ?? '').toLowerCase();
    if (lowerStatus.includes('success') || lowerStatus.includes('completed')) return 'success';
    if (lowerStatus.includes('fail') || lowerStatus.includes('error')) return 'failed';
    if (lowerStatus.includes('running') || lowerStatus.includes('active')) return 'running';
    if (lowerStatus.includes('pending') || lowerStatus.includes('queued')) return 'pending';
    return 'unknown';
};

const formatTimeAgo = (dateStr: string): string => {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        if (diff < 0) return 'just now';
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    } catch {
        return '';
    }
};

export function BloodBrainBarrier() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [latestSpikes, setLatestSpikes] = useState<Spike[]>([]);
    const [latestSessions, setLatestSessions] = useState<ReasoningSession[]>([]);
    const [stats, setStats] = useState<SystemStats>({
        identity_disc_count: 0,
        ai_model_count: 0,
        reasoning_session_count: 0
    });

    // Dendrite hooks for real-time updates
    const spikeEvent = useDendrite('Spike', null);
    const sessionEvent = useDendrite('ReasoningSession', null);

    useEffect(() => {
        let cancelled = false;

        const fetchData = async () => {
            try {
                // Fetch latest spikes from lightweight endpoint
                const spikesRes = await apiFetch('/api/v2/latest-spikes/');
                if (spikesRes.ok && !cancelled) {
                    const data = await spikesRes.json();
                    setLatestSpikes(data.slice(0, 6));
                }

                // Fetch latest reasoning sessions from lightweight endpoint
                const sessionsRes = await apiFetch(
                    '/api/v2/latest-sessions/'
                );
                if (sessionsRes.ok && !cancelled) {
                    const data = await sessionsRes.json();
                    setLatestSessions(data.slice(0, 6));
                }

                // Fetch system stats via lightweight stats endpoint
                const statsRes = await apiFetch('/api/v2/stats/');
                if (statsRes.ok && !cancelled) {
                    const data = await statsRes.json();
                    setStats(data);
                    setIsLoading(false);
                } else if (!cancelled) {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err);
                if (!cancelled) setIsLoading(false);
            }
        };

        fetchData();
        return () => { cancelled = true; };
    }, [spikeEvent, sessionEvent]);

    if (isLoading) {
        return (
            <div className="bbb-loader">
                <Loader2 className="bbb-loader-icon" />
                <p>Initializing consciousness...</p>
            </div>
        );
    }

    return (
        <div className="bbb-container">
            {/* Header */}
            <div className="bbb-header">
                <div className="bbb-header-content">
                    <div className="bbb-logo-row">
                        <img
                            src="/Are-SelfLogo-transparent.png"
                            alt="Are-Self"
                            className="bbb-logo"
                        />
                        <h1 className="bbb-title">ARE-SELF</h1>
                    </div>
                    <p className="bbb-subtitle">Neurologically-Inspired AI Reasoning Engine</p>
                </div>
            </div>

            {/* System Stats — clickable */}
            <div className="bbb-stats-grid">
                <div className="stat-card stat-card--identities stat-card--clickable" onClick={() => navigate('/identity')}>
                    <div className="stat-icon">
                        <Brain size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Identities</p>
                        <p className="stat-value">{stats.identity_disc_count}</p>
                    </div>
                </div>

                <div className="stat-card stat-card--models stat-card--clickable" onClick={() => navigate('/hypothalamus')}>
                    <div className="stat-icon">
                        <Zap size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Models</p>
                        <p className="stat-value">{stats.ai_model_count}</p>
                    </div>
                </div>

                <div className="stat-card stat-card--sessions stat-card--clickable" onClick={() => navigate('/frontal')}>
                    <div className="stat-icon">
                        <TrendingUp size={20} />
                    </div>
                    <div className="stat-content">
                        <p className="stat-label">Sessions</p>
                        <p className="stat-value">{stats.reasoning_session_count}</p>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="bbb-content-grid">
                {/* Latest Spikes */}
                <div className="bbb-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Latest Spikes</h2>
                        <button
                            className="panel-link"
                            onClick={() => navigate('/cns')}
                        >
                            View All →
                        </button>
                    </div>
                    <div className="spikes-list">
                        {latestSpikes.length === 0 ? (
                            <div className="empty-state">No spikes yet</div>
                        ) : (
                            latestSpikes.map(spike => (
                                <div
                                    key={spike.id}
                                    className="spike-item"
                                    onClick={() => navigate(`/cns/spike/${spike.id}`)}
                                >
                                    <div className={`spike-status spike-status--${getStatusColor(spike.status_name)}`} />
                                    <div className="spike-info">
                                        <p className="spike-name">
                                            {spike.effector_name || spike.pathway || spike.id.substring(0, 8)}
                                        </p>
                                        <p className="spike-time">
                                            {spike.status_name ?? 'Unknown'} · {formatTimeAgo(spike.modified)}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Latest Sessions */}
                <div className="bbb-panel">
                    <div className="panel-header">
                        <h2 className="panel-title">Latest Sessions</h2>
                        <button
                            className="panel-link"
                            onClick={() => navigate('/frontal')}
                        >
                            View All →
                        </button>
                    </div>
                    <div className="sessions-list">
                        {latestSessions.length === 0 ? (
                            <div className="empty-state">No sessions yet</div>
                        ) : (
                            latestSessions.map(session => (
                                <div
                                    key={session.id}
                                    className="session-item"
                                    onClick={() => navigate(`/frontal/${session.id}`)}
                                >
                                    <div className={`session-status session-status--${getStatusColor(session.status ?? session.status_name ?? '')}`} />
                                    <div className="session-info">
                                        <p className="session-identity">
                                            {session.identity_disc_name || session.identity_disc?.name || 'Unassigned'}
                                        </p>
                                        <p className="session-time">{formatTimeAgo(session.modified)}</p>
                                    </div>
                                    <span className="session-turns">{session.turns_count || 0} turns</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Quick Navigation */}
            <div className="bbb-nav">
                <h3 className="bbb-nav-title">Navigate</h3>
                <div className="nav-buttons">
                    <button className="nav-button" onClick={() => navigate('/cns')}>
                        <Network size={16} className="nav-icon nav-icon--cns" /> CNS
                    </button>
                    <button className="nav-button" onClick={() => navigate('/frontal')}>
                        <TrendingUp size={16} className="nav-icon nav-icon--frontal" /> Frontal Lobe
                    </button>
                    <button className="nav-button" onClick={() => navigate('/hippocampus')}>
                        <BookOpen size={16} className="nav-icon nav-icon--hippocampus" /> Hippocampus
                    </button>
                    <button className="nav-button" onClick={() => navigate('/hypothalamus')}>
                        <Zap size={16} className="nav-icon nav-icon--hypothalamus" /> Hypothalamus
                    </button>
                    <button className="nav-button" onClick={() => navigate('/identity')}>
                        <Brain size={16} className="nav-icon nav-icon--identities" /> Identities
                    </button>
                    <button className="nav-button" onClick={() => navigate('/pfc')}>
                        <LayoutGrid size={16} className="nav-icon nav-icon--pfc" /> PFC
                    </button>
                    <button className="nav-button" onClick={() => navigate('/pns')}>
                        <Activity size={16} className="nav-icon nav-icon--pns" /> PNS
                    </button>
                    <button className="nav-button" onClick={() => navigate('/temporal')}>
                        <Clock size={16} className="nav-icon nav-icon--temporal" /> Temporal Lobe
                    </button>
                </div>
            </div>
        </div>
    );
}

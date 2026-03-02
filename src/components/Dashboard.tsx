import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type MissionStatus = {
    name?: string | null;
};

type Mission = {
    id: string;
    pathway_name: string;
    status?: MissionStatus | null;
    is_alive?: boolean | null;
    ended_successfully?: boolean | null;
    ended_badly?: boolean | null;
};

type DashboardSummary = {
    recent_missions?: Mission[] | null;
};

const DASHBOARD_SUMMARY_URL = 'http://localhost:8000/api/v2/dashboard/summary/';
const POLL_INTERVAL_MS = 3000;

const getMissionStatusColor = (mission: Mission): string => {
    if (mission.is_alive) return '#f99f1b';
    if (mission.ended_successfully) return '#4ade80';
    if (mission.ended_badly) return '#ef4444';
    return '#64748b';
};

const MissionRow = ({ mission, onClick }: { mission: Mission; onClick: () => void }) => {
    const statusColor = getMissionStatusColor(mission);

    return (
        <div
            onClick={onClick}
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid #333',
                borderLeft: `4px solid ${statusColor}`,
                padding: '16px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}
        >
            <div>
                <strong style={{ fontSize: '1.2rem' }}>{mission.pathway_name}</strong>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace', marginTop: '4px' }}>
                    #{mission.id.substring(0, 8)}
                </div>
            </div>
            <div style={{ color: statusColor, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                {mission.status?.name || 'UNKNOWN'}
            </div>
        </div>
    );
};

export const Dashboard = () => {
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const controller = new AbortController();

        const fetchSummary = async () => {
            try {
                const res = await fetch(DASHBOARD_SUMMARY_URL, { signal: controller.signal });

                // No content changed (useful with polling); keep existing UI as-is.
                if (res.status === 204) return;

                if (!res.ok) throw new Error(`Dashboard summary request failed: ${res.status}`);

                const data = (await res.json()) as DashboardSummary;
                if (isMounted) setSummary(data);
            } catch (err) {
                // Ignore abort errors during cleanup.
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error(err);
            }
        };

        fetchSummary();
        const intervalId = window.setInterval(fetchSummary, POLL_INTERVAL_MS);

        return () => {
            isMounted = false;
            window.clearInterval(intervalId);
            controller.abort();
        };
    }, []);

    const missions = summary?.recent_missions ?? [];

    return (
        <div style={{ padding: '2rem', background: '#050505', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter' }}>
            <h1 style={{ fontFamily: 'Outfit', color: '#f99f1b', letterSpacing: '0.1em' }}>TALOS MISSION CONTROL</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '2rem', maxWidth: '1200px' }}>
                {missions.map((mission) => (
                    <MissionRow key={mission.id} mission={mission} onClick={() => navigate(`/monitor/${mission.id}`)} />
                ))}
            </div>
        </div>
    );
};
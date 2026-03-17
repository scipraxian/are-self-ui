import './Dashboard.css';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';

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

const DASHBOARD_SUMMARY_URL = '/api/v2/dashboard/summary/';
const POLL_INTERVAL_MS = 3000;

const getMissionStatusClass = (mission: Mission): string => {
    if (mission.is_alive) return 'running';
    if (mission.ended_successfully) return 'success';
    if (mission.ended_badly) return 'failed';
    return 'pending';
};

const MissionRow = ({ mission, onClick }: { mission: Mission; onClick: () => void }) => {
    const statusClass = getMissionStatusClass(mission);

    return (
        <div
            onClick={onClick}
            className={`mc-mission-row mc-mission-row--${statusClass}`}
        >
            <div>
                <strong className="common-layout-20">{mission.pathway_name}</strong>
                <div className="common-layout-21">
                    #{mission.id.substring(0, 8)}
                </div>
            </div>
            <div className={`mc-mission-status mc-mission-status--${statusClass}`}>
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
                const res = await apiFetch(DASHBOARD_SUMMARY_URL, { signal: controller.signal });

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
        <div className="common-layout-22">
            <h1 className="common-layout-23">TALOS MISSION CONTROL</h1>

            <div className="common-layout-24">
                {missions.map((mission) => (
                    <MissionRow key={mission.id} mission={mission} onClick={() => navigate(`/monitor/${mission.id}`)} />
                ))}
            </div>
        </div>
    );
};
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [summary, setSummary] = useState<any>(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Hitting your exact endpoint from api.py: DashboardViewSet.summary
        fetch('http://localhost:8000/api/v2/dashboard/summary/')
            .then(res => res.json())
            .then(data => setSummary(data))
            .catch(console.error);
    }, []);

    return (
        <div style={{ padding: '2rem', background: '#050505', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'Inter' }}>
            <h1 style={{ fontFamily: 'Outfit', color: '#f99f1b', letterSpacing: '0.1em' }}>TALOS MISSION CONTROL</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '2rem', maxWidth: '1200px' }}>
                {summary?.recent_missions?.map((mission: any) => {
                    // Replicating your LCARS color logic
                    let statusColor = '#64748b';
                    if (mission.is_alive) statusColor = '#f99f1b';
                    else if (mission.ended_successfully) statusColor = '#4ade80';
                    else if (mission.ended_badly) statusColor = '#ef4444';

                    return (
                        <div
                            key={mission.id}
                            onClick={() => navigate(`/monitor/${mission.id}`)}
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
                                    #{mission.id.substring(0,8)}
                                </div>
                            </div>
                            <div style={{ color: statusColor, fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                                {mission.status?.name || 'UNKNOWN'}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
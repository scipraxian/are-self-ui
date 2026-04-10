import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { HeartbeatControlPanel } from '../components/HeartbeatControlPanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function PNSStub() {
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([{
            label: 'Peripheral Nervous System',
            path: '/pns',
            tip: 'The PNS is the worker fleet — Celery workers send heartbeats, pick up tasks, and fire the tick cycle that drives every loop.',
            doc: 'docs/brain-regions/peripheral-nervous-system',
        }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    return (
        <ThreePanel
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/')}>
                        ✕
                    </button>
                    <HeartbeatControlPanel />
                </div>
            }
        />
    );
}

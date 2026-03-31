import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { HeartbeatControlPanel } from '../components/HeartbeatControlPanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function PNSStub() {
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([{ label: 'Peripheral Nervous System', path: '/pns' }]);
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

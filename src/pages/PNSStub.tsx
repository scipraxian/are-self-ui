import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { HeartbeatControlPanel } from '../components/HeartbeatControlPanel';

export function PNSStub() {
    const navigate = useNavigate();

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

import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { TemporalMatrix } from '../components/TemporalMatrix';

export function TemporalStub() {
    const navigate = useNavigate();

    return (
        <ThreePanel
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/')}>
                        ✕
                    </button>
                    <TemporalMatrix />
                </div>
            }
        />
    );
}

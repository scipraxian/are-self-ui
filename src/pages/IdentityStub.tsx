import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { IdentityRoster } from '../components/IdentityRoster';

export function IdentityStub() {
    const navigate = useNavigate();

    return (
        <ThreePanel
            left={
                <>
                    <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                    <IdentityRoster
                        onSelectIdentity={(id, type) => navigate(`/identity/${id}?type=${type}`)}
                    />
                </>
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/')}>
                        ✕
                    </button>
                    <div className="layout-placeholder font-mono text-sm">
                        Select an identity from the roster to view synaptic data.
                    </div>
                </div>
            }
            right={
                <>
                    <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                    <div className="layout-placeholder font-mono text-sm">
                        [Contextual Node Details]
                    </div>
                </>
            }
        />
    );
}

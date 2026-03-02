import { useParams, useNavigate } from 'react-router-dom';
import { CommandCenterLayout } from '../components/CommandCenterLayout';
import { CNSView } from '../components/CNSView';

export const LiveMonitor = () => {
    const { spikeTrainId } = useParams();
    const navigate = useNavigate();

    return (
        <CommandCenterLayout
            leftPanel={
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <button
                        onClick={() => navigate('/')}
                        style={{ background: 'transparent', border: '1px solid #333', color: '#94a3b8', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                    >
                        ← Back to Mission Control
                    </button>
                    <div style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
                        Monitoring SpikeTrain:<br/>
                        <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{spikeTrainId}</strong>
                    </div>
                </div>
            }
            rightPanel={
                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Real-time telemetry stream for this specific execution will attach here.
                </div>
            }
        >
            {/* We will update CNSView to accept the spikeTrainId in the next step */}
            <CNSView />
        </CommandCenterLayout>
    );
};
import "./LiveMonitor.css";
import { useParams, useNavigate } from 'react-router-dom';
import { CommandCenterLayout } from '../components/CommandCenterLayout';
import { CNSView } from '../components/CNSView';
import { SpikeView } from './SpikeView';

export const LiveMonitor = () => {
    const { spikeTrainId } = useParams();
    const navigate = useNavigate();

    return (
        <CommandCenterLayout
            leftPanel={
                <div className="common-layout-32">
                    <button className="livemonitor-ui-214"
                        onClick={() => navigate('/')}
                    >
                        ← Back to Mission Control
                    </button>
                    <div className="livemonitor-ui-213">
                        Monitoring SpikeTrain:<br />
                        <strong className="livemonitor-ui-212">{spikeTrainId}</strong>
                    </div>
                </div>
            }
            rightPanel={
                <div className="livemonitor-ui-211">
                    <SpikeView initialSpikeId={spikeTrainId} />
                </div>
            }
        >
            {/* Mirror CNS monitor route when opening a pathway from telemetry */}
            <CNSView
                onViewPathway={(pid) => navigate(`/cns/monitor/${pid}`)}
                onEditPathway={(pid) => navigate(`/cns/edit/${pid}`)}
            />
        </CommandCenterLayout>
    );
};
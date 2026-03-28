import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSSidebar } from '../components/CNSSidebar';
import { CNSMonitor } from './CNSMonitor';

export function CNSMonitorStub() {
    const { pathwayId } = useParams<{ pathwayId: string }>();
    const navigate = useNavigate();
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');

    if (!pathwayId) return null;

    return (
        <ThreePanel
            centerClassName="three-panel-center--cns-graph"
            left={
                <CNSSidebar
                    activePathwayId={pathwayId}
                    onSelectPathway={(id) => navigate(`/cns/monitor/${id}`)}
                    onExit={() => navigate('/')}
                    selectedEnvironmentId={selectedEnvironmentId}
                    onEnvironmentChange={setSelectedEnvironmentId}
                />
            }
            center={
                <CNSMonitor
                    pathwayId={pathwayId}
                    environmentName={
                        selectedEnvironmentId
                            ? `Env ${selectedEnvironmentId}`
                            : 'Default Environment'
                    }
                />
            }
        />
    );
}

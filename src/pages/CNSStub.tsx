import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSSidebar } from '../components/CNSSidebar';
import { CNSView } from '../components/CNSView';

export function CNSStub() {
    const navigate = useNavigate();
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');

    return (
        <ThreePanel
            left={
                <CNSSidebar
                    activePathwayId={null}
                    onSelectPathway={(id) => navigate(`/cns/monitor/${id}`)}
                    onExit={() => navigate('/')}
                    selectedEnvironmentId={selectedEnvironmentId}
                    onEnvironmentChange={setSelectedEnvironmentId}
                />
            }
            center={
                <CNSView
                    onViewPathway={(id) => navigate(`/cns/monitor/${id}`)}
                    onEditPathway={(id) => navigate(`/cns/edit/${id}`)}
                    selectedEnvironmentId={selectedEnvironmentId}
                />
            }
        />
    );
}

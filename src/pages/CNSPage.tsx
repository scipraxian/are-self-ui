import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSSidebar } from '../components/CNSSidebar';
import { CNSTrainList } from '../components/CNSTrainList';
import { CNSSpikeDetail } from '../components/CNSSpikeDetail';

export function CNSPage() {
    const navigate = useNavigate();
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
    const [filterPathwayId, setFilterPathwayId] = useState<string | null>(null);
    const [selectedSpikeId, setSelectedSpikeId] = useState<string | null>(null);

    const handleSelectPathway = useCallback((id: string) => {
        setFilterPathwayId(id || null);
        setSelectedSpikeId(null);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (selectedSpikeId) {
                    setSelectedSpikeId(null);
                } else {
                    navigate('/');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSpikeId, navigate]);

    return (
        <ThreePanel
            left={
                <CNSSidebar
                    activePathwayId={filterPathwayId}
                    onSelectPathway={handleSelectPathway}
                    onExit={() => navigate('/')}
                    selectedEnvironmentId={selectedEnvironmentId}
                    onEnvironmentChange={setSelectedEnvironmentId}
                />
            }
            center={
                <CNSTrainList
                    filterPathwayId={filterPathwayId}
                    onSpikeSelect={setSelectedSpikeId}
                    selectedSpikeId={selectedSpikeId}
                />
            }
            right={
                <CNSSpikeDetail spikeId={selectedSpikeId} />
            }
        />
    );
}

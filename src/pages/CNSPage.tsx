import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSDashboardSidebar } from '../components/CNSDashboardSidebar';
import { CNSPathwayDashboard } from '../components/CNSPathwayDashboard';
import { useDendrite } from '../components/SynapticCleft';
import { apiFetch } from '../api';
import type { NeuralPathway, SpikeTrain } from '../types';

export function CNSPage() {
    const navigate = useNavigate();
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [pathways, setPathways] = useState<NeuralPathway[]>([]);
    const [trains, setTrains] = useState<SpikeTrain[]>([]);
    const [isLoadingPathways, setIsLoadingPathways] = useState(true);
    const [isLoadingTrains, setIsLoadingTrains] = useState(true);

    const fetchPathways = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v2/neuralpathways/');
            if (!res.ok) return;
            const data = await res.json();
            setPathways(Array.isArray(data) ? data : data.results ?? []);
        } catch (err) {
            console.error('Failed to fetch pathways', err);
        } finally {
            setIsLoadingPathways(false);
        }
    }, []);

    const fetchTrains = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v2/spiketrains/?ordering=-created&limit=200');
            if (!res.ok) return;
            const data = await res.json();
            setTrains(Array.isArray(data) ? data : data.results ?? []);
        } catch (err) {
            console.error('Failed to fetch spike trains', err);
        } finally {
            setIsLoadingTrains(false);
        }
    }, []);

    useEffect(() => {
        fetchPathways();
        fetchTrains();
    }, [fetchPathways, fetchTrains]);

    // Real-time updates via Synaptic Cleft
    const spikeTrainEvent = useDendrite('SpikeTrain', null);

    useEffect(() => {
        if (spikeTrainEvent) fetchTrains();
    }, [spikeTrainEvent, fetchTrains]);

    // Escape key → navigate home
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') navigate('/');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    const isLoading = isLoadingPathways || isLoadingTrains;

    return (
        <ThreePanel
            left={
                <CNSDashboardSidebar
                    pathways={pathways}
                    isLoading={isLoadingPathways}
                    selectedEnvironmentId={selectedEnvironmentId}
                    onEnvironmentChange={setSelectedEnvironmentId}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                />
            }
            center={
                <CNSPathwayDashboard
                    pathways={pathways}
                    trains={trains}
                    searchQuery={searchQuery}
                    isLoading={isLoading}
                />
            }
            right={
                <div className="cns-dash-right-empty">
                    <p>Select a pathway to view execution history.</p>
                </div>
            }
        />
    );
}

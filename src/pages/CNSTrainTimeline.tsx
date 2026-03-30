import './CNSTrainTimeline.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSTrainSidebar } from '../components/CNSTrainSidebar';
import { CNSTrainStack } from '../components/CNSTrainStack';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useEnvironment } from '../context/EnvironmentProvider';
import { apiFetch } from '../api';
import type { NeuralPathway, SpikeTrain } from '../types';

export function CNSTrainTimeline() {
    const { pathwayId } = useParams<{ pathwayId: string }>();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();
    const { selectedEnvironmentId } = useEnvironment();
    const [pathway, setPathway] = useState<NeuralPathway | null>(null);
    const [trains, setTrains] = useState<SpikeTrain[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPathway = useCallback(async () => {
        if (!pathwayId) return;
        try {
            const res = await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/`);
            if (!res.ok) return;
            const data = await res.json();
            setPathway(data);
        } catch (err) {
            console.error('Failed to fetch pathway', err);
        }
    }, [pathwayId]);

    const fetchTrains = useCallback(async () => {
        if (!pathwayId) return;
        try {
            let url = `/api/v2/spiketrains/?pathway=${encodeURIComponent(pathwayId)}&ordering=-created&limit=30`;
            if (selectedEnvironmentId) {
                url += `&environment=${encodeURIComponent(selectedEnvironmentId)}`;
            }
            const res = await apiFetch(url);
            if (!res.ok) return;
            const data = await res.json();
            setTrains(Array.isArray(data) ? data : data.results ?? []);
        } catch (err) {
            console.error('Failed to fetch spike trains', err);
        } finally {
            setIsLoading(false);
        }
    }, [pathwayId, selectedEnvironmentId]);

    useEffect(() => {
        fetchPathway();
        fetchTrains();
    }, [fetchPathway, fetchTrains]);

    // Breadcrumbs
    useEffect(() => {
        if (pathway) {
            setCrumbs([
                { label: 'Central Nervous System', path: '/cns' },
                { label: pathway.name, path: `/cns/pathway/${pathwayId}` },
            ]);
        }
        return () => setCrumbs([]);
    }, [pathway, pathwayId, setCrumbs]);

    // Real-time updates
    const spikeTrainEvent = useDendrite('SpikeTrain', null);
    const spikeEvent = useDendrite('Spike', null);

    useEffect(() => {
        if (spikeTrainEvent) fetchTrains();
    }, [spikeTrainEvent, fetchTrains]);

    useEffect(() => {
        if (spikeEvent) fetchTrains();
    }, [spikeEvent, fetchTrains]);

    // ESC → back to dashboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') navigate('/cns');
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    return (
        <ThreePanel
            left={
                <CNSTrainSidebar
                    pathway={pathway}
                    trains={trains}
                    pathwayId={pathwayId || ''}
                />
            }
            center={
                isLoading ? (
                    <div className="cns-train-timeline-loading">Loading spike trains...</div>
                ) : (
                    <CNSTrainStack trains={trains} pathwayId={pathwayId || ''} />
                )
            }
            right={null}
        />
    );
}

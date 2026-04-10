import './CNSTrainTimeline.css';
import { useEffect, useRef, useState } from 'react';
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
    const lastFetchRef = useRef<number>(0);

    // Fetch pathway detail (only when pathwayId changes)
    useEffect(() => {
        if (!pathwayId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/`);
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setPathway(data);
            } catch (err) {
                console.error('Failed to fetch pathway', err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [pathwayId]);

    // Fetch trains with 500ms debounce on dendrite events
    const spikeTrainEvent = useDendrite('SpikeTrain', null);

    useEffect(() => {
        if (!pathwayId) return;
        let cancelled = false;

        const loadTrains = async () => {
            try {
                let url = `/api/v2/spiketrains/?pathway=${encodeURIComponent(pathwayId)}&ordering=-created&limit=30`;
                if (selectedEnvironmentId) {
                    url += `&environment=${encodeURIComponent(selectedEnvironmentId)}`;
                }
                const res = await apiFetch(url);
                if (!res.ok || cancelled) return;
                const data = await res.json();
                if (cancelled) return;
                setTrains(Array.isArray(data) ? data : data.results ?? []);
            } catch (err) {
                console.error('Failed to fetch spike trains', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        const now = Date.now();
        const elapsed = now - lastFetchRef.current;

        if (elapsed < 500) {
            const timer = setTimeout(() => {
                if (!cancelled) {
                    lastFetchRef.current = Date.now();
                    loadTrains();
                }
            }, 500 - elapsed);
            return () => { cancelled = true; clearTimeout(timer); };
        }

        lastFetchRef.current = now;
        loadTrains();
        return () => { cancelled = true; };
    }, [pathwayId, selectedEnvironmentId, spikeTrainEvent]);

    // Breadcrumbs
    useEffect(() => {
        if (pathway) {
            setCrumbs([
                { label: 'Central Nervous System', path: '/cns' },
                {
                    label: pathway.name,
                    path: `/cns/pathway/${pathwayId}`,
                    tip: 'The pathway dashboard — every spike train this pathway has run, newest first. Click a train to watch it fire.',
                    doc: 'docs/ui/cns-monitor',
                },
            ]);
        }
        return () => setCrumbs([]);
    }, [pathway, pathwayId, setCrumbs]);

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
                    <CNSTrainStack trains={trains} />
                )
            }
            right={null}
        />
    );
}

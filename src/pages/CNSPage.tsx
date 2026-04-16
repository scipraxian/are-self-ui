import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSDashboardSidebar } from '../components/CNSDashboardSidebar';
import { CNSPathwayDashboard } from '../components/CNSPathwayDashboard';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useEnvironment } from '../context/EnvironmentProvider';
import { apiFetch } from '../api';
import type { NeuralPathway, SpikeTrain } from '../types';

export function CNSPage() {
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();
    const { selectedEnvironmentId } = useEnvironment();

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([{
            label: 'Central Nervous System',
            path: '/cns',
            tip: 'The CNS holds pathways — directed graphs of neurons that route spike trains between brain regions.',
            doc: 'docs/brain-regions/central-nervous-system',
        }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);
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
            let url = '/api/v2/spiketrains/?ordering=-created&limit=200';
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
            setIsLoadingTrains(false);
        }
    }, [selectedEnvironmentId]);

    useEffect(() => {
        fetchPathways();
        fetchTrains();
    }, [fetchPathways, fetchTrains]);

    // Real-time updates via Synaptic Cleft.
    //
    // Initial list is pulled exactly once (above). After that, SpikeTrain
    // neurotransmitters drive per-record updates — never a full list refetch.
    //   - Dopamine / Cortisol carry `new_status` directly, so known trains are
    //     patched locally with zero network.
    //   - Any other packet (or a train ID we've never seen) falls back to a
    //     single-record pull at /api/v2/spiketrains/<id>/, which is then
    //     upserted into local state.
    const spikeTrainEvent = useDendrite('SpikeTrain', null);

    // Ref mirror of trains so the NT effect can check "do we know this train?"
    // without re-subscribing every time the list changes.
    const trainsRef = useRef<SpikeTrain[]>([]);
    useEffect(() => {
        trainsRef.current = trains;
    }, [trains]);

    useEffect(() => {
        if (!spikeTrainEvent?.dendrite_id) return;
        const trainId = spikeTrainEvent.dendrite_id;
        const molecule = spikeTrainEvent.molecule;
        // new_status is a top-level field on Dopamine/Cortisol packets but
        // isn't in the generic Neurotransmitter interface — cast to read it.
        const newStatus = (spikeTrainEvent as unknown as { new_status?: string }).new_status;
        const isStatusPacket =
            (molecule === 'Dopamine' || molecule === 'Cortisol') &&
            typeof newStatus === 'string' &&
            newStatus.length > 0;
        const isKnown = trainsRef.current.some(t => t.id === trainId);

        if (isStatusPacket && isKnown) {
            // Fast path: patch only what changed, no network.
            const nowIso = new Date().toISOString();
            setTrains(prev =>
                prev.map(t =>
                    t.id === trainId
                        ? { ...t, status_name: newStatus, modified: nowIso }
                        : t,
                ),
            );
            return;
        }

        // Slow path: single-record pull, then upsert.
        let cancelled = false;
        (async () => {
            try {
                const res = await apiFetch(`/api/v2/spiketrains/${encodeURIComponent(trainId)}/`);
                if (!res.ok || cancelled) return;
                const updated: SpikeTrain = await res.json();
                if (cancelled) return;
                setTrains(prev => {
                    const idx = prev.findIndex(t => t.id === trainId);
                    if (idx >= 0) {
                        const next = [...prev];
                        next[idx] = updated;
                        return next;
                    }
                    // New train — prepend (list is ordered by -created).
                    return [updated, ...prev];
                });
            } catch (err) {
                console.error('Failed to fetch single spike train', err);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [spikeTrainEvent]);

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
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onPathwayCreated={fetchPathways}
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
            right={null}
        />
    );
}

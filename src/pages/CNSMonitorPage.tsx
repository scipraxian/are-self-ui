import './CNSMonitorPage.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Network } from 'lucide-react';
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ThreePanel } from '../components/ThreePanel';
import { CNSMonitorSidebar } from '../components/CNSMonitorSidebar';
import { NeuronMonitorNode } from '../components/NeuronMonitorNode';
import { CNSMetaPill } from '../components/CNSMetaPill';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs, type Breadcrumb } from '../context/BreadcrumbProvider';
import { useSpikeSet } from '../context/SpikeSetProvider';
import { apiFetch } from '../api';
import type { Spike, SpikeTrain, Neuron, Axon } from '../types';

/* ── Local interfaces ────────────────────────────────────── */

interface PathwayDetail {
    id: string;
    name: string;
    description: string;
    neurons: Neuron[];
    axons: Axon[];
}

interface NeuronMonitorData {
    label: string;
    effectorName: string | null;
    effectorId: number | null;
    is_root: boolean;
    invoked_pathway_name: string | null;
    invoked_pathway_id: string | null;
    spikeStatus: SpikeStatus;
    spike: Spike | null;
    spikeId: string | undefined;
}

interface MonitorFlowNode {
    id: string;
    type: 'neuronMonitor';
    position: { x: number; y: number };
    data: NeuronMonitorData;
    sourceData: Neuron;
}

interface ParentContext {
    parentTrainId?: string;
    parentPathwayName?: string;
    parentPathwayId?: string;
}

type SpikeStatus = 'unrun' | 'running' | 'success' | 'failed' | 'pending';

/* ── Constants ───────────────────────────────────────────── */

const nodeTypes = { neuronMonitor: NeuronMonitorNode };

/* ── Utility functions ───────────────────────────────────── */

function getSpikeStatus(statusName: string): SpikeStatus {
    const s = statusName.toLowerCase();
    if (s.includes('success') || s.includes('completed') || s.includes('done')) return 'success';
    if (s.includes('fail') || s.includes('error') || s.includes('abort')) return 'failed';
    if (s.includes('running') || s.includes('active') || s.includes('executing')) return 'running';
    if (s.includes('pending') || s.includes('queued') || s.includes('waiting') || s.includes('created')) return 'pending';
    if (s.includes('delegated')) return 'running';
    return 'unrun';
}

function isTerminalStatus(statusName: string): boolean {
    const s = statusName.toLowerCase();
    return s.includes('success') || s.includes('completed') || s.includes('done')
        || s.includes('fail') || s.includes('error') || s.includes('abort');
}

function isSuccessStatus(statusName: string): boolean {
    const s = statusName.toLowerCase();
    return s.includes('success') || s.includes('completed') || s.includes('done');
}

function isFailedStatus(statusName: string): boolean {
    const s = statusName.toLowerCase();
    return s.includes('fail') || s.includes('error') || s.includes('abort');
}

function parsePosition(uiJson: string | { x: number; y: number } | null): { x: number; y: number } {
    if (!uiJson) return { x: 0, y: 0 };
    try {
        const data = typeof uiJson === 'string' ? JSON.parse(uiJson) : uiJson;
        return {
            x: typeof data.x === 'number' ? data.x : 0,
            y: typeof data.y === 'number' ? data.y : 0,
        };
    } catch {
        return { x: 0, y: 0 };
    }
}

function formatDuration(created: string, modified: string): string {
    const ms = new Date(modified).getTime() - new Date(created).getTime();
    if (ms < 0) return '—';
    if (ms < 1000) return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60) return `${s.toFixed(1)}s`;
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(0);
    return `${m}m ${rem}s`;
}

function spikeVariant(spike: Spike | null): 'default' | 'success' | 'failed' | 'running' {
    if (!spike) return 'default';
    const status = getSpikeStatus(spike.status_name);
    if (status === 'success') return 'success';
    if (status === 'failed') return 'failed';
    if (status === 'running' || status === 'pending') return 'running';
    return 'default';
}

/* ── Inner graph component (needs ReactFlowProvider) ─────── */

function MonitorGraph({
    pathway,
    train,
    autoPan,
    onNodeClick,
    onNodeDoubleClick,
}: {
    pathway: PathwayDetail;
    train: SpikeTrain | null;
    autoPan: boolean;
    onNodeClick: (neuronId: string, spike: Spike | null, neuron: Neuron, event: React.MouseEvent) => void;
    onNodeDoubleClick: (neuronId: string, neuron: Neuron) => void;
}) {
    const reactFlowInstance = useReactFlow();

    const spikeMap = useMemo(() => {
        const map = new Map<string, Spike>();
        if (train?.spikes) {
            for (const spike of train.spikes) {
                if (!spike.neuron) continue;
                const key = String(spike.neuron);
                const existing = map.get(key);
                if (!existing) {
                    map.set(key, spike);
                    continue;
                }
                // Prioritize non-terminal spikes (running/pending/created)
                // so the pulse shows on the active node, not a stale success.
                const existingStatus = getSpikeStatus(existing.status_name);
                const newStatus = getSpikeStatus(spike.status_name);
                const isExistingAlive = existingStatus === 'running' || existingStatus === 'pending';
                const isNewAlive = newStatus === 'running' || newStatus === 'pending';
                if (isNewAlive || (!isExistingAlive && !isNewAlive)) {
                    // Prefer alive spikes; among terminal, keep the latest
                    map.set(key, spike);
                }
            }
        }
        return map;
    }, [train]);

    const flowNodes: MonitorFlowNode[] = useMemo(() => {
        return pathway.neurons.map(neuron => {
            const spike = spikeMap.get(String(neuron.id)) ?? null;
            const spikeStatus = spike ? getSpikeStatus(spike.status_name) : 'unrun';

            return {
                id: neuron.id.toString(),
                type: 'neuronMonitor' as const,
                position: parsePosition(neuron.ui_json),
                data: {
                    label: neuron.invoked_pathway_name || neuron.effector_name || 'Action Node',
                    effectorName: neuron.effector_name,
                    effectorId: neuron.effector ?? null,
                    is_root: neuron.is_root,
                    invoked_pathway_name: neuron.invoked_pathway_name,
                    invoked_pathway_id: neuron.invoked_pathway,
                    spikeStatus,
                    spike,
                    spikeId: spike?.id,
                },
                sourceData: neuron,
            };
        });
    }, [pathway.neurons, spikeMap]);

    const flowEdges = useMemo(() => {
        return pathway.axons.map(axon => {
            const sourceSpike = spikeMap.get(String(axon.source));
            const sourceCompleted = sourceSpike && isTerminalStatus(sourceSpike.status_name);

            let traversed = false;
            if (sourceCompleted) {
                if (axon.type === 1) traversed = true;
                else if (axon.type === 2 && isSuccessStatus(sourceSpike.status_name)) traversed = true;
                else if (axon.type === 3 && isFailedStatus(sourceSpike.status_name)) traversed = true;
            }

            const wireColor = axon.type === 2 ? '#10b981' : axon.type === 3 ? '#ef4444' : '#38bdf8';
            const sourceHandle = axon.type === 2 ? 'success' : axon.type === 3 ? 'failure' : 'always';

            return {
                id: axon.id.toString(),
                source: axon.source.toString(),
                target: axon.target.toString(),
                sourceHandle,
                targetHandle: 'in',
                type: 'smoothstep',
                animated: traversed,
                style: {
                    stroke: wireColor,
                    strokeWidth: 2,
                    opacity: traversed ? 1 : 0.15,
                },
            };
        });
    }, [pathway.axons, spikeMap]);

    // Auto-pan to running node
    useEffect(() => {
        if (!autoPan) return;
        const runningNode = flowNodes.find(n => n.data.spikeStatus === 'running');
        if (runningNode) {
            reactFlowInstance.setCenter(
                runningNode.position.x + 75,
                runningNode.position.y + 25,
                { zoom: 1.2, duration: 800 }
            );
        }
    }, [flowNodes, autoPan, reactFlowInstance]);

    const handleNodeClick: NodeMouseHandler = useCallback((event, node) => {
        const typedNode = node as Node<NeuronMonitorData> & { sourceData: Neuron };
        const spike = spikeMap.get(node.id) ?? null;
        const neuron = typedNode.sourceData;
        onNodeClick(node.id, spike, neuron, event as unknown as React.MouseEvent);
    }, [spikeMap, onNodeClick]);

    const handleNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
        const typedNode = node as Node<NeuronMonitorData> & { sourceData: Neuron };
        const neuron = typedNode.sourceData;
        onNodeDoubleClick(node.id, neuron);
    }, [onNodeDoubleClick]);

    return (
        <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            nodeTypes={nodeTypes}
            zoomOnDoubleClick={false}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            fitView
        >
            <Background color="#334155" gap={20} size={1} />
            <Controls />
        </ReactFlow>
    );
}

/* ── Page component ──────────────────────────────────────── */

export function CNSMonitorPage() {
    const { spiketrainId } = useParams<{ spiketrainId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { setCrumbs } = useBreadcrumbs();
    const { addSpike } = useSpikeSet();

    const parentContext = (location.state as ParentContext) || null;

    const [pathway, setPathway] = useState<PathwayDetail | null>(null);
    const [train, setTrain] = useState<SpikeTrain | null>(null);
    const [pathwayId, setPathwayId] = useState<string>('');
    const [selectedSpike, setSelectedSpike] = useState<Spike | null>(null);
    const [selectedNeuron, setSelectedNeuron] = useState<Neuron | null>(null);
    const [autoPan, setAutoPan] = useState(true);

    // Real-time events — these change reference when a new event fires
    // Listen to ALL spike events (unfiltered) — the thalamus broadcasts
    // dendrite_id=spike.id, not spike_train_id, so we cannot filter here.
    // The debounced refetch below coalesces rapid events into one GET.
    const spikeEvent = useDendrite('Spike', null);
    const trainEvent = useDendrite('SpikeTrain', spiketrainId || null);

    // Debounce ref: coalesce rapid dendrite events into a single refetch.
    // Without this, every spike status change triggers an immediate GET, flooding
    // the server during active execution.
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const trainTerminalRef = useRef(false);

    // Fetch the pathway blueprint ONCE when the spiketrainId changes.
    // Pathways are blueprints — they don't change during execution.
    useEffect(() => {
        if (!spiketrainId) return;
        let cancelled = false;
        trainTerminalRef.current = false;

        const loadPathway = async () => {
            try {
                const res = await apiFetch(`/api/v2/spiketrains/${encodeURIComponent(spiketrainId)}/`);
                if (!res.ok || cancelled) return;
                const trainData = (await res.json()) as SpikeTrain;
                if (cancelled) return;
                setTrain(trainData);
                if (isTerminalStatus(trainData.status_name)) {
                    trainTerminalRef.current = true;
                }
                const pwId = String(trainData.pathway);
                setPathwayId(pwId);

                const pwRes = await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pwId)}/`);
                if (!pwRes.ok || cancelled) return;
                const pwData = (await pwRes.json()) as PathwayDetail;
                if (cancelled) return;
                setPathway(pwData);
            } catch (err) {
                console.error('Failed to fetch pathway', err);
            }
        };

        loadPathway();
        return () => { cancelled = true; };
    }, [spiketrainId]);

    // Refetch ONLY the train (with nested spikes) on dendrite events.
    // Debounced: waits 500ms after the last event before fetching, coalescing
    // rapid-fire spike status changes into a single request.
    // Stops refetching once the train reaches terminal status.
    useEffect(() => {
        if (!spiketrainId || (!spikeEvent && !trainEvent)) return;
        if (trainTerminalRef.current) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                const res = await apiFetch(`/api/v2/spiketrains/${encodeURIComponent(spiketrainId)}/`);
                if (!res.ok) return;
                const trainData = (await res.json()) as SpikeTrain;
                setTrain(trainData);
                if (isTerminalStatus(trainData.status_name)) {
                    trainTerminalRef.current = true;
                }
            } catch (err) {
                console.error('Failed to refresh train', err);
            }
        }, 500);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [spiketrainId, spikeEvent, trainEvent]);

    // Breadcrumbs — include parent context if we drilled from a parent train
    useEffect(() => {
        if (pathway && spiketrainId) {
            const crumbs: Breadcrumb[] = [
                { label: 'Central Nervous System', path: '/cns' },
            ];

            if (parentContext?.parentPathwayName && parentContext.parentPathwayId) {
                crumbs.push({
                    label: parentContext.parentPathwayName,
                    path: `/cns/pathway/${parentContext.parentPathwayId}`,
                });
            }
            if (parentContext?.parentTrainId) {
                crumbs.push({
                    label: `Train #${parentContext.parentTrainId.slice(0, 6).toUpperCase()}`,
                    path: `/cns/spiketrain/${parentContext.parentTrainId}`,
                });
            }

            crumbs.push({ label: pathway.name, path: `/cns/pathway/${pathway.id}` });
            crumbs.push({
                label: `Train #${spiketrainId.slice(0, 6).toUpperCase()}`,
                path: `/cns/spiketrain/${spiketrainId}`,
                tip: 'Live spike train monitor — watch neurons fire in real time as a pathway runs. Click spikes for forensics.',
                doc: 'docs/ui/cns-monitor',
            });

            setCrumbs(crumbs);
        }
        return () => setCrumbs([]);
    }, [pathway, spiketrainId, parentContext, setCrumbs]);

    // Escape key → back to timeline
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && pathwayId) navigate(`/cns/pathway/${pathwayId}`);
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [navigate, pathwayId]);


    // Launch new train
    const handleLaunch = useCallback(async () => {
        if (!pathwayId) return;
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/launch/`, { method: 'POST' });
        } catch (err) {
            console.error('Failed to launch train', err);
        }
    }, [pathwayId]);

    const handleNodeClick = useCallback(
        (_neuronId: string, spike: Spike | null, neuron: Neuron, event: React.MouseEvent) => {
            if (event.shiftKey && spike) {
                addSpike({
                    spikeId: String(spike.id),
                    label: neuron.effector_name || neuron.invoked_pathway_name || 'Unknown',
                    trainHash: String(spiketrainId).slice(0, 6).toUpperCase(),
                });
            } else {
                setSelectedSpike(spike);
                setSelectedNeuron(neuron);
            }
        },
        [addSpike, spiketrainId],
    );

    const handleNodeDoubleClick = useCallback(
        (_neuronId: string, neuron: Neuron) => {
            if (!neuron.invoked_pathway) return;

            const spike = train?.spikes?.find(s => String(s.neuron) === String(neuron.id));
            if (spike?.child_trains && spike.child_trains.length > 0) {
                navigate(`/cns/spiketrain/${spike.child_trains[0]}`, {
                    state: {
                        parentTrainId: spiketrainId,
                        parentPathwayName: pathway?.name,
                        parentPathwayId: pathwayId,
                    } satisfies ParentContext,
                });
            } else {
                navigate(`/cns/pathway/${neuron.invoked_pathway}`);
            }
        },
        [train, navigate, spiketrainId, pathway, pathwayId],
    );

    if (!spiketrainId) return null;

    return (
        <ThreePanel
            centerClassName="three-panel-center--cns-graph"
            left={
                <CNSMonitorSidebar
                    pathwayName={pathway?.name || 'Loading...'}
                    pathwayDescription={pathway?.description || ''}
                    pathwayId={pathwayId}
                    train={train}
                    autoPan={autoPan}
                    onAutoPanChange={setAutoPan}
                    onLaunch={handleLaunch}
                    onEdit={() => navigate(`/cns/pathway/${pathwayId}/edit`)}
                    onBack={() => navigate(`/cns/pathway/${pathwayId}`)}
                />
            }
            center={
                pathway ? (
                    <ReactFlowProvider>
                        <MonitorGraph
                            pathway={pathway}
                            train={train}
                            autoPan={autoPan}
                            onNodeClick={handleNodeClick}
                            onNodeDoubleClick={handleNodeDoubleClick}
                        />
                    </ReactFlowProvider>
                ) : (
                    <div className="cns-monitor-loading font-mono">Loading pathway...</div>
                )
            }
            right={
                (selectedSpike || selectedNeuron) ? (
                    <div className="cns-monitor-inspector">
                        <h4 className="cns-monitor-inspector-title font-display">
                            <Network size={16} style={{ color: '#22d3ee', marginRight: '8px', verticalAlign: 'middle' }} />
                            {selectedSpike ? 'Spike Detail' : 'Neuron Blueprint'}
                        </h4>

                        {selectedSpike ? (
                            <div className="cns-monitor-inspector-body">
                                <CNSMetaPill label="Status" value={selectedSpike.status_name} variant={spikeVariant(selectedSpike)} />
                                <CNSMetaPill label="Effector" value={selectedSpike.effector_name} />
                                <CNSMetaPill label="Duration" value={formatDuration(selectedSpike.created, selectedSpike.modified)} />
                                {selectedSpike.target_hostname && (
                                    <CNSMetaPill label="Host" value={selectedSpike.target_hostname} />
                                )}
                                {selectedSpike.result_code !== null && selectedSpike.result_code !== undefined && (
                                    <CNSMetaPill
                                        label="Result Code"
                                        value={String(selectedSpike.result_code)}
                                        variant={selectedSpike.result_code === 0 ? 'success' : 'failed'}
                                    />
                                )}
                                <button
                                    className="btn-action cns-monitor-inspector-btn"
                                    onClick={() => navigate(`/cns/spike/${selectedSpike.id}`)}
                                >
                                    View Logs
                                </button>
                            </div>
                        ) : selectedNeuron ? (
                            <div className="cns-monitor-inspector-body">
                                <CNSMetaPill label="Neuron" value={String(selectedNeuron.id)} />
                                <CNSMetaPill label="Effector" value={selectedNeuron.effector_name || 'None'} />
                                {selectedNeuron.invoked_pathway_name && (
                                    <CNSMetaPill label="Sub-Graph" value={selectedNeuron.invoked_pathway_name} />
                                )}
                                <CNSMetaPill label="Root" value={selectedNeuron.is_root ? 'Yes' : 'No'} />
                                <p className="cns-monitor-inspector-note font-mono">
                                    No spike has executed on this neuron for the selected train.
                                </p>
                            </div>
                        ) : null}

                        {train && (
                            <div className="cns-monitor-inspector-train">
                                <CNSMetaPill label="Train" value={`#${String(train.id).substring(0, 8)}`} />
                                <CNSMetaPill label="Train Status" value={train.status_name} />
                            </div>
                        )}
                    </div>
                ) : null
            }
        />
    );
}

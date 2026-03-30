import './CNSMonitorPage.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactFlow, {
    Background,
    Controls,
    ReactFlowProvider,
    useReactFlow,
    type NodeMouseHandler,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ThreePanel } from '../components/ThreePanel';
import { CNSMonitorSidebar } from '../components/CNSMonitorSidebar';
import { NeuronMonitorNode } from '../components/NeuronMonitorNode';
import { CNSMetaPill } from '../components/CNSMetaPill';
import { useDendrite } from '../components/SynapticCleft';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useSpikeSet } from '../context/SpikeSetProvider';
import { useEnvironment } from '../context/EnvironmentProvider';
import { apiFetch } from '../api';
import type { Spike, SpikeTrain, Neuron, Axon } from '../types';

interface PathwayDetail {
    id: number;
    name: string;
    description: string;
    neurons: Neuron[];
    axons: Axon[];
}

const nodeTypes = { neuronMonitor: NeuronMonitorNode };

function getSpikeStatus(statusName: string): 'unrun' | 'running' | 'success' | 'failed' | 'pending' {
    const s = statusName.toLowerCase();
    if (s.includes('success') || s.includes('completed') || s.includes('done')) return 'success';
    if (s.includes('fail') || s.includes('error') || s.includes('abort')) return 'failed';
    if (s.includes('running') || s.includes('active') || s.includes('executing')) return 'running';
    if (s.includes('pending') || s.includes('queued') || s.includes('waiting')) return 'pending';
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

function parsePosition(uiJson: unknown): { x: number; y: number } {
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

function MonitorGraph({
    pathway,
    trains,
    selectedTrainId,
    autoPan,
    onNodeClick,
    onNodeDoubleClick,
}: {
    pathway: PathwayDetail;
    trains: SpikeTrain[];
    selectedTrainId: string;
    autoPan: boolean;
    onNodeClick: (neuronId: string, spike: Spike | null, neuron: Neuron, event: React.MouseEvent) => void;
    onNodeDoubleClick: (neuronId: string, neuron: Neuron) => void;
}) {
    const reactFlowInstance = useReactFlow();

    const selectedTrain = trains.find(t => String(t.id) === selectedTrainId) || trains[0];

    const spikeMap = useMemo(() => {
        const map = new Map<string, Spike>();
        if (selectedTrain?.spikes) {
            for (const spike of selectedTrain.spikes) {
                if (spike.neuron) {
                    map.set(String(spike.neuron), spike);
                }
            }
        }
        return map;
    }, [selectedTrain]);

    const flowNodes = useMemo(() => {
        return pathway.neurons.map(neuron => {
            const spike = spikeMap.get(String(neuron.id)) || null;
            const spikeStatus = spike ? getSpikeStatus(spike.status_name) : 'unrun';

            return {
                id: neuron.id.toString(),
                type: 'neuronMonitor' as const,
                position: parsePosition(neuron.ui_json),
                data: {
                    label: neuron.invoked_pathway_name || neuron.effector_name || 'Action Node',
                    effectorName: neuron.effector_name,
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
        const spike = spikeMap.get(node.id) || null;
        const neuron = (node as unknown as { sourceData: Neuron }).sourceData;
        onNodeClick(node.id, spike, neuron, event as unknown as React.MouseEvent);
    }, [spikeMap, onNodeClick]);

    const handleNodeDoubleClick: NodeMouseHandler = useCallback((_event, node) => {
        const neuron = (node as unknown as { sourceData: Neuron }).sourceData;
        onNodeDoubleClick(node.id, neuron);
    }, [onNodeDoubleClick]);

    return (
        <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            nodeTypes={nodeTypes}
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

export function CNSMonitorPage() {
    const { pathwayId } = useParams<{ pathwayId: string }>();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();
    const { selectedEnvironmentId } = useEnvironment();

    const [pathway, setPathway] = useState<PathwayDetail | null>(null);
    const [trains, setTrains] = useState<SpikeTrain[]>([]);
    const [selectedTrainId, setSelectedTrainId] = useState('');
    const [selectedSpike, setSelectedSpike] = useState<Spike | null>(null);
    const [selectedNeuron, setSelectedNeuron] = useState<Neuron | null>(null);
    const [autoPan, setAutoPan] = useState(false);

    // Breadcrumbs
    useEffect(() => {
        if (pathway) {
            setCrumbs([
                { label: 'Central Nervous System', path: '/cns' },
                { label: pathway.name, path: `/cns/pathway/${pathwayId}` },
                { label: 'Monitor', path: `/cns/monitor/${pathwayId}` },
            ]);
        }
        return () => setCrumbs([]);
    }, [pathway, pathwayId, setCrumbs]);

    // Escape key
    useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (e.key === 'Escape') navigate(`/cns/pathway/${pathwayId}`);
        };
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, [navigate, pathwayId]);

    // Fetch pathway
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

    // Fetch trains
    const fetchTrains = useCallback(async () => {
        if (!pathwayId) return;
        try {
            let url = `/api/v2/spiketrains/?pathway=${encodeURIComponent(pathwayId)}&ordering=-created&limit=10`;
            if (selectedEnvironmentId) {
                url += `&environment=${encodeURIComponent(selectedEnvironmentId)}`;
            }
            const res = await apiFetch(url);
            if (!res.ok) return;
            const data = await res.json();
            const list: SpikeTrain[] = Array.isArray(data) ? data : data.results ?? [];
            setTrains(list);

            // Auto-select: prefer a running train, else first
            if (list.length > 0) {
                setSelectedTrainId(prev => {
                    // Keep current selection if it still exists
                    if (prev && list.some(t => String(t.id) === prev)) return prev;
                    const running = list.find(t => {
                        const s = t.status_name.toLowerCase();
                        return s.includes('running') || s.includes('active');
                    });
                    return String((running || list[0]).id);
                });
            }
        } catch (err) {
            console.error('Failed to fetch trains', err);
        }
    }, [pathwayId, selectedEnvironmentId]);

    // Initial fetch
    useEffect(() => { fetchPathway(); }, [fetchPathway]);
    useEffect(() => { fetchTrains(); }, [fetchTrains]);

    // Real-time via useDendrite
    const spikeEvent = useDendrite('Spike', null);
    const trainEvent = useDendrite('SpikeTrain', null);
    useEffect(() => { if (spikeEvent) fetchTrains(); }, [spikeEvent, fetchTrains]);
    useEffect(() => { if (trainEvent) fetchTrains(); }, [trainEvent, fetchTrains]);

    // Launch new train
    const handleLaunch = useCallback(async () => {
        if (!pathwayId) return;
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/launch/`, { method: 'POST' });
        } catch (err) {
            console.error('Failed to launch train', err);
        }
    }, [pathwayId]);

    const { addSpike } = useSpikeSet();

    const handleNodeClick = useCallback((_neuronId: string, spike: Spike | null, neuron: Neuron, event: React.MouseEvent) => {
        if (event.shiftKey && spike) {
            addSpike({
                spikeId: String(spike.id),
                label: neuron.effector_name || neuron.invoked_pathway_name || 'Unknown',
                trainHash: String(selectedTrainId).slice(0, 6).toUpperCase(),
            });
        } else {
            setSelectedSpike(spike);
            setSelectedNeuron(neuron);
        }
    }, [addSpike, selectedTrainId]);

    const handleNodeDoubleClick = useCallback((_neuronId: string, neuron: Neuron) => {
        if (neuron.invoked_pathway) {
            navigate(`/cns/monitor/${neuron.invoked_pathway}`);
        }
    }, [navigate]);

    if (!pathwayId) return null;

    const selectedTrain = trains.find(t => String(t.id) === selectedTrainId) || trains[0];

    // Determine spike status variant for meta pill
    const spikeVariant = (spike: Spike | null): 'default' | 'success' | 'failed' | 'running' => {
        if (!spike) return 'default';
        const status = getSpikeStatus(spike.status_name);
        if (status === 'success') return 'success';
        if (status === 'failed') return 'failed';
        if (status === 'running' || status === 'pending') return 'running';
        return 'default';
    };

    return (
        <ThreePanel
            centerClassName="three-panel-center--cns-graph"
            left={
                <CNSMonitorSidebar
                    pathwayName={pathway?.name || 'Loading...'}
                    pathwayDescription={pathway?.description || ''}
                    trains={trains}
                    selectedTrainId={selectedTrainId}
                    onSelectTrain={setSelectedTrainId}
                    autoPan={autoPan}
                    onAutoPanChange={setAutoPan}
                    onLaunch={handleLaunch}
                    onEdit={() => navigate(`/cns/edit/${pathwayId}`)}
                    onBack={() => navigate(`/cns/pathway/${pathwayId}`)}
                />
            }
            center={
                pathway ? (
                    <ReactFlowProvider>
                        <MonitorGraph
                            pathway={pathway}
                            trains={trains}
                            selectedTrainId={selectedTrainId}
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

                        {selectedTrain && (
                            <div className="cns-monitor-inspector-train">
                                <CNSMetaPill label="Train" value={`#${String(selectedTrain.id).substring(0, 8)}`} />
                                <CNSMetaPill label="Train Status" value={selectedTrain.status_name} />
                            </div>
                        )}
                    </div>
                ) : null
            }
        />
    );
}

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    type NodeChange,
    type EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Effector, Neuron } from "../types.ts";
import { NeuronNode } from './NeuronNode';

interface CNSEditorProps {
    pathwayId: string;
    onDrillDown?: (pathwayId: string) => void;
}

const nodeTypes = {
    neuron: NeuronNode
};

import { CNSInspector } from './CNSInspector';
import { apiFetch } from '../api';

export const CNSEditor: React.FC<CNSEditorProps> = ({ pathwayId, onDrillDown }) => {
    const [effectors, setEffectors] = useState<Effector[]>([]);
    const [pathwayData, setPathwayData] = useState<any>(null);
    const [selectedNode, setSelectedNode] = useState<Neuron | null>(null);

    // React Flow State
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    // CRUD: Node Drag Stop
    const onNodeDragStop = useCallback((event: React.MouseEvent, node: any) => {
        // Optimistic UI updates happen via onNodesChange. Here we just post telemetry to DB.
        apiFetch(`/api/v2/neurons/${node.id}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ui_json: JSON.stringify({ x: node.position.x, y: node.position.y }) })
        }).catch(err => console.error("Failed to update node position", err));
    }, []);

    // CRUD: Connect Edges
    const onConnect = useCallback((params: any) => {
        const axonTypeMap: Record<string, number> = { 'always': 1, 'success': 2, 'failure': 3, 'fail': 3 };
        const requestBody = {
            pathway: pathwayId,
            source: params.source,
            target: params.target,
            type: axonTypeMap[params.sourceHandle] || 1
        };
        apiFetch('/api/v2/axons/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        })
            .then(res => res.json())
            .then(newAxon => {
                let wireColor = '#38bdf8';
                if (newAxon.type_name === 'success' || newAxon.type === 2) wireColor = '#10b981';
                else if (newAxon.type_name === 'failure' || newAxon.type === 3) wireColor = '#ef4444';

                const reactFlowEdge = {
                    id: newAxon.id.toString(),
                    source: newAxon.source.toString(),
                    target: newAxon.target.toString(),
                    sourceHandle: params.sourceHandle,
                    targetHandle: params.targetHandle,
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: wireColor, strokeWidth: 2 },
                };
                setEdges(eds => [...eds, reactFlowEdge]);
            });
    }, [pathwayId]);

    // CRUD: Delete Nodes
    const onNodesDelete = useCallback((nodesToDelete: any[]) => {
        nodesToDelete.forEach(n => {
            apiFetch(`/api/v2/neurons/${n.id}/`, { method: 'DELETE' });
            if (selectedNode?.id?.toString() === n.id.toString()) setSelectedNode(null);
        });
    }, [selectedNode]);

    // CRUD: Delete Edges
    const onEdgesDelete = useCallback((edgesToDelete: any[]) => {
        edgesToDelete.forEach(e => {
            apiFetch(`/api/v2/axons/${e.id}/`, { method: 'DELETE' });
        });
    }, []);

    useEffect(() => {
        setSelectedNode(null); // Clear selection on pathway change

        apiFetch('/api/v2/effectors/')
            .then(res => res.json())
            .then(data => setEffectors(data));

        apiFetch(`/api/v2/neuralpathways/${pathwayId}/`)
            .then(res => res.json())
            .then(data => {
                setPathwayData(data);

                // 1. Map Django Neurons to React Flow Nodes
                if (data.neurons) {
                    const flowNodes = data.neurons.map((neuron: any) => {
                        // Safely extract the exact X and Y coordinates from your ui_json string
                        let posX = 0;
                        let posY = 0;

                        if (neuron.ui_json) {
                            try {
                                const uiData = typeof neuron.ui_json === 'string' ? JSON.parse(neuron.ui_json) : neuron.ui_json;
                                posX = typeof uiData.x === 'number' ? uiData.x : 0;
                                posY = typeof uiData.y === 'number' ? uiData.y : 0;
                            } catch (e) {
                                console.warn("Failed to parse ui_json for node", neuron.id);
                            }
                        }

                        return {
                            id: neuron.id.toString(),
                            type: 'neuron', // CRITICAL: Hooks into the 4-port NeuronNode.tsx
                            position: { x: posX, y: posY }, // <--- FIXED: Exact mapping, no syntax errors
                            data: {
                                label: neuron.invoked_pathway_name || neuron.effector_name || 'Action Node',
                                effectorName: neuron.effector_name,
                                is_root: neuron.is_root,
                                invoked_pathway_name: neuron.invoked_pathway_name,
                                invoked_pathway_id: neuron.invoked_pathway,
                                onDrillDown: onDrillDown
                            },
                            sourceData: neuron // Store raw DB data for the Right Panel Inspector
                        };
                    });
                    setNodes(flowNodes);
                }

                // 2. Map Django Axons to React Flow Edges
                if (data.axons) {
                    const flowEdges = data.axons.map((axon: any) => {

                        // Map your specific Axon types to the correct port ID and color
                        let sourcePortId = 'always';
                        let wireColor = '#38bdf8'; // Cyan (Default / Flow)

                        // Match against either the string name or the integer ID from your DB
                        if (axon.type_name === 'success' || axon.type === 2) {
                            sourcePortId = 'success';
                            wireColor = '#10b981'; // Green
                        } else if (axon.type_name === 'failure' || axon.type === 3 || axon.type_name === 'fail') {
                            sourcePortId = 'failure';
                            wireColor = '#ef4444'; // Red
                        }

                        return {
                            id: axon.id.toString(),
                            source: axon.source.toString(),
                            target: axon.target.toString(),
                            sourceHandle: sourcePortId, // Connects to the specific colored port on the right
                            targetHandle: 'in',         // Connects to the single input port on the left
                            type: 'smoothstep',         // Orthogonal right-angle lines
                            animated: true,
                            style: { stroke: wireColor, strokeWidth: 2 },
                        };
                    });
                    setEdges(flowEdges);
                }
            });
    }, [pathwayId]);

    const onNodeClick = (event: React.MouseEvent, node: any) => {
        // When a node is clicked, send its raw Django data to the Right Panel Inspector
        setSelectedNode(node.sourceData);
    };

    return (
        <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: 'var(--bg-obsidian)' }}>

            {/* LEFT: Editor Palette */}
            <div style={{ width: '250px', borderRight: '1px solid #334155', padding: '16px', display: 'flex', flexDirection: 'column', backgroundColor: 'rgba(15, 23, 42, 0.9)' }}>
                <h3 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '16px', letterSpacing: '1px' }}>EFFECTORS</h3>
                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {effectors.map(eff => (
                        <div key={eff.id}
                            draggable
                            onDragStart={(e) => {
                                e.dataTransfer.setData('application/reactflow', eff.id.toString());
                                e.dataTransfer.effectAllowed = 'move';
                            }}
                            className="cns-effector-drag-item" style={{
                                padding: '8px', backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '4px', cursor: 'grab', color: '#cbd5e1', fontSize: '0.8rem'
                            }}>
                            {eff.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* CENTER: THE ACTUAL REACT FLOW CANVAS */}
            <div style={{ flex: 1, position: 'relative' }}>
                <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10, pointerEvents: 'none' }}>
                    <h2 style={{ color: '#e2e8f0', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                        {pathwayData?.name || 'Loading...'}
                    </h2>
                </div>

                {/* THE ENGINE IS HERE */}
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onNodeDragStop={onNodeDragStop}
                    onConnect={onConnect}
                    onNodesDelete={onNodesDelete}
                    onEdgesDelete={onEdgesDelete}
                    nodeTypes={nodeTypes}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        const effectorId = e.dataTransfer.getData('application/reactflow');
                        if (!effectorId) return;

                        // We use getBoundingClientRect or similar if we have the react flow instance
                        // For a simple pass without instance reference, we can approximate, or pass null
                        // React flow ideally provides `project` via useReactFlow hook.
                        // Here we use a generic insertion
                        const uiObject = { x: e.clientX - 300, y: e.clientY - 100 }; // Rough estimate
                        const requestBody = {
                            pathway: pathwayId,
                            effector: effectorId,
                            ui_json: JSON.stringify(uiObject),
                            is_root: false
                        };

                        apiFetch('/api/v2/neurons/', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(requestBody)
                        }).then(res => res.json()).then(newNeuron => {
                            const newNode = {
                                id: newNeuron.id.toString(),
                                type: 'neuron',
                                position: uiObject,
                                data: {
                                    label: newNeuron.effector_name || 'Action Node',
                                    effectorName: newNeuron.effector_name,
                                    is_root: newNeuron.is_root,
                                    onDrillDown: onDrillDown
                                },
                                sourceData: newNeuron
                            };
                            setNodes(nds => [...nds, newNode]);
                        });
                    }}
                    fitView
                    theme="dark" // If using React Flow 11+
                >
                    <Background color="#334155" gap={20} size={1} />
                    <Controls style={{ button: { backgroundColor: '#1e293b', border: '1px solid #334155', fill: '#e2e8f0' } }} />
                </ReactFlow>
            </div>

            {/* RIGHT: Node Inspector */}
            <div style={{ width: '300px', backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', flexDirection: 'column' }}>
                <CNSInspector
                    node={selectedNode}
                    pathwayId={pathwayId}
                    onDelete={(id) => onNodesDelete([{ id }])}
                    onContextChange={(nodeId, key, value) => {
                        // Standard REST API context manipulation to come.
                        console.log("Context change:", nodeId, key, value);
                    }}
                />
            </div>

        </div>
    );
};
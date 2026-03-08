import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactFlow, {
    Background,
    Controls,
    applyNodeChanges,
    applyEdgeChanges,
    type NodeChange,
    type EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { Neuron } from "../types.ts";
import { NeuronNode } from './NeuronNode';

interface CNSEditorProps {
    pathwayId: string;
    onDrillDown?: (pathwayId: string) => void;
    onNodeSelect?: (node: any) => void;
}

const nodeTypes = {
    neuron: NeuronNode
};

import { apiFetch } from '../api';

export const CNSEditor: React.FC<CNSEditorProps> = ({ pathwayId, onDrillDown, onNodeSelect }) => {
    const [selectedNode, setSelectedNode] = useState<Neuron | null>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

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
    const onNodeDragStop = useCallback((_event: React.MouseEvent, node: any) => {
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
            if (onNodeSelect) onNodeSelect(null);
        });
    }, [selectedNode, onNodeSelect]);

    // CRUD: Delete Edges
    const onEdgesDelete = useCallback((edgesToDelete: any[]) => {
        edgesToDelete.forEach(e => {
            apiFetch(`/api/v2/axons/${e.id}/`, { method: 'DELETE' });
        });
    }, []);

    // Helper: Double Click Edges to Delete
    const onEdgeDoubleClick = useCallback((_event: React.MouseEvent, edge: any) => {
        if (_event) _event.stopPropagation();
        setEdges(eds => eds.filter(e => e.id !== edge.id));
        apiFetch(`/api/v2/axons/${edge.id}/`, { method: 'DELETE' }).catch(console.error);
    }, []);

    useEffect(() => {
        setSelectedNode(null); // Clear selection on pathway change
        if (onNodeSelect) onNodeSelect(null);

        apiFetch(`/api/v2/neuralpathways/${pathwayId}/`)
            .then(res => res.json())
            .then(data => {
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

    const onNodeClick = (_event: React.MouseEvent, node: any) => {
        // When a node is clicked, send its raw Django data to the Right Panel Inspector
        setSelectedNode(node.sourceData);
        if (onNodeSelect) onNodeSelect(node.sourceData);
    };

    // Listen for external deletion events from the Inspector
    useEffect(() => {
        const handleExternalDelete = (e: any) => {
            const idToDelete = e.detail;
            setNodes(nds => nds.filter(n => n.id !== idToDelete.toString()));
            if (selectedNode?.id?.toString() === idToDelete.toString()) {
                setSelectedNode(null);
                if (onNodeSelect) onNodeSelect(null);
            }
        };
        window.addEventListener('cns-node-deleted', handleExternalDelete);
        return () => window.removeEventListener('cns-node-deleted', handleExternalDelete);
    }, [selectedNode, onNodeSelect]);

    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }} ref={reactFlowWrapper}>
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
                onEdgeDoubleClick={onEdgeDoubleClick}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                    e.preventDefault();
                    const dragId = e.dataTransfer.getData('application/reactflow');
                    const dragType = e.dataTransfer.getData('application/reactflow-type');
                    if (!dragId) return;

                    let position = { x: e.clientX - 300, y: e.clientY - 100 }; // fallback
                    if (reactFlowInstance && reactFlowWrapper.current) {
                        const bounds = reactFlowWrapper.current.getBoundingClientRect();
                        if (typeof reactFlowInstance.screenToFlowPosition === 'function') {
                            position = reactFlowInstance.screenToFlowPosition({
                                x: e.clientX,
                                y: e.clientY,
                            });
                        } else if (typeof reactFlowInstance.project === 'function') {
                            position = reactFlowInstance.project({
                                x: e.clientX - bounds.left,
                                y: e.clientY - bounds.top,
                            });
                        }
                    }

                    const uiObject = position;

                    const requestBody: any = {
                        pathway: pathwayId,
                        ui_json: JSON.stringify(uiObject),
                        is_root: false
                    };

                    if (dragType === 'subgraph') {
                        requestBody.invoked_pathway = dragId;
                    } else {
                        requestBody.effector = dragId;
                    }

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
                                label: newNeuron.invoked_pathway_name || newNeuron.effector_name || 'Action Node',
                                effectorName: newNeuron.effector_name,
                                invokedPathwayId: newNeuron.invoked_pathway,
                                is_root: newNeuron.is_root,
                                onDrillDown: onDrillDown
                            },
                            sourceData: newNeuron
                        };
                        setNodes(nds => [...nds, newNode]);
                    });
                }}
                fitView
            >
                <Background color="#334155" gap={20} size={1} />
                <Controls />
            </ReactFlow>
        </div >
    );
};
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
}

const nodeTypes = {
    neuron: NeuronNode
};

export const CNSEditor: React.FC<CNSEditorProps> = ({ pathwayId }) => {
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

    useEffect(() => {
        fetch('/api/v2/effectors/')
            .then(res => res.json())
            .then(data => setEffectors(data));

        fetch(`/api/v2/neuralpathways/${pathwayId}/`)
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
                                label: neuron.effector_name || neuron.invoked_pathway_name || 'Action Node',
                                effectorName: neuron.effector_name
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
                        <div key={eff.id} draggable className="cns-effector-drag-item" style={{
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
                    nodeTypes={nodeTypes}
                    fitView
                    theme="dark" // If using React Flow 11+
                >
                    <Background color="#334155" gap={20} size={1} />
                    <Controls style={{ button: { backgroundColor: '#1e293b', border: '1px solid #334155', fill: '#e2e8f0' } }} />
                </ReactFlow>
            </div>

            {/* RIGHT: Node Inspector */}
            <div style={{ width: '300px', borderLeft: '1px solid #334155', padding: '16px', backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ color: '#e2e8f0', fontSize: '0.9rem', marginBottom: '16px', letterSpacing: '1px' }}>SYNAPTIC INSPECTOR</h3>

                {selectedNode ? (
                    <div style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>
                        <p><strong>ID:</strong> {selectedNode.id}</p>
                        <p><strong>Effector:</strong> {selectedNode.effector_name || 'N/A'}</p>
                        <p><strong>Invokes:</strong> {selectedNode.invoked_pathway_name || 'None'}</p>
                    </div>
                ) : (
                    <div className="bbb-placeholder font-mono text-sm">
                        Select a Neuron on the canvas to inspect its parameters.
                    </div>
                )}
            </div>

        </div>
    );
};
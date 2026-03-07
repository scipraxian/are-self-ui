import React, { useEffect, useState, useRef, type MouseEvent } from 'react';
import { CNSNode } from './CNSNode';
import { CNSInspector } from './CNSInspector';
import type {CNSNeuron, CNSWire} from "../types.ts";

interface CNSEditorProps {
    pathwayId: string;
}

interface RawAxon {
    source_neuron_id: number | string;
    target_neuron_id: number | string;
    status_id: 'flow' | 'success' | 'fail';
}


export const CNSEditor = ({ pathwayId }: CNSEditorProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [neurons, setNeurons] = useState<CNSNeuron[]>([]);
    const [wires, setWires] = useState<CNSWire[]>([]);
    const [activeNode, setActiveNode] = useState<CNSNeuron | null>(null);

    // Pan/Zoom State
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [isPanning, setIsPanning] = useState(false);

    // Drag State
    const [draggingNode, setDraggingNode] = useState<CNSNeuron | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Wiring State
    const [activeWire, setActiveWire] = useState<{ sourceNodeId: string|number, portIdx: number, color: string, startX: number, startY: number } | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        // Fetch Graph Layout
        fetch(`/central_nervous_system/graph/${pathwayId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.neurons) setNeurons(data.neurons);
                if (data.axons) {
                    setWires(data.axons.map((a: RawAxon) => ({
                        from_node_id: a.source_neuron_id,
                        to_node_id: a.target_neuron_id,
                        status_id: a.status_id
                    })));
                }
            });
    }, [pathwayId]);

    // Math from graph_editor.js
    const toCanvasCoords = (clientX: number, clientY: number) => {
        if (!containerRef.current) return { x: 0, y: 0 };
        const rect = containerRef.current.getBoundingClientRect();
        return {
            x: (clientX - rect.left - pan.x) / zoom,
            y: (clientY - rect.top - pan.y) / zoom
        };
    };

    const calculateBezierPath = (x1: number, y1: number, x2: number, y2: number) => {
        let dx = Math.abs(x1 - x2) * 0.5;
        const minHandle = 50;
        dx = x1 > x2 ? Math.max(dx, minHandle) + (x1 - x2) * 0.2 : Math.max(dx, minHandle);
        return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
    };

    // Canvas Events
    const handleMouseDown = (e: MouseEvent) => {
        if (e.button === 1 || e.target === containerRef.current) {
            setIsPanning(true);
            setActiveNode(null); // Deselect on background click
        }
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (isPanning) {
            setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
        }

        if (draggingNode) {
            const coords = toCanvasCoords(e.clientX, e.clientY);
            setNeurons(prev => prev.map(n =>
                n.id === draggingNode.id
                    ? { ...n, x: coords.x - dragOffset.x, y: coords.y - dragOffset.y }
                    : n
            ));
        }

        if (activeWire) {
            const coords = toCanvasCoords(e.clientX, e.clientY);
            setMousePos(coords);
        }
    };

    const handleMouseUp = async (e: MouseEvent) => {
        setIsPanning(false);

        if (draggingNode && !String(draggingNode.id).startsWith('temp_')) {
            // Save new position
            await fetch(`/central_nervous_system/graph/${pathwayId}/move_neuron`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ neuron_id: draggingNode.id, x: Math.round(draggingNode.x), y: Math.round(draggingNode.y) })
            });
            setDraggingNode(null);
        }

        if (activeWire) {
            // Check if we dropped on a valid input pin
            const target = e.target as HTMLElement;
            if (target.classList.contains('pin-input')) {
                const targetNodeId = target.getAttribute('data-node-id');
                if (targetNodeId && targetNodeId !== String(activeWire.sourceNodeId)) {

                    const typeMap: Record<string, 'flow' | 'success' | 'fail'> = {
                        '#ffffff': 'flow', '#4caf50': 'success', '#f44336': 'fail'
                    };
                    const type = typeMap[activeWire.color] || 'flow';

                    // Optimistic update
                    setWires(prev => [...prev, { from_node_id: activeWire.sourceNodeId, to_node_id: targetNodeId, status_id: type }]);

                    await fetch(`/central_nervous_system/graph/${pathwayId}/connect`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ source_neuron_id: activeWire.sourceNodeId, target_neuron_id: targetNodeId, type })
                    });
                }
            }
            setActiveWire(null);
        }
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY;
        const factor = Math.pow(1.1, delta / 100);
        const newZoom = Math.min(Math.max(zoom * factor, 0.2), 3);

        const mouseX = e.clientX - pan.x;
        const mouseY = e.clientY - pan.y;

        setPan({
            x: pan.x - mouseX * (newZoom / zoom - 1),
            y: pan.y - mouseY * (newZoom / zoom - 1)
        });
        setZoom(newZoom);
    };

    const handleNodeDragStart = (e: MouseEvent, node: CNSNeuron) => {
        const rect = (e.currentTarget as HTMLElement).parentElement!.getBoundingClientRect();
        setDragOffset({
            x: (e.clientX - rect.left) / zoom,
            y: (e.clientY - rect.top) / zoom
        });
        setDraggingNode(node);
    };

    const handlePinMouseDown = (e: MouseEvent, nodeId: string | number, portIndex: number, color: string) => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const coords = toCanvasCoords(rect.left + rect.width / 2, rect.top + rect.height / 2);
        setActiveWire({ sourceNodeId: nodeId, portIdx: portIndex, color, startX: coords.x, startY: coords.y });
        setMousePos(coords);
    };

    const handleDeleteNode = async (id: string | number) => {
        setNeurons(prev => prev.filter(n => n.id !== id));
        setWires(prev => prev.filter(w => w.from_node_id !== id && w.to_node_id !== id));
        setActiveNode(null);

        if (!String(id).startsWith('temp_')) {
            await fetch(`/central_nervous_system/graph/${pathwayId}/delete_neuron`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ neuron_id: id })
            });
        }
    };

    const handleContextChange = async (nodeId: string | number, key: string, value: string) => {
        await fetch(`/central_nervous_system/graph/${pathwayId}/save_neuron_context`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ neuron_id: nodeId, updates: [{ key, value }] })
        });
    };

    // Calculate wire DOM positions dynamically
    const renderWires = () => {
        return wires.map((wire, idx) => {
            const src = neurons.find(n => n.id == wire.from_node_id);
            const tgt = neurons.find(n => n.id == wire.to_node_id);
            if (!src || !tgt) return null;

            // Approximating pin coordinates based on component layout offsets
            // Input pin is top-leftish, Output pins are right side
            let portOffsetY = 50;
            if (wire.status_id === 'success') portOffsetY = 70;
            if (wire.status_id === 'fail') portOffsetY = 90;

            const startX = src.x + 220; // Width of node
            const startY = src.y + portOffsetY;
            const endX = tgt.x;
            const endY = tgt.y + 50; // Input pin height

            const path = calculateBezierPath(startX, startY, endX, endY);

            const colorMap = { 'flow': '#ffffff', 'success': '#4caf50', 'fail': '#f44336' };
            const strokeColor = colorMap[wire.status_id] || '#ffffff';

            return (
                <path
                    key={idx}
                    d={path}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="3"
                    strokeOpacity="0.8"
                    className="hover:stroke-[5px] transition-all cursor-pointer"
                />
            );
        });
    };

    return (
        <div className="flex h-full w-full overflow-hidden text-white font-sans relative rounded-xl">

            {/* MAIN CANVAS */}
            <main
                id="editor-container"
                ref={containerRef}
                className="flex-1 relative overflow-hidden bg-transparent"
                style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            >
                <div
                    style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
                    className="absolute inset-0 pointer-events-none w-[10000px] h-[10000px]"
                >
                    {/* SVG LAYER */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-auto z-10 overflow-visible">
                        {renderWires()}
                        {activeWire && (
                            <path
                                d={calculateBezierPath(activeWire.startX, activeWire.startY, mousePos.x, mousePos.y)}
                                fill="none"
                                stroke={activeWire.color}
                                strokeWidth="2"
                                strokeDasharray="8,4"
                            />
                        )}
                    </svg>

                    {/* HTML LAYER */}
                    <div className="absolute inset-0 z-20">
                        {neurons.map(node => (
                            <CNSNode
                                key={node.id}
                                node={node}
                                isSelected={activeNode?.id === node.id}
                                onSelect={(n) => setActiveNode(n)}
                                onDelete={handleDeleteNode}
                                onDragStart={handleNodeDragStart}
                                onPinMouseDown={handlePinMouseDown}
                                isMonitorMode={false}
                            />
                        ))}
                        {/* Hidden target pins for the wire drop zone logic */}
                        {neurons.map(node => !node.is_root && (
                            <div
                                key={`pin-${node.id}`}
                                className="pin-input absolute w-6 h-6 z-50 rounded-full"
                                style={{ left: node.x - 12, top: node.y + 40 }}
                                data-node-id={node.id}
                            ></div>
                        ))}
                    </div>
                </div>
            </main>

            {/* RIGHT PANEL: INSPECTOR */}
            {activeNode && (
                <CNSInspector
                    key={activeNode.id}
                    node={activeNode}
                    pathwayId={pathwayId}
                    onDelete={handleDeleteNode}
                    onContextChange={handleContextChange}
                />
            )}
        </div>
    );
};
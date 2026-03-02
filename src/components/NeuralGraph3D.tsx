import { useRef, useCallback } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';

// 1. Clean interfaces (No longer extending the recursive library types)
export interface NeuralNode {
    id: string;
    name: string;
    group: string;
    status: string;
    is_root: boolean;
    x?: number;
    y?: number;
    z?: number;
    fx?: number;
    fy?: number;
    fz?: number;
}

export interface NeuralLink {
    source: string | NeuralNode;
    target: string | NeuralNode;
    type: string;
    isActive?: boolean;
}

interface NeuralGraphProps {
    graphData: {
        nodes: NeuralNode[];
        links: NeuralLink[];
    };
    onNodeSelect?: (node: NeuralNode) => void;
}

export const NeuralGraph3D = ({ graphData, onNodeSelect }: NeuralGraphProps) => {
    // 2. Safely type the hook with undefined to satisfy Vite's strict "1 argument" rule
    // while allowing it to be a mutable ref.
    const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

    const renderNode = useCallback((nodeObj: object) => {
        const node = nodeObj as NeuralNode;
        const group = new THREE.Group();

        const geometry = new THREE.SphereGeometry(node.is_root ? 8 : 5, 32, 32);

        let color = '#64748b';
        if (node.status === 'Running') color = '#facc15';
        if (node.status === 'Success') color = '#4ade80';
        if (node.status === 'Failed') color = '#ef4444';

        const material = new THREE.MeshPhongMaterial({
            color: color,
            transparent: true,
            opacity: 0.9,
            emissive: color,
            emissiveIntensity: node.status === 'Running' ? 0.8 : 0.2
        });

        const sphere = new THREE.Mesh(geometry, material);
        group.add(sphere);

        return group;
    }, []);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ForceGraph3D
                // 3. The single required bypass for the library's recursive generic bug
                ref={fgRef}
                graphData={graphData}
                nodeId="id"
                nodeThreeObject={renderNode}
                linkSource="source"
                linkTarget="target"
                linkWidth={1.5}
                linkColor={(linkObj: object) => {
                    const link = linkObj as NeuralLink;
                    if (link.type === 'success') return '#4ade80';
                    if (link.type === 'failure') return '#ef4444';
                    return '#ffffff';
                }}
                linkDirectionalParticles={(linkObj: object) => {
                    const link = linkObj as NeuralLink;
                    return link.isActive ? 4 : 0;
                }}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.01}
                onNodeClick={(nodeObj: object) => {
                    const node = nodeObj as NeuralNode;
                    const distance = 40;

                    const nx = node.x ?? 0;
                    const ny = node.y ?? 0;
                    const nz = node.z ?? 0;

                    const distRatio = 1 + distance / Math.hypot(nx, ny, nz);

                    if (fgRef.current) {
                        // 4. Passing explicit exact coordinates to satisfy the strict Coords type
                        fgRef.current.cameraPosition(
                            { x: nx * distRatio, y: ny * distRatio, z: nz * distRatio },
                            { x: nx, y: ny, z: nz },
                            1500
                        );
                    }
                    if (onNodeSelect) onNodeSelect(node);
                }}
                backgroundColor="#050505"
            />
        </div>
    );
};
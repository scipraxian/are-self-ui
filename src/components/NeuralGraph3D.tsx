import type { ReactElement } from 'react';
import { useCallback, useRef } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import type { ForceGraphMethods } from 'react-force-graph-3d';
import * as THREE from 'three';

function isNeuralNode(u: unknown): u is NeuralNode {
  return (
    typeof u === 'object' &&
    u !== null &&
    'id' in u &&
    'name' in u &&
    'group' in u &&
    'status' in u &&
    'is_root' in u
  );
}

function isNeuralLink(u: unknown): u is NeuralLink {
  return (
    typeof u === 'object' &&
    u !== null &&
    'source' in u &&
    'target' in u &&
    'type' in u
  );
}

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

export function NeuralGraph3D({ graphData, onNodeSelect }: NeuralGraphProps): ReactElement {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

  const renderNode = useCallback((nodeObj: unknown) => {
    if (!isNeuralNode(nodeObj)) return new THREE.Group();
    const node = nodeObj;
    const group = new THREE.Group();
    const geometry = new THREE.SphereGeometry(node.is_root ? 8 : 5, 32, 32);
    let color = '#64748b';
    if (node.status === 'Running') color = '#facc15';
    if (node.status === 'Success') color = '#4ade80';
    if (node.status === 'Failed') color = '#ef4444';
    const material = new THREE.MeshPhongMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      emissive: color,
      emissiveIntensity: node.status === 'Running' ? 0.8 : 0.2,
    });
    const sphere = new THREE.Mesh(geometry, material);
    group.add(sphere);
    return group;
  }, []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        nodeId="id"
        nodeThreeObject={renderNode}
        linkSource="source"
        linkTarget="target"
        linkWidth={1.5}
        linkColor={(linkObj: unknown) => {
          if (!isNeuralLink(linkObj)) return '#ffffff';
          if (linkObj.type === 'success') return '#4ade80';
          if (linkObj.type === 'failure') return '#ef4444';
          return '#ffffff';
        }}
        linkDirectionalParticles={(linkObj: unknown) => {
          if (!isNeuralLink(linkObj)) return 0;
          return linkObj.isActive ? 4 : 0;
        }}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.01}
        onNodeClick={(nodeObj: unknown) => {
          if (!isNeuralNode(nodeObj)) return;
          const node = nodeObj;
          const distance = 40;
          const nx = node.x ?? 0;
          const ny = node.y ?? 0;
          const nz = node.z ?? 0;
          const distRatio = 1 + distance / Math.hypot(nx, ny, nz);
          if (fgRef.current) {
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
}
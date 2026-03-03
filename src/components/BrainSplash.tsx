import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import * as THREE from 'three';

interface LobeSphereProps {
    position: [number, number, number];
    color: string;
    name: string;
    path: string;
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
    onLobeClick: (path: string) => void;
}

const LobeSphere = ({ position, color, name, path, hoveredLobe, setHoveredLobe, onLobeClick }: LobeSphereProps) => {
    const isHovered = hoveredLobe === name;

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHoveredLobe(name);
    };

    const handlePointerOut = () => {
        setHoveredLobe(null);
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setHoveredLobe(null);
        onLobeClick(path);
    };

    return (
        <mesh position={position} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut} onClick={handleClick}>
            <sphereGeometry args={[1.2, 32, 32]} />
            <meshStandardMaterial
                color={color}
                emissive={isHovered ? color : '#000000'}
                emissiveIntensity={isHovered ? 0.8 : 0}
                wireframe={!isHovered}
                transparent={true}
                opacity={isHovered ? 1 : 0.4}
            />
            {isHovered && (
                <Html position={[0, 1.8, 0]} center>
                    <div style={{
                        color: '#fff', background: 'rgba(15, 23, 42, 0.9)', padding: '6px 16px',
                        borderRadius: '8px', fontFamily: 'monospace', border: `1px solid ${color}`,
                        pointerEvents: 'none', whiteSpace: 'nowrap', boxShadow: `0 0 15px ${color}40`,
                    }}>
                        {name}
                    </div>
                </Html>
            )}
        </mesh>
    );
};

export interface BrainPlaceholderProps {
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
    onLobeClick: (path: string) => void;
}

export const BrainPlaceholder = ({ onLobeClick, hoveredLobe, setHoveredLobe }: BrainPlaceholderProps) => {
    useCursor(hoveredLobe !== null);
    const boxGeo = useMemo(() => new THREE.BoxGeometry(4, 6, 3), []);

    return (
        <group>
            <LobeSphere position={[0, 2.5, 2]} color="#3b82f6" name="Frontal Lobe" path="frontal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[0, 2.5, -2]} color="#10b981" name="Parietal Lobe" path="parietal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[-2.5, 0, 0]} color="#8b5cf6" name="Temporal Lobe" path="temporal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[2.5, 0, 0]} color="#f59e0b" name="Occipital Lobe" path="occipital" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[0, -0.5, 0]} color="#ec4899" name="Hippocampus" path="hippocampus" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[0, 4, 0]} color="#06b6d4" name="Prefrontal Cortex" path="pfc" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[0, -3.5, -1]} color="#ef4444" name="Brainstem / CNS" path="dashboard" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />

            <lineSegments>
                <edgesGeometry args={[boxGeo]} />
                <lineBasicMaterial color="#334155" transparent opacity={0.2} />
            </lineSegments>
        </group>
    );
};
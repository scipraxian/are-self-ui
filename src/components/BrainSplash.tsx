import "./BrainSplash.css";
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useCursor, Sphere } from '@react-three/drei';
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
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.15;
        }
    });

    return (
        <group position={position}>
            <Sphere
                ref={meshRef}
                args={[isHovered ? 1.6 : 1.5, 32, 32]}
                onPointerOver={(e) => { e.stopPropagation(); setHoveredLobe(name); }}
                onPointerOut={(e) => { e.stopPropagation(); setHoveredLobe(null); }}
                onClick={(e) => { e.stopPropagation(); onLobeClick(path); }}
            >
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={isHovered ? 0.6 : 0.1}
                    roughness={0.2}
                    metalness={0.8}
                    wireframe={isHovered}
                />
            </Sphere>
            {isHovered && (
                <Html className="brainsplash-ui-13" position={[0, -2.5, 0]} center>
                    <div className="font-display heading-tracking" style={{ color, textShadow: '0 2px 10px rgba(0,0,0,0.9)', fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {name.toUpperCase()}
                    </div>
                </Html>
            )}
        </group>
    );
};

export interface BrainPlaceholderProps {
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
    onLobeClick: (path: string) => void;
}

export const BrainPlaceholder = ({ onLobeClick, hoveredLobe, setHoveredLobe }: BrainPlaceholderProps) => {
    useCursor(hoveredLobe !== null, 'pointer', 'auto');

    return (
        <group>
            {/* Frontal Lobe -> Reasoning (LCARS) */}
            <LobeSphere position={[0, 2, 2.5]} color="#a855f7" name="Frontal Lobe" path="frontal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />

            {/* Temporal Lobe -> Iterations */}
            <LobeSphere position={[-2.5, -1, 0]} color="#f99f1b" name="Temporal Lobe" path="temporal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />

            {/* Prefrontal Cortex (Replaced Parietal) -> Agile Board */}
            <LobeSphere position={[0, 3, -2.5]} color="#ef4444" name="Prefrontal Cortex" path="pfc" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />
            <LobeSphere position={[2.5, 0, 1.5]} color="#38bdf8" name="Central Nervous System" path="cns" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} onLobeClick={onLobeClick} />

            <Sphere args={[1.2, 16, 16]} position={[0, 1, 0]}>
                <meshStandardMaterial color="#333333" roughness={0.9} metalness={0.1} wireframe />
            </Sphere>
        </group>
    );
};
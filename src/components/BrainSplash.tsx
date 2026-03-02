import { useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useCursor } from '@react-three/drei';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import * as THREE from 'three';

// Define strict types for our component props
interface LobeSphereProps {
    position: [number, number, number];
    color: string;
    name: string;
    path: string;
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
    navigate: NavigateFunction;
}

const LobeSphere = ({ position, color, name, path, hoveredLobe, setHoveredLobe, navigate }: LobeSphereProps) => {
    const isHovered = hoveredLobe === name;

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation(); // Prevents raycast from piercing through to spheres behind it
        setHoveredLobe(name);
    };

    const handlePointerOut = () => {
        setHoveredLobe(null);
    };

    const handleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        setHoveredLobe(null); // Clear hover state before navigating
        navigate(path);
    };

    return (
        <mesh
            position={position}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
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
                    <div
                        style={{
                            color: '#fff',
                            background: 'rgba(15, 23, 42, 0.9)',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            fontFamily: 'monospace',
                            border: `1px solid ${color}`,
                            pointerEvents: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: `0 0 15px ${color}40`,
                        }}
                    >
                        {name}
                    </div>
                </Html>
            )}
        </mesh>
    );
};

interface BrainPlaceholderProps {
    navigate: NavigateFunction;
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
}

const BrainPlaceholder = ({ navigate, hoveredLobe, setHoveredLobe }: BrainPlaceholderProps) => {
    // Drei hook: changes the DOM cursor to a pointer when hoveredLobe is not null
    useCursor(hoveredLobe !== null);

    // Memoize the geometry so it doesn't re-instantiate on every frame
    const boxGeo = useMemo(() => new THREE.BoxGeometry(4, 6, 3), []);

    return (
        <group>
            <LobeSphere position={[0, 2.5, 2]} color="#3b82f6" name="Frontal Lobe" path="/lobe/frontal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />
            <LobeSphere position={[0, 2.5, -2]} color="#10b981" name="Parietal Lobe" path="/lobe/parietal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />
            <LobeSphere position={[-2.5, 0, 0]} color="#8b5cf6" name="Temporal Lobe" path="/lobe/temporal" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />
            <LobeSphere position={[2.5, 0, 0]} color="#f59e0b" name="Occipital Lobe" path="/lobe/occipital" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />
            <LobeSphere position={[0, -0.5, 0]} color="#ec4899" name="Hippocampus" path="/lobe/hippocampus" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />
            <LobeSphere position={[0, 4, 0]} color="#06b6d4" name="Prefrontal Cortex" path="/lobe/pfc" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />

            {/* Key change #1: navigate to an existing route */}
            <LobeSphere position={[0, -3.5, -1]} color="#ef4444" name="Brainstem / CNS" path="/dashboard" hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} navigate={navigate} />

            <lineSegments>
                <edgesGeometry args={[boxGeo]} />
                <lineBasicMaterial color="#334155" transparent opacity={0.2} />
            </lineSegments>
        </group>
    );
};

export const BrainSplash = () => {
    const navigate = useNavigate();

    // Key change #2: lift hover state up so OrbitControls can react to it
    const [hoveredLobe, setHoveredLobe] = useState<string | null>(null);

    return (
        <div style={{ width: '100vw', height: '100vh', backgroundColor: '#050505', position: 'relative' }}>
            {/* HUD Overlay */}
            <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', zIndex: 10, textAlign: 'center', pointerEvents: 'none' }}>
                <h1 style={{ color: '#f8fafc', fontFamily: 'Inter', fontSize: '3.5rem', margin: 0, letterSpacing: '8px' }}>
                    ARE-SELF
                </h1>
                <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '1.1rem', marginTop: '12px' }}>
                    Select a cognitive region to monitor execution.
                </p>
            </div>

            <Canvas camera={{ position: [8, 4, 10], fov: 45 }}>
                <ambientLight intensity={0.2} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} />
                <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
                <Environment preset="city" />

                <BrainPlaceholder navigate={navigate} hoveredLobe={hoveredLobe} setHoveredLobe={setHoveredLobe} />

                {/* Key change #3: disable controls while hovering a lobe so click isn’t interpreted as a drag */}
                <OrbitControls
                    autoRotate
                    autoRotateSpeed={0.8}
                    enablePan={false}
                    minDistance={5}
                    maxDistance={20}
                    enabled={hoveredLobe === null}
                />
            </Canvas>
        </div>
    );
};
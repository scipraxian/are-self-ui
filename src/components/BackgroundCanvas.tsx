import { memo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { BrainPlaceholder } from './BrainSplash';
import * as THREE from 'three';

interface BackgroundCanvasProps {
    onLobeClick: (path: string) => void;
    interactive?: boolean;
    showBrain: boolean;
}

/**
 * Center of the brain after the -90° X rotation.
 * Raw FBX center is (0, 0, 3.3) — the rotation swaps Z→Y,
 * so the visual center lands at roughly (0, 3.3, 0).
 */
const BRAIN_CENTER = new THREE.Vector3(0, 3.3, 0);

export const BackgroundCanvas = memo(function BackgroundCanvas({ onLobeClick, interactive = true, showBrain }: BackgroundCanvasProps) {
    const [hoveredLobe, setHoveredLobe] = useState<string | null>(null);

    return (
        <Canvas
            camera={{ position: [0, 3.3, 28], fov: 45 }}
            style={{ pointerEvents: interactive ? 'auto' : 'none' }}
        >
            <ambientLight intensity={0.3} />
            <directionalLight position={[10, 10, 15]} intensity={1.5} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
            <Environment preset="city" />

            <BrainPlaceholder
                onLobeClick={onLobeClick}
                hoveredLobe={hoveredLobe}
                setHoveredLobe={setHoveredLobe}
                showBrain={showBrain}
            />

            <OrbitControls
                autoRotate={showBrain}
                autoRotateSpeed={0.4}
                enablePan={false}
                minDistance={15}
                maxDistance={50}
                target={BRAIN_CENTER}
                enabled={interactive && hoveredLobe === null}
            />
        </Canvas>
    );
});

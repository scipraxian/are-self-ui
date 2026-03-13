import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { BrainPlaceholder } from './BrainSplash';

// FIX: Explicitly accept the prop from BloodBrainBarrier
interface BackgroundCanvasProps {
    onLobeClick: (path: string) => void;
}

export const BackgroundCanvas = ({ onLobeClick }: BackgroundCanvasProps) => {
    const [hoveredLobe, setHoveredLobe] = useState<string | null>(null);

    return (
        <Canvas camera={{ position: [8, 4, 10], fov: 45 }}>
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
            <Environment preset="city" />

            <BrainPlaceholder
                onLobeClick={onLobeClick} // FIX: Pass it to the spheres
                hoveredLobe={hoveredLobe}
                setHoveredLobe={setHoveredLobe}
            />

            <OrbitControls
                autoRotate
                autoRotateSpeed={0.4}
                enablePan={false}
                minDistance={5}
                maxDistance={20}
                enabled={hoveredLobe === null}
            />
        </Canvas>
    );
};
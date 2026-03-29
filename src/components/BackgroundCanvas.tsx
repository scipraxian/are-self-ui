import { memo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { BrainPlaceholder } from './BrainSplash';

interface BackgroundCanvasProps {
    onLobeClick: (path: string) => void;
    interactive?: boolean;
}

export const BackgroundCanvas = memo(function BackgroundCanvas({ onLobeClick, interactive = true }: BackgroundCanvasProps) {
    const [hoveredLobe, setHoveredLobe] = useState<string | null>(null);

    return (
        <Canvas
            camera={{ position: [8, 4, 10], fov: 45 }}
            style={{ pointerEvents: interactive ? 'auto' : 'none' }}
        >
            <ambientLight intensity={0.2} />
            <directionalLight position={[10, 10, 5]} intensity={1.5} />
            <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3b82f6" />
            <Environment preset="city" />

            <BrainPlaceholder
                onLobeClick={onLobeClick}
                hoveredLobe={hoveredLobe}
                setHoveredLobe={setHoveredLobe}
            />

            <OrbitControls
                autoRotate
                autoRotateSpeed={0.4}
                enablePan={false}
                minDistance={5}
                maxDistance={20}
                enabled={interactive && hoveredLobe === null}
            />
        </Canvas>
    );
});
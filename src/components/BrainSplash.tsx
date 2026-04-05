import "./BrainSplash.css";
import { Suspense, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Html, useCursor } from '@react-three/drei';
import { FBXLoader } from 'three-stdlib';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Brain region definitions — maps FBX exports to app routes/colors  */
/* ------------------------------------------------------------------ */

interface BrainRegionDef {
    name: string;
    files: string[];
    color: string;
    emissive: string;
    path: string | null;
    delay: number;
}

const BRAIN_REGIONS: BrainRegionDef[] = [
    {
        name: 'Prefrontal Cortex',
        files: ['PreFrontal_L.001.fbx', 'PreFrontal_R.001.fbx'],
        color: '#ef4444',
        emissive: '#ef4444',
        path: 'pfc',
        delay: 0,
    },
    {
        name: 'Hippocampus',
        files: ['Hippo.L.001.fbx', 'Hippo.R.001.fbx'],
        color: '#f472b6',
        emissive: '#f472b6',
        path: 'hippocampus',
        delay: 0.6,
    },
    {
        name: 'Hypothalamus',
        files: ['Hypothalamus.fbx'],
        color: '#fbbf24',
        emissive: '#fbbf24',
        path: 'hypothalamus',
        delay: 1.2,
    },
    {
        name: 'Parietal Lobe',
        files: ['Parietal.L.001.fbx', 'Parietal.R.001.fbx'],
        color: '#f99f1b',
        emissive: '#f99f1b',
        path: 'temporal',
        delay: 1.8,
    },
    {
        name: 'Occipital Lobe',
        files: ['occipital_L.001.fbx', 'occipital_R.001.fbx'],
        color: '#a855f7',
        emissive: '#a855f7',
        path: 'frontal',
        delay: 2.4,
    },
    {
        name: 'Pons',
        files: ['Pons.L.001.fbx', 'Pons.R.001.fbx'],
        color: '#06b6d4',
        emissive: '#06b6d4',
        path: null,
        delay: 3.0,
    },
    {
        name: 'Central Nervous System',
        files: ['CNS.L.001.fbx', 'CNS.R.001.fbx'],
        color: '#38bdf8',
        emissive: '#38bdf8',
        path: 'cns',
        delay: 3.6,
    },
    {
        name: 'Peripheral Nervous System',
        files: ['Perepheral_L.001.fbx', 'Perepheral_R.001.fbx'],
        color: '#14b8a6',
        emissive: '#14b8a6',
        path: 'pns',
        delay: 4.2,
    },
    {
        name: 'Reptilian Brain',
        files: ['Reptillian.L.001.fbx', 'Reptillian.R.001.fbx'],
        color: '#64748b',
        emissive: '#818cf8',
        path: null,
        delay: 4.8,
    },
];

const MODEL_BASE = '/models/brain/';
const FADE_DURATION = 2.0;

/**
 * Unreal Engine Z-up → Three.js Y-up correction.
 * -90° on X flips the brain from lying flat to standing upright.
 */
const UNREAL_ROTATION = new THREE.Euler(-Math.PI / 2, 0, 0);

/* ------------------------------------------------------------------ */
/*  Brain region — loads all FBX files, clones, applies material      */
/* ------------------------------------------------------------------ */

interface BrainRegionProps {
    region: BrainRegionDef;
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
    onLobeClick: (path: string) => void;
    visible: boolean;
}

function BrainRegionMeshes({ region, hoveredLobe, setHoveredLobe, onLobeClick, visible }: BrainRegionProps) {
    const groupRef = useRef<THREE.Group>(null);
    const mountTimeRef = useRef<number | null>(null);
    const revealedRef = useRef(false);
    const isHovered = hoveredLobe === region.name;

    const urls = region.files.map((f) => `${MODEL_BASE}${f}`);
    const fbxResults = useLoader(FBXLoader, urls);

    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(region.color),
            emissive: new THREE.Color(region.emissive),
            emissiveIntensity: 0.15,
            roughness: 0.35,
            metalness: 0.7,
            transparent: true,
            opacity: 0,
            depthWrite: false,
        });
    }, [region.color, region.emissive]);

    const clones = useMemo(() => {
        const results = (Array.isArray(fbxResults) ? fbxResults : [fbxResults]) as THREE.Group[];
        return results.map((fbx) => {
            const clone = fbx.clone(true);
            clone.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).material = material;
                }
            });
            return clone;
        });
    }, [fbxResults, material]);

    useFrame((state) => {
        if (!visible) {
            material.opacity = Math.max(material.opacity - 0.02, 0);
            material.depthWrite = false;
            mountTimeRef.current = null;
            revealedRef.current = false;
            return;
        }

        if (mountTimeRef.current === null) {
            mountTimeRef.current = state.clock.elapsedTime;
        }

        const elapsed = state.clock.elapsedTime - mountTimeRef.current;
        const fadeProgress = Math.min(Math.max((elapsed - region.delay) / FADE_DURATION, 0), 1);
        const easedProgress = 1 - Math.pow(1 - fadeProgress, 3);

        material.opacity = easedProgress;
        material.emissiveIntensity = isHovered ? 0.5 : 0.15 + easedProgress * 0.1;
        material.depthWrite = easedProgress > 0.5;

        if (fadeProgress >= 1 && !revealedRef.current) {
            revealedRef.current = true;
        }

        if (groupRef.current) {
            groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5 + region.delay) * 0.08;
        }
    });

    const handlePointerOver = (e: { stopPropagation: () => void }) => {
        if (!region.path) return;
        e.stopPropagation();
        setHoveredLobe(region.name);
    };

    const handlePointerOut = (e: { stopPropagation: () => void }) => {
        if (!region.path) return;
        e.stopPropagation();
        setHoveredLobe(null);
    };

    const handleClick = (e: { stopPropagation: () => void }) => {
        if (!region.path) return;
        e.stopPropagation();
        onLobeClick(region.path);
    };

    return (
        <group
            ref={groupRef}
            onPointerOver={region.path ? handlePointerOver : undefined}
            onPointerOut={region.path ? handlePointerOut : undefined}
            onClick={region.path ? handleClick : undefined}
        >
            {clones.map((clone, i) => (
                <primitive key={region.files[i]} object={clone} />
            ))}
            {isHovered && region.path && (
                <Html className="brainsplash-ui-13" position={[0, 2, 0]} center>
                    <div className={`brainsplash-hover-label brainsplash-hover-label--${region.path}`}>
                        {region.name.toUpperCase()}
                    </div>
                </Html>
            )}
        </group>
    );
}

function BrainRegion(props: BrainRegionProps) {
    return (
        <Suspense fallback={null}>
            <BrainRegionMeshes {...props} />
        </Suspense>
    );
}

/* ------------------------------------------------------------------ */
/*  AS Mesh logo — lightweight fallback when workers are running      */
/* ------------------------------------------------------------------ */

function LogoMeshInner({ visible }: { visible: boolean }) {
    const groupRef = useRef<THREE.Group>(null);
    const opacityRef = useRef(0);

    const fbx = useLoader(FBXLoader, `${MODEL_BASE}AreSelflogo.001.fbx`);

    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color('#38bdf8'),
            emissive: new THREE.Color('#38bdf8'),
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.8,
            transparent: true,
            opacity: 0,
            depthWrite: false,
        });
    }, []);

    const clone = useMemo(() => {
        const c = fbx.clone(true);
        c.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                (child as THREE.Mesh).material = material;
            }
        });
        return c;
    }, [fbx, material]);

    useFrame(() => {
        const target = visible ? 1 : 0;
        opacityRef.current += (target - opacityRef.current) * 0.03;
        material.opacity = opacityRef.current;
        material.depthWrite = opacityRef.current > 0.5;
    });

    return (
        <group ref={groupRef} scale={0.05} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, -Math.PI]}>
            <primitive object={clone} />
        </group>
    );
}

function LogoMesh({ visible }: { visible: boolean }) {
    return (
        <Suspense fallback={null}>
            <LogoMeshInner visible={visible} />
        </Suspense>
    );
}

/* ------------------------------------------------------------------ */
/*  Exported BrainPlaceholder — the full brain assembly               */
/* ------------------------------------------------------------------ */

export interface BrainPlaceholderProps {
    hoveredLobe: string | null;
    setHoveredLobe: (name: string | null) => void;
    onLobeClick: (path: string) => void;
    showBrain: boolean;
}

export const BrainPlaceholder = ({ onLobeClick, hoveredLobe, setHoveredLobe, showBrain }: BrainPlaceholderProps) => {
    useCursor(hoveredLobe !== null, 'pointer', 'auto');
    showBrain = false;
    return (
        <group>
            <group rotation={UNREAL_ROTATION}>
                {BRAIN_REGIONS.map((region) => (
                    <BrainRegion
                        key={region.name}
                        region={region}
                        hoveredLobe={hoveredLobe}
                        setHoveredLobe={setHoveredLobe}
                        onLobeClick={onLobeClick}
                        visible={showBrain}
                    />
                ))}
            </group>
            <LogoMesh visible={!showBrain} />
        </group>
    );
};

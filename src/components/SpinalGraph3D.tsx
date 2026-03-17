import "./SpinalGraph3D.css";
import { memo, useEffect, useMemo, useRef } from "react";
import ForceGraph3D from "react-force-graph-3d";
import type { ForceGraphMethods } from "react-force-graph-3d";
import * as THREE from "three";
import type { SpikeTrain } from "../types";

type SpineNode = {
    id: string;
    type: "spike";
    spikeTrainId: number;
    spikeIndex: number;
    status_name: string;
    effector_name: string;
    delta?: string;
    average_delta?: string | number;
    targetY?: number;
    x?: number;
    y?: number;
    z?: number;
    fx?: number;
    fy?: number;
    fz?: number;
    sizeRatio?: number;
};

type SpineLink = {
    source: string | SpineNode;
    target: string | SpineNode;
    type: "axon";
};

const parseSeconds = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;
    const clean = value.trim().replace(/s$/i, "");
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const getStatusColor = (statusName: string) => {
    const s = (statusName || "").toLowerCase();
    if (s.includes("fail") || s.includes("error")) return "#ef4444";
    if (s.includes("run") || s.includes("active")) return "#f99f1b";
    if (s.includes("success") || s.includes("completed")) return "#4ade80";
    if (s.includes("pending") || s.includes("queued")) return "#64748b";
    return "#38bdf8";
};

interface SpinalGraph3DProps {
    spikeTrains: SpikeTrain[];
    dimmed?: boolean;
}

export const SpinalGraph3D = memo(function SpinalGraph3D({ spikeTrains, dimmed = true }: SpinalGraph3DProps) {
    const fgRef = useRef<ForceGraphMethods | undefined>(undefined);

    const graphData = useMemo(() => {
        const trains = [...spikeTrains].sort((a, b) => (a.created < b.created ? 1 : -1)).slice(0, 6);

        const nodes: SpineNode[] = [];
        const links: SpineLink[] = [];

        const trainSpacing = 38;
        const spikeSpacing = 11;

        trains.forEach((st, trainIdx) => {
            const spikes = (st.spikes || []) as unknown as Array<
                {
                    id: number;
                    status_name: string;
                    effector_name: string;
                    delta?: string;
                    average_delta?: string | number;
                }
            >;

            spikes.forEach((spike, spikeIdx) => {
                const current = parseSeconds(spike.delta);
                const avg = parseSeconds(spike.average_delta);
                const ratioRaw = avg > 0 ? current / avg : 1;
                const ratio = clamp(ratioRaw || 1, 0.25, 14);

                const id = `st-${st.id}-sp-${spike.id}`;

                // Central vertical column "spine": y ordering by run + within-run index.
                const targetY = (5 - trainIdx) * trainSpacing - spikeIdx * spikeSpacing;

                nodes.push({
                    id,
                    type: "spike",
                    spikeTrainId: st.id,
                    spikeIndex: spikeIdx,
                    status_name: spike.status_name,
                    effector_name: spike.effector_name,
                    delta: spike.delta,
                    average_delta: spike.average_delta,
                    targetY,
                    sizeRatio: ratio,
                });

                if (spikeIdx > 0) {
                    const prevSpike = spikes[spikeIdx - 1];
                    links.push({
                        source: `st-${st.id}-sp-${prevSpike.id}`,
                        target: id,
                        type: "axon",
                    });
                }
            });
        });

        return { nodes, links };
    }, [spikeTrains]);

    useEffect(() => {
        const fg = fgRef.current;
        if (!fg) return;

        // Directional "spine" forces: pull everything into a vertical column (x=z=0)
        // and towards each node's targetY. Implemented as a d3-like custom force to
        // avoid adding extra dependencies.
        const spineForce = (() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let nodes: any[] = [];
            const strength = 0.35;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const force: any = (alpha: number) => {
                for (const n of nodes) {
                    const node = n as SpineNode;
                    const tx = 0;
                    const tz = 0;
                    const ty = typeof node.targetY === "number" ? node.targetY : 0;

                    n.vx += (tx - (n.x || 0)) * strength * alpha;
                    n.vz += (tz - (n.z || 0)) * strength * alpha;
                    n.vy += (ty - (n.y || 0)) * strength * alpha;
                }
            };

            force.initialize = (ns: unknown[]) => {
                nodes = (ns as any[]) || [];
            };

            return force;
        })();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fg as any).d3Force("spine", spineForce);

        // Keep the camera roughly centered on the column.
        try {
            fg.cameraPosition({ x: 0, y: 40, z: 160 }, { x: 0, y: 10, z: 0 }, 600);
        } catch {
            // ignore
        }
    }, [graphData.nodes.length]);

    const renderNode = (nodeObj: object) => {
        const node = nodeObj as SpineNode;
        const ratio = node.sizeRatio || 1;

        // Delta-sizing: 10x slower => very large.
        const base = 3.6;
        const radius = clamp(base * Math.sqrt(ratio), 2.2, 26);

        const color = new THREE.Color(getStatusColor(node.status_name));

        const pulse = 0.35 + Math.abs(Math.sin(Date.now() * 0.002)) * 0.65;
        const emissiveIntensity = (dimmed ? 0.12 : 0.35) + pulse * (dimmed ? 0.18 : 0.55);
        const opacity = dimmed ? 0.55 : 0.92;

        const geometry = new THREE.SphereGeometry(radius, 28, 28);
        const material = new THREE.MeshPhongMaterial({
            color,
            emissive: color,
            emissiveIntensity,
            transparent: true,
            opacity,
        });

        return new THREE.Mesh(geometry, material);
    };

    return (
        <div className="spinalgraph3d-root">
            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeId="id"
                nodeThreeObject={renderNode}
                linkSource="source"
                linkTarget="target"
                linkWidth={1.2}
                linkColor={() => (dimmed ? "rgba(56,189,248,0.18)" : "rgba(56,189,248,0.35)")}
                linkDirectionalParticles={() => (dimmed ? 2 : 5)}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={dimmed ? 0.003 : 0.01}
                backgroundColor="rgba(0,0,0,0)"
                enableNodeDrag={false}
            />
        </div>
    );
});


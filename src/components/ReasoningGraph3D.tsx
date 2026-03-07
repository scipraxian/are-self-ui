import { useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';

interface ReasoningGraphProps {
    sessionId: string;
    onNodeSelect: (node: any) => void;
    onStatsUpdate: (stats: any) => void;
}

export const ReasoningGraph3D = ({ sessionId, onNodeSelect, onStatsUpdate }: ReasoningGraphProps) => {
    const fgRef = useRef<any>();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const prevDataRef = useRef<string>("");

    // Store references to active meshes so we can animate them outside the React cycle
    const activeMeshesRef = useRef<THREE.Mesh[]>([]);

    const parseDuration = (str: string) => {
        if (!str) return 0;
        const clean = str.replace('s', '').trim();
        const parts = clean.split(':');
        if (parts.length === 3) return (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
        if (parts.length === 2) return (parseFloat(parts[0]) * 60) + parseFloat(parts[1]);
        return parseFloat(clean) || 0;
    };

    const fetchGraphData = async () => {
        try {
            const res = await fetch(`/api/v1/reasoning_sessions/${sessionId}/graph_data/`);
            if (!res.ok) return;
            const data = await res.json();

            let latestThought = "Awaiting cortex synchronization...";
            let totalSeconds = 0;
            let validTurnsCount = 0;

            if (data.turns && data.turns.length > 0) {
                for (let i = data.turns.length - 1; i >= 0; i--) {
                    if (data.turns[i].thought_process) {
                        latestThought = data.turns[i].thought_process.replace(/^(THOUGHT:\s*)+/i, '').trim();
                        break;
                    }
                }
                // Pre-calculate the exact average delta for node sizing parity
                data.turns.forEach((t: any) => {
                    const sec = parseDuration(t.inference_time || t.delta);
                    if (sec > 0) {
                        totalSeconds += sec;
                        validTurnsCount++;
                    }
                });
            }

            const avgDelta = validTurnsCount > 0 ? totalSeconds / validTurnsCount : 1.0;

            onStatsUpdate({
                level: data.current_level || 1,
                focus: `${data.current_focus || 0} / ${data.max_focus || 10}`,
                xp: data.total_xp || 0,
                status: data.status_name,
                latestThought
            });

            const newNodes: any[] = [];
            const newLinks: any[] = [];
            let firstTurnId = null;

            if (data.goals) {
                data.goals.forEach((g: any) => newNodes.push({ ...g, id: `goal-${g.id}`, type: 'goal', label: `Goal ${g.id}` }));
            }

            if (data.turns) {
                data.turns.forEach((t: any, index: number) => {
                    const tId = `turn-${t.id}`;
                    if (index === 0) firstTurnId = tId;

                    // Inject the pre-calculated ratio into the node data
                    const sec = parseDuration(t.inference_time || t.delta);
                    let ratio = sec / avgDelta;
                    if (isNaN(ratio) || ratio === 0) ratio = 1;
                    ratio = Math.max(0.3, Math.min(ratio, 4.0));

                    newNodes.push({ ...t, id: tId, type: 'turn', label: `Turn ${t.turn_number}`, sizeRatio: ratio });

                    if (index > 0) {
                        newLinks.push({ source: `turn-${data.turns[index - 1].id}`, target: tId, type: 'sequence' });
                    }

                    if (t.tool_calls) {
                        t.tool_calls.forEach((c: any, cIdx: number) => {
                            const cId = `tool-${t.id}-${cIdx}`;
                            newNodes.push({ ...c, id: cId, type: 'tool', label: c.tool_name });
                            newLinks.push({ source: tId, target: cId, type: 'tool_call' });
                        });
                    }
                });
            }

            if (firstTurnId && data.goals) {
                data.goals.forEach((g: any) => newLinks.push({ source: firstTurnId, target: `goal-${g.id}`, type: 'anchor' }));
            }

            if (data.engrams) {
                data.engrams.forEach((e: any) => {
                    const eId = `engram-${e.id}`;
                    newNodes.push({ ...e, id: eId, type: 'engram', label: e.name });
                    if (e.source_turns) {
                        e.source_turns.forEach((st: any) => newLinks.push({ source: `turn-${st}`, target: eId, type: 'memory' }));
                    }
                });
            }

            if (data.conclusion) {
                const cId = `conclusion-${data.conclusion.id}`;
                newNodes.push({ ...data.conclusion, id: cId, type: 'conclusion', label: 'Final Report' });
                if (data.turns && data.turns.length > 0) {
                    newLinks.push({ source: `turn-${data.turns[data.turns.length - 1].id}`, target: cId, type: 'sequence' });
                }
            }

            const validIds = new Set(newNodes.map(n => n.id));
            const safeLinks = newLinks.filter(l => validIds.has(l.source) && validIds.has(l.target));

            const topologySignature = JSON.stringify({
                nodes: newNodes.map(n => ({ id: n.id, status: n.status_name, ratio: n.sizeRatio })),
                links: safeLinks.length
            });

            if (topologySignature !== prevDataRef.current) {
                prevDataRef.current = topologySignature;
                // Clear active meshes on topology change to prevent memory leaks
                activeMeshesRef.current = [];
                setGraphData({ nodes: newNodes, links: safeLinks as never[] });
            }

        } catch (err) {
            console.error("Graph fetch failed:", err);
        }
    };

    useEffect(() => {
        prevDataRef.current = "";
        fetchGraphData();
        const interval = setInterval(fetchGraphData, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    // Setup the WebGL Animation Loop for Active Nodes
    useEffect(() => {
        let frameId: number;
        const animate = () => {
            const time = Date.now() * 0.003;
            // Breathe scale from 1.0 to 1.3
            const scale = 1.0 + Math.abs(Math.sin(time)) * 0.3;
            // Glow intensity from 0.5 to 1.5
            const intensity = 0.5 + Math.abs(Math.sin(time));

            activeMeshesRef.current.forEach(mesh => {
                if (mesh) {
                    mesh.scale.set(scale, scale, scale);
                    if (mesh.material instanceof THREE.MeshPhongMaterial) {
                        mesh.material.emissiveIntensity = intensity;
                    }
                }
            });
            frameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(frameId);
    }, []);

    const renderNode = useCallback((node: any) => {
        let geometry;
        let color: THREE.Color | string = '#ffffff';
        let emissiveIntensity = 0.5;
        const isActive = ['Active', 'Running', 'Pending', 'Thinking'].includes(node.status_name);

        if (node.type === 'turn') {
            const ratio = node.sizeRatio || 1;
            const baseRadius = 6 * ratio;
            geometry = new THREE.SphereGeometry(baseRadius, 32, 32);

            // --- GRADIENT LOGIC ---
            // Map the ratio to a 0.0 (Fast/Green) to 1.0 (Slow/Orange) scale
            // Assuming 0.5 is great, 2.5 is very slow. Clamp between 0 and 1.
            const t = Math.max(0, Math.min(1, (ratio - 0.5) / 2.0));
            const colorGreen = new THREE.Color('#4ade80');
            const colorOrange = new THREE.Color('#f99f1b');

            // Blend the two colors based on the node's relative performance
            color = colorGreen.clone().lerp(colorOrange, t);

            if (isActive) emissiveIntensity = 1.0;
        } else if (node.type === 'tool') {
            geometry = new THREE.BoxGeometry(6, 6, 6);
            color = '#ef4444';
        } else if (node.type === 'engram') {
            geometry = new THREE.OctahedronGeometry(5);
            color = '#a855f7';
        } else if (node.type === 'goal') {
            geometry = new THREE.OctahedronGeometry(8);
            color = '#38bdf8';
        } else if (node.type === 'conclusion') {
            geometry = new THREE.OctahedronGeometry(10);
            color = '#4ade80';
        }

        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity,
            transparent: true,
            opacity: 0.9
        });

        const mesh = new THREE.Mesh(geometry, material);

        // Track this specific mesh for the animation loop
        if (isActive && node.type === 'turn') {
            activeMeshesRef.current.push(mesh);
        }

        return mesh;
    }, []);

    return (
        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, zIndex: 0 }}>
            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeId="id"
                nodeThreeObject={renderNode}
                linkSource="source"
                linkTarget="target"
                linkWidth={1.5}
                linkColor={(link: any) => {
                    if (link.type === 'tool_call') return '#ef4444';
                    if (link.type === 'memory') return '#a855f7';
                    if (link.type === 'anchor') return 'rgba(56, 189, 248, 0.2)';
                    return '#ffffff';
                }}
                linkDirectionalParticles={(link: any) => {
                    if (link.type === 'sequence') return 4;
                    if (link.type === 'tool_call') return 2;
                    return 0;
                }}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeClick={(node: any) => {
                    const distance = 60;
                    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
                    if (fgRef.current) {
                        fgRef.current.cameraPosition(
                            { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
                            node,
                            1000
                        );
                    }
                    onNodeSelect(node);
                }}
                backgroundColor="rgba(0,0,0,0)"
            />
        </div>
    );
};
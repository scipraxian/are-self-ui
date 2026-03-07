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
    // Track previous data hash to prevent physics engine resets
    const prevDataRef = useRef<string>("");

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
            if (data.turns && data.turns.length > 0) {
                for (let i = data.turns.length - 1; i >= 0; i--) {
                    if (data.turns[i].thought_process) {
                        latestThought = data.turns[i].thought_process.replace(/^(THOUGHT:\s*)+/i, '').trim();
                        break;
                    }
                }
            }
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
                data.goals.forEach((g: any) => {
                    // FIX: Spread the backend object first, THEN apply our strict React IDs and Types
                    newNodes.push({ ...g, id: `goal-${g.id}`, type: 'goal', label: `Goal ${g.id}` });
                });
            }

            if (data.turns) {
                data.turns.forEach((t: any, index: number) => {
                    const tId = `turn-${t.id}`;
                    if (index === 0) firstTurnId = tId;

                    // FIX: Spread first
                    newNodes.push({ ...t, id: tId, type: 'turn', label: `Turn ${t.turn_number}` });

                    if (index > 0) {
                        newLinks.push({ source: `turn-${data.turns[index - 1].id}`, target: tId, type: 'sequence' });
                    }

                    if (t.tool_calls) {
                        t.tool_calls.forEach((c: any, cIdx: number) => {
                            const cId = `tool-${t.id}-${cIdx}`;
                            // FIX: Spread first
                            newNodes.push({ ...c, id: cId, type: 'tool', label: c.tool_name });
                            newLinks.push({ source: tId, target: cId, type: 'tool_call' });
                        });
                    }
                });
            }

            if (firstTurnId && data.goals) {
                data.goals.forEach((g: any) => {
                    newLinks.push({ source: firstTurnId, target: `goal-${g.id}`, type: 'anchor' });
                });
            }

            if (data.engrams) {
                data.engrams.forEach((e: any) => {
                    const eId = `engram-${e.id}`;
                    // FIX: Spread first
                    newNodes.push({ ...e, id: eId, type: 'engram', label: e.name });

                    if (e.source_turns) {
                        e.source_turns.forEach((st: any) => {
                            newLinks.push({ source: `turn-${st}`, target: eId, type: 'memory' });
                        });
                    }
                });
            }

            // SAFE LINKS: Drop any links where the source or target node doesn't exist
            const validIds = new Set(newNodes.map(n => n.id));
            const safeLinks = newLinks.filter(l => validIds.has(l.source) && validIds.has(l.target));

            // Generate a lightweight signature of the current state
            const topologySignature = JSON.stringify({
                nodes: newNodes.map(n => ({ id: n.id, status: n.status_name })),
                links: safeLinks.length
            });

            // ONLY update React state if something biological actually changed
            if (topologySignature !== prevDataRef.current) {
                prevDataRef.current = topologySignature;
                setGraphData({ nodes: newNodes, links: safeLinks as never[] });
            }

        } catch (err) {
            console.error("Graph fetch failed:", err);
        }
    };

    useEffect(() => {
        // Reset ref when session changes to force immediate redraw
        prevDataRef.current = "";
        fetchGraphData();
        const interval = setInterval(fetchGraphData, 3000);
        return () => clearInterval(interval);
    }, [sessionId]);

    const renderNode = useCallback((node: any) => {
        let geometry;
        let color = '#ffffff';
        let emissiveIntensity = 0.5;

        if (node.type === 'turn') {
            const seconds = parseDuration(node.inference_time || node.delta);
            // Dynamic scale: min 4, max 12 based on time spent thinking
            const size = Math.max(4, Math.min(12, 4 + (seconds * 0.5)));
            geometry = new THREE.SphereGeometry(size, 32, 32);
            color = '#f99f1b'; // Gold
            if (['Active', 'Running', 'Pending'].includes(node.status_name)) emissiveIntensity = 1.0;
        } else if (node.type === 'tool') {
            geometry = new THREE.BoxGeometry(6, 6, 6);
            color = '#ef4444'; // Red
        } else if (node.type === 'engram') {
            geometry = new THREE.OctahedronGeometry(5);
            color = '#a855f7'; // Purple
        } else if (node.type === 'goal') {
            geometry = new THREE.OctahedronGeometry(8);
            color = '#38bdf8'; // Blue
        }

        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity,
            transparent: true,
            opacity: 0.9
        });

        return new THREE.Mesh(geometry, material);
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
                linkWidth={1}
                linkColor={(link: any) => {
                    if (link.type === 'tool_call') return '#ef4444';
                    if (link.type === 'memory') return '#a855f7';
                    if (link.type === 'anchor') return '#38bdf8';
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
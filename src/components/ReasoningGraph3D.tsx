import "./ReasoningGraph3D.css";
import { memo, useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { useDendrite } from './SynapticCleft';
import { summarizeTool, toolOneLiner } from '../utils/toolFormatters';
import type {
    GraphLink,
    GraphNode,
    ModelUsageRecord,
    ReasoningGoalData,
    ReasoningSessionData,
    ReasoningTurnData,
    TalosEngramData,
    ToolCallData
} from "../types.ts";

const MAX_THOUGHT_LENGTH = 140;

const extractThoughtFromUsageRecord = (record?: ModelUsageRecord): string => {
    if (!record?.response_payload?.choices?.length) return '';
    const message = record.response_payload.choices[0].message;

    // 1. Direct assistant content
    if (typeof message.content === 'string' && message.content.trim()) {
        return message.content.trim();
    }

    // 2. Tool call: mcp_respond_to_user → parse arguments for "thought"
    if (Array.isArray(message.tool_calls)) {
        for (const tc of message.tool_calls) {
            if (tc.function?.name === 'mcp_respond_to_user') {
                try {
                    const parsed = JSON.parse(tc.function.arguments);
                    if (typeof parsed.thought === 'string' && parsed.thought.trim()) {
                        return parsed.thought.trim();
                    }
                } catch { /* ignore parse errors */ }
            }
        }
    }

    return '';
};

const extractNodeThought = (node: GraphNode): string => {
    if (node.type !== 'turn') return '';

    const thought = extractThoughtFromUsageRecord(node.model_usage_record as ModelUsageRecord | undefined);
    if (!thought) return '';

    if (thought.length > MAX_THOUGHT_LENGTH) {
        return `${thought.slice(0, MAX_THOUGHT_LENGTH - 1)}…`;
    }
    return thought;
};

const generateHoverCardLines = (node: GraphNode): string[] => {
    const lines: string[] = [];

    if (node.type === 'turn') {
        const turnData = node as unknown as ReasoningTurnData & { id: string };
        const durationStr = turnData.model_usage_record?.query_time || turnData.delta || '?';
        const status = turnData.status_name || 'Unknown';
        lines.push(`Turn ${turnData.turn_number} · ${durationStr} · ${status}`);

        if (turnData.tool_calls && turnData.tool_calls.length > 0) {
            lines.push(toolOneLiner(turnData.tool_calls[0]));
        }

        const thought = extractNodeThought(node);
        if (thought) {
            lines.push(`💭 "${thought}"`);
        }
    } else if (node.type === 'tool') {
        const toolData = node as unknown as ToolCallData & { id: string };
        const summary = summarizeTool(toolData);
        const status = toolData.status_name || 'Unknown';
        lines.push(`⚙ ${toolData.tool_name} · ${status}`);
        lines.push(summary.action);
    } else if (node.type === 'engram') {
        const engramData = node as unknown as TalosEngramData & { id: string };
        lines.push(`◆ "${engramData.name}"`);
        const relevance = (engramData.relevance_score || 0).toFixed(2);
        const sourceTurn = engramData.source_turns?.[0] || '?';
        lines.push(`relevance ${relevance} · from Turn ${sourceTurn}`);
    } else if (node.type === 'goal') {
        const goalData = node as unknown as ReasoningGoalData & { id: string };
        const status = goalData.status_name || 'Unknown';
        lines.push(`⊕ Goal · ${status}`);
        const goalPreview = goalData.rendered_goal?.slice(0, 100) || '';
        lines.push(`"${goalPreview}"`);
    } else if (node.type === 'conclusion') {
        const conclusionData = node as any; // SessionConclusionData
        const status = conclusionData.outcome_status || conclusionData.status_name || 'Complete';
        lines.push(`◼ ${status}`);
        const summaryPreview = conclusionData.summary?.slice(0, 100) || '';
        lines.push(`"${summaryPreview}"`);
    }

    return lines;
};

interface BubblePosition {
    x: number;
    y: number;
    text: string;
}

interface HoverCard {
    nodeId: string;
    x: number;
    y: number;
    lines: string[];
}

interface ReasoningGraphProps {
    sessionId: string;
    onNodeSelect: (node: GraphNode) => void;
    onStatsUpdate: (stats: { level: number, focus: string, xp: number, status: string, latestThought: string }) => void;
    onSessionDataUpdate?: (data: ReasoningSessionData) => void;
}

export const ReasoningGraph3D = memo(function ReasoningGraph3D({
    sessionId,
    onNodeSelect,
    onStatsUpdate,
    onSessionDataUpdate,
}: ReasoningGraphProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null);
    const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
    const prevDataRef = useRef<string>("");

    const activeMeshesRef = useRef<THREE.Mesh[]>([]);
    const [bubblePositions, setBubblePositions] = useState<Record<string, BubblePosition>>({});
    const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const parseDuration = (str: string) => {
        if (!str) return 0;
        const clean = str.replace('s', '').trim();
        const parts = clean.split(':');
        if (parts.length === 3) return (parseFloat(parts[0]) * 3600) + (parseFloat(parts[1]) * 60) + parseFloat(parts[2]);
        if (parts.length === 2) return (parseFloat(parts[0]) * 60) + parseFloat(parts[1]);
        return parseFloat(clean) || 0;
    };

    // Real-time: refetch when any ReasoningTurn changes
    const turnEvent = useDendrite('ReasoningTurn', null);
    const sessionEvent = useDendrite('ReasoningSession', sessionId);

    useEffect(() => {
        if (!sessionId) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await fetch(`/api/v1/reasoning_sessions/${sessionId}/graph_data/`);
                if (!res.ok || cancelled) return;
                const data: ReasoningSessionData = await res.json();
                if (cancelled) return;

                let latestThought = "Awaiting cortex synchronization...";
                let totalSeconds = 0;
                let validTurnsCount = 0;

                if (data.turns && data.turns.length > 0) {
                    for (let i = data.turns.length - 1; i >= 0; i--) {
                        const thought = extractThoughtFromUsageRecord(data.turns[i].model_usage_record);
                        if (thought) {
                            latestThought = thought;
                            break;
                        }
                    }
                    data.turns.forEach((t: ReasoningTurnData) => {
                        const timeStr = t.model_usage_record?.query_time || t.delta || '';
                        const sec = parseDuration(timeStr);
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

                onSessionDataUpdate?.(data);

                const newNodes: GraphNode[] = [];
                const newLinks: GraphLink[] = [];

                if (data.goals) {
                    data.goals.forEach((g: ReasoningGoalData) => newNodes.push({ ...g, id: `goal-${g.id}`, type: 'goal', label: `Goal ${g.id}` }));
                }

                if (data.turns) {
                    data.turns.forEach((t: ReasoningTurnData, index: number) => {
                        const tId = `turn-${t.id}`;

                        const sec = parseDuration(t.model_usage_record?.query_time || t.delta || '');
                        let ratio = sec / avgDelta;
                        if (isNaN(ratio) || ratio === 0) ratio = 1;
                        ratio = Math.max(0.3, Math.min(ratio, 4.0));

                        newNodes.push({ ...t, id: tId, type: 'turn', label: `Turn ${t.turn_number}`, sizeRatio: ratio });

                        if (index > 0) {
                            newLinks.push({ source: `turn-${data.turns[index - 1].id}`, target: tId, type: 'sequence' });
                        }

                        if (t.tool_calls) {
                            t.tool_calls.forEach((c: ToolCallData, cIdx: number) => {
                                const cId = `tool-${t.id}-${cIdx}`;
                                newNodes.push({ ...c, id: cId, type: 'tool', label: c.tool_name });
                                newLinks.push({ source: tId, target: cId, type: 'tool_call' });
                            });
                        }
                    });
                }

                if (data.engrams) {
                    data.engrams.forEach((e: TalosEngramData) => {
                        const eId = `engram-${e.id}`;
                        newNodes.push({ ...e, id: eId, type: 'engram', label: e.name });
                        if (e.source_turns) {
                            e.source_turns.forEach((st: number) => newLinks.push({ source: `turn-${st}`, target: eId, type: 'memory' }));
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
                const safeLinks = newLinks.filter(l => validIds.has(l.source as string) && validIds.has(l.target as string));

                const topologySignature = JSON.stringify({
                    nodes: newNodes.map(n => ({ id: n.id, status: n.status_name, ratio: n.sizeRatio })),
                    links: safeLinks.length
                });

                if (topologySignature !== prevDataRef.current) {
                    prevDataRef.current = topologySignature;
                    activeMeshesRef.current = [];
                    setGraphData({ nodes: newNodes, links: safeLinks });
                }

            } catch (err) {
                console.error("Graph fetch failed:", err);
            }
        };

        prevDataRef.current = "";
        load();
        return () => { cancelled = true; };
    }, [sessionId, turnEvent, sessionEvent, onStatsUpdate, onSessionDataUpdate]);

    useEffect(() => {
        let frameId: number;
        const animate = () => {
            const time = Date.now() * 0.003;
            const scale = 1.0 + Math.abs(Math.sin(time)) * 0.3;
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

    useEffect(() => {
        const fg = fgRef.current;
        if (!fg) return;

        let frameId: number;

        const updateBubbles = () => {
            const camera = fg.camera();
            const renderer = fg.renderer();

            if (!camera || !renderer) {
                frameId = requestAnimationFrame(updateBubbles);
                return;
            }

            const rect = renderer.domElement.getBoundingClientRect();
            const { width, height } = rect;

            const nextPositions: Record<string, BubblePosition> = {};

            graphData.nodes.forEach((node) => {
                if (node.type !== 'turn') return;

                const text = extractNodeThought(node);
                if (!text) return;

                const vector = new THREE.Vector3(
                    (node.x as number) || 0,
                    (node.y as number) || 0,
                    (node.z as number) || 0
                );

                vector.project(camera);

                const x = (vector.x * 0.5 + 0.5) * width;
                const y = (-vector.y * 0.5 + 0.5) * height - 24;

                nextPositions[node.id] = {
                    x,
                    y,
                    text
                };
            });

            setBubblePositions(nextPositions);
            frameId = requestAnimationFrame(updateBubbles);
        };

        updateBubbles();

        return () => cancelAnimationFrame(frameId);
    }, [graphData]);

    const handleNodeHover = useCallback((nodeObj: object | null) => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }

        if (!nodeObj) {
            setHoverCard(null);
            return;
        }

        const node = nodeObj as GraphNode;
        const fg = fgRef.current;
        if (!fg) return;

        hoverTimeoutRef.current = setTimeout(() => {
            const camera = fg.camera();
            const renderer = fg.renderer();

            if (!camera || !renderer) return;

            const rect = renderer.domElement.getBoundingClientRect();
            const { width, height } = rect;

            const vector = new THREE.Vector3(
                (node.x as number) || 0,
                (node.y as number) || 0,
                (node.z as number) || 0
            );

            vector.project(camera);

            const x = (vector.x * 0.5 + 0.5) * width + 15;
            const y = (-vector.y * 0.5 + 0.5) * height + 15;

            const lines = generateHoverCardLines(node);

            setHoverCard({
                nodeId: node.id,
                x,
                y,
                lines
            });
        }, 200);
    }, []);

    const renderNode = useCallback((nodeObj: object) => {
        const node = nodeObj as GraphNode;
        let geometry;
        let color: THREE.Color | string = '#ffffff';
        let emissiveIntensity = 0.5;
        const isActive = ['Active', 'Running', 'Pending', 'Thinking'].includes(node.status_name || '');

        if (node.type === 'turn') {
            const ratio = node.sizeRatio || 1;
            const baseRadius = 6 * ratio;
            geometry = new THREE.SphereGeometry(baseRadius, 32, 32);

            const t = Math.max(0, Math.min(1, (ratio - 0.5) / 2.0));
            const colorGreen = new THREE.Color('#4ade80');
            const colorOrange = new THREE.Color('#f99f1b');

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

        if (isActive && node.type === 'turn') {
            activeMeshesRef.current.push(mesh);
        }

        return mesh;
    }, []);

    return (
        <div className="reasoning-graph-container">
            <ForceGraph3D
                ref={fgRef}
                graphData={graphData}
                nodeId="id"
                nodeThreeObject={renderNode}
                linkSource="source"
                linkTarget="target"
                linkWidth={1.5}
                linkColor={(linkObj: object) => {
                    const link = linkObj as GraphLink;
                    if (link.type === 'tool_call') return '#ef4444';
                    if (link.type === 'memory') return '#a855f7';
                    if (link.type === 'anchor') return 'rgba(56, 189, 248, 0.2)';
                    return '#ffffff';
                }}
                linkDirectionalParticles={(linkObj: object) => {
                    const link = linkObj as GraphLink;
                    if (link.type === 'sequence') return 4;
                    if (link.type === 'tool_call') return 2;
                    return 0;
                }}
                linkDirectionalParticleWidth={2}
                linkDirectionalParticleSpeed={0.005}
                onNodeHover={handleNodeHover}
                onNodeClick={(nodeObj: object) => {
                    const node = nodeObj as GraphNode;
                    const distance = 60;

                    const nx = (node.x as number) || 0;
                    const ny = (node.y as number) || 0;
                    const nz = (node.z as number) || 0;

                    const distRatio = 1 + distance / Math.hypot(nx, ny, nz);
                    if (fgRef.current) {
                        fgRef.current.cameraPosition(
                            { x: nx * distRatio, y: ny * distRatio, z: nz * distRatio },
                            { x: nx, y: ny, z: nz },
                            1000
                        );
                    }
                    onNodeSelect(node);
                }}
                backgroundColor="rgba(0,0,0,0)"
            />
            <div className="reasoninggraph3d-bubbles">
                {graphData.nodes.filter(n => n.type === 'turn').map(node => {
                    const bubble = bubblePositions[node.id];
                    if (!bubble) return null;
                    return (
                        <div
                            key={node.id}
                            className="reasoninggraph3d-bubble"
                            style={{ left: `${bubble.x}px`, top: `${bubble.y}px` }}
                        >
                            <div className="reasoninggraph3d-bubble-inner">
                                {bubble.text}
                            </div>
                        </div>
                    );
                })}
            </div>
            {hoverCard && (
                <div
                    className="reasoninggraph3d-hover-card"
                    style={{ left: `${hoverCard.x}px`, top: `${hoverCard.y}px` }}
                >
                    {hoverCard.lines.map((line, idx) => (
                        <div key={idx} className="reasoninggraph3d-hover-card-line">
                            {line}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
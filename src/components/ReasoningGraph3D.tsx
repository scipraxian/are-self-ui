import "./ReasoningGraph3D.css";
import { memo, useRef, useCallback, useEffect, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { useDendrite } from './SynapticCleft';
import type {
    GraphLink,
    GraphNode,
    ReasoningSessionData,
    ReasoningToolCallSummary,
    ReasoningTurnDigest,
    TalosEngramData,
} from "../types.ts";

// Scope: turns + their tool sub-nodes come from the digest stream;
// engrams piggyback a thin dedicated fetch (/api/v2/engrams/?sessions=X)
// on mount and get refreshed when a vesicle brings an engram_id we
// haven't seen before. Goals and session conclusion still live behind
// the right-side inspector.
const MAX_THOUGHT_LENGTH = 140;
const ENGRAM_REFETCH_DEBOUNCE_MS = 250;

const clipExcerpt = (text: string | undefined): string => {
    if (!text) return '';
    if (text.length > MAX_THOUGHT_LENGTH) {
        return `${text.slice(0, MAX_THOUGHT_LENGTH - 1)}\u2026`;
    }
    return text;
};

const generateHoverCardLines = (node: GraphNode): string[] => {
    const lines: string[] = [];

    if (node.type === 'turn') {
        const status = node.status_name || 'Unknown';
        const modelName = node.model_name || 'Unknown';
        const duration = computeDurationLabel(node.created, node.modified);
        const tokensOut = node.tokens_out ?? 0;
        lines.push(`Turn ${node.turn_number ?? '?'} · ${duration} · ${status}`);
        lines.push(`${modelName} · ${tokensOut} out`);

        const tool = node.tool_calls_summary?.[0];
        if (tool) {
            const marker = tool.success === true ? '✓' : tool.success === false ? '✗' : '○';
            const target = tool.target ? ` · ${tool.target}` : '';
            lines.push(`⚙ ${tool.tool_name} ${marker}${target}`);
        }

        const thought = clipExcerpt(node.excerpt);
        if (thought) {
            lines.push(`💭 "${thought}"`);
        }
    } else if (node.type === 'tool') {
        const tool = node as unknown as ReasoningToolCallSummary & { id: string };
        const marker = tool.success === true ? '✓' : tool.success === false ? '✗' : '○';
        lines.push(`⚙ ${tool.tool_name} ${marker}`);
        if (tool.target) lines.push(tool.target);
    }

    return lines;
};

const computeDurationLabel = (created?: string | null, modified?: string | null): string => {
    if (!created || !modified) return '?';
    const start = Date.parse(created);
    const end = Date.parse(modified);
    if (isNaN(start) || isNaN(end) || end <= start) return '?';
    const sec = (end - start) / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const min = Math.floor(sec / 60);
    const rem = sec - min * 60;
    return `${min}m${rem.toFixed(0)}s`;
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

// Size-ratio heuristic replaces the old avgDelta-based one. We no longer
// have query_time on the digest, so sphere size now scales off
// tokens_out normalized against the session's running mean (clamped 0.3x
// – 4.0x). A long verbose turn looks bigger than a cheap one-liner.
const computeSizeRatio = (tokensOut: number, meanTokens: number): number => {
    if (!meanTokens || meanTokens <= 0 || !tokensOut) return 1;
    const raw = tokensOut / meanTokens;
    return Math.max(0.3, Math.min(raw, 4.0));
};

export const ReasoningGraph3D = memo(function ReasoningGraph3D({
    sessionId,
    onNodeSelect,
    onStatsUpdate,
    onSessionDataUpdate,
}: ReasoningGraphProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null);
    const [graphData, setGraphData] = useState<{ nodes: GraphNode[], links: GraphLink[] }>({ nodes: [], links: [] });
    const digestsRef = useRef<Map<string, ReasoningTurnDigest>>(new Map());
    const engramsRef = useRef<Map<string, TalosEngramData>>(new Map());
    const highestTurnRef = useRef<number>(-1);
    const engramRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeMeshesRef = useRef<THREE.Mesh[]>([]);
    const [bubblePositions, setBubblePositions] = useState<Record<string, BubblePosition>>({});
    const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Rebuild nodes/links from the digest map. Idempotent: same map in,
    // same arrays out (modulo Map iteration order, which is insertion
    // order, which matches the order we upsert in).
    const rebuild = useCallback(() => {
        const digests = Array.from(digestsRef.current.values())
            .sort((a, b) => a.turn_number - b.turn_number);

        const meanTokens = digests.length
            ? digests.reduce((s, d) => s + (d.tokens_out || 0), 0) / digests.length
            : 0;

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];

        digests.forEach((d, index) => {
            const tId = `turn-${d.turn_id}`;
            const sizeRatio = computeSizeRatio(d.tokens_out, meanTokens);
            nodes.push({
                id: tId,
                type: 'turn',
                label: `Turn ${d.turn_number}`,
                status_name: d.status_name,
                sizeRatio,
                turn_id: d.turn_id,
                session_id: d.session_id,
                turn_number: d.turn_number,
                model_name: d.model_name,
                tokens_in: d.tokens_in,
                tokens_out: d.tokens_out,
                excerpt: d.excerpt,
                tool_calls_summary: d.tool_calls_summary,
                engram_ids: d.engram_ids,
                created: d.created,
                modified: d.modified,
            });

            if (index > 0) {
                const prev = digests[index - 1];
                links.push({ source: `turn-${prev.turn_id}`, target: tId, type: 'sequence' });
            }

            (d.tool_calls_summary || []).forEach((call) => {
                const cId = `tool-${call.id}`;
                nodes.push({
                    id: cId,
                    type: 'tool',
                    label: call.tool_name,
                    status_name: call.success === true ? 'Completed' : call.success === false ? 'Error' : 'Pending',
                    tool_name: call.tool_name,
                    success: call.success,
                    target: call.target,
                    turn_id: d.turn_id,
                    tool_call_id: call.id,
                });
                links.push({ source: tId, target: cId, type: 'tool_call' });
            });
        });

        // Engram layer: one octahedron per engram linked to this session,
        // with a 'memory' link to each source turn already rendered.
        engramsRef.current.forEach((engram) => {
            const eId = `engram-${engram.id}`;
            nodes.push({
                ...engram,
                id: eId,
                type: 'engram',
                label: engram.name,
            });
            (engram.source_turns || []).forEach((turnId) => {
                if (digestsRef.current.has(turnId)) {
                    links.push({
                        source: `turn-${turnId}`,
                        target: eId,
                        type: 'memory',
                    });
                }
            });
        });

        activeMeshesRef.current = [];
        setGraphData({ nodes, links });

        const latest = digests[digests.length - 1];
        onStatsUpdate({
            level: 1,
            focus: `${digests.length} / ?`,
            xp: digests.reduce((s, d) => s + (d.tokens_out || 0), 0),
            status: latest?.status_name || 'Unknown',
            latestThought: latest?.excerpt || 'Awaiting cortex synchronization...',
        });
        // Partial ReasoningSessionData — goals/engrams/conclusion/full turns
        // aren't available from the digest stream. Downstream consumers
        // should null-check rather than assume these are populated.
        onSessionDataUpdate?.({
            id: sessionId,
            status_name: latest?.status_name || 'Unknown',
            created: latest?.created || '',
            turns_count: digests.length,
        });
    }, [sessionId, onStatsUpdate, onSessionDataUpdate]);

    const upsertDigest = useCallback((digest: ReasoningTurnDigest) => {
        digestsRef.current.set(digest.turn_id, digest);
        if (digest.turn_number > highestTurnRef.current) {
            highestTurnRef.current = digest.turn_number;
        }
    }, []);

    const loadEngrams = useCallback(async () => {
        if (!sessionId) return;
        try {
            const res = await fetch(`/api/v2/engrams/?sessions=${sessionId}`);
            if (!res.ok) return;
            const engrams: TalosEngramData[] = await res.json();
            const nextMap = new Map<string, TalosEngramData>();
            engrams.forEach(e => nextMap.set(e.id, e));
            engramsRef.current = nextMap;
            rebuild();
        } catch (err) {
            console.error('Engram fetch failed:', err);
        }
    }, [sessionId, rebuild]);

    const scheduleEngramRefetch = useCallback(() => {
        if (engramRefetchTimerRef.current) {
            clearTimeout(engramRefetchTimerRef.current);
        }
        engramRefetchTimerRef.current = setTimeout(() => {
            engramRefetchTimerRef.current = null;
            loadEngrams();
        }, ENGRAM_REFETCH_DEBOUNCE_MS);
    }, [loadEngrams]);

    const digestEvent = useDendrite('ReasoningTurnDigest', null);

    // Cold-start fetch + reset when session changes. Digest blob and
    // engram side-fetch fire in parallel.
    useEffect(() => {
        if (!sessionId) return;
        let cancelled = false;

        digestsRef.current = new Map();
        engramsRef.current = new Map();
        highestTurnRef.current = -1;
        setGraphData({ nodes: [], links: [] });

        const loadDigests = async () => {
            try {
                const res = await fetch(
                    `/api/v2/reasoning_sessions/${sessionId}/graph_data/?since_turn_number=-1`
                );
                if (!res.ok || cancelled) return;
                const digests: ReasoningTurnDigest[] = await res.json();
                if (cancelled) return;
                digests.forEach(upsertDigest);
                rebuild();
            } catch (err) {
                console.error('Graph cold-start fetch failed:', err);
            }
        };

        loadDigests();
        loadEngrams();
        return () => {
            cancelled = true;
            if (engramRefetchTimerRef.current) {
                clearTimeout(engramRefetchTimerRef.current);
                engramRefetchTimerRef.current = null;
            }
        };
    }, [sessionId, upsertDigest, rebuild, loadEngrams]);

    // Live push: Acetylcholine vesicles per turn close. If a vesicle
    // references an engram id we haven't rendered yet, trigger a
    // debounced re-fetch of the engram layer.
    useEffect(() => {
        if (!digestEvent || !sessionId) return;
        const vesicle = digestEvent.vesicle as ReasoningTurnDigest | undefined;
        if (!vesicle || vesicle.session_id !== sessionId) return;
        upsertDigest(vesicle);
        const incoming = vesicle.engram_ids || [];
        const hasUnseen = incoming.some(id => !engramsRef.current.has(id));
        if (hasUnseen) scheduleEngramRefetch();
        rebuild();
    }, [digestEvent, sessionId, upsertDigest, rebuild, scheduleEngramRefetch]);

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

                const text = clipExcerpt(node.excerpt);
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
        }

        if (!geometry) {
            geometry = new THREE.SphereGeometry(4, 16, 16);
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

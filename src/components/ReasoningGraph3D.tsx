import "./ReasoningGraph3D.css";
import { memo, useRef, useCallback, useEffect, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { useDendrite } from './SynapticCleft';
import { useSessionDigests } from '../hooks/useSessionDigests';
import type {
    GraphLink,
    GraphNode,
    ReasoningToolCallSummary,
    SessionConclusionData,
    TalosEngramData,
} from "../types.ts";

// Scope: turns + their tool sub-nodes come from the digest stream
// (via useSessionDigests); engrams piggyback a thin dedicated fetch
// (/api/v2/engrams/?sessions=X) on mount and get refreshed when a
// digest brings an engram_id we haven't seen before. Session conclusion
// has its own dendrite.
const MAX_THOUGHT_LENGTH = 140;
const ENGRAM_REFETCH_DEBOUNCE_MS = 250;
const TURN_ACTIVE_STATUSES = ['Active', 'Running', 'Pending', 'Thinking'];
const IN_FLIGHT_PREFIX = 'turn-in-flight-';
const IN_FLIGHT_GROWTH_CAP = 4;
const IN_FLIGHT_GROWTH_SECONDS = 30;

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
    } else if (node.type === 'conclusion') {
        const conclusion = node as unknown as SessionConclusionData & { id: string };
        const status = conclusion.outcome_status || conclusion.status_name || 'Complete';
        lines.push(`◼ ${status}`);
        const summaryPreview = conclusion.summary?.slice(0, 100) || '';
        if (summaryPreview) lines.push(`"${summaryPreview}"`);
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

interface InFlightTurn {
    turn_id: string;
    turn_number: number;
    status_name: string;
    created: string;
}

interface ReasoningGraphProps {
    sessionId: string;
    onNodeSelect: (node: GraphNode) => void;
    onStatsUpdate: (stats: { level: number, focus: string, xp: number, status: string, latestThought: string }) => void;
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
}: ReasoningGraphProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null);
    const [engrams, setEngrams] = useState<Map<string, TalosEngramData>>(new Map());
    const [conclusion, setConclusion] = useState<SessionConclusionData | null>(null);
    const [inFlightTurns, setInFlightTurns] = useState<Map<string, InFlightTurn>>(new Map());
    const engramRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeMeshesRef = useRef<THREE.Mesh[]>([]);
    const inFlightMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const [bubblePositions, setBubblePositions] = useState<Record<string, BubblePosition>>({});
    const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { digests } = useSessionDigests(sessionId);
    const digestEvent = useDendrite('ReasoningTurnDigest', null);
    const conclusionEvent = useDendrite('SessionConclusion', null);
    const turnEvent = useDendrite('ReasoningTurn', sessionId ?? null);

    // Reset per-session stores + cold-fetch engrams and conclusion.
    // All setState calls happen inside async functions so the
    // react-hooks/set-state-in-effect rule is satisfied.
    useEffect(() => {
        let cancelled = false;

        const loadEngrams = async () => {
            if (!sessionId) {
                setEngrams(new Map());
                return;
            }
            setEngrams(new Map());
            try {
                const res = await fetch(`/api/v2/engrams/?sessions=${sessionId}`);
                if (!res.ok || cancelled) return;
                const list: TalosEngramData[] = await res.json();
                if (cancelled) return;
                const next = new Map<string, TalosEngramData>();
                list.forEach(e => next.set(e.id, e));
                setEngrams(next);
            } catch (err) {
                console.error('Engram fetch failed:', err);
            }
        };

        // Conclusion cold-start — 404 means the session isn't concluded
        // yet; we render nothing and let the dendrite deliver the node
        // when mcp_done writes it.
        const loadConclusion = async () => {
            if (!sessionId) {
                setConclusion(null);
                return;
            }
            setConclusion(null);
            try {
                const res = await fetch(
                    `/api/v2/reasoning_sessions/${sessionId}/conclusion/`
                );
                if (cancelled) return;
                if (res.status === 404) return;
                if (!res.ok) return;
                const data: SessionConclusionData = await res.json();
                if (cancelled) return;
                setConclusion(data);
            } catch (err) {
                console.error('Conclusion fetch failed:', err);
            }
        };

        const resetInFlight = async () => {
            setInFlightTurns(new Map());
        };

        loadEngrams();
        loadConclusion();
        resetInFlight();
        return () => {
            cancelled = true;
            if (engramRefetchTimerRef.current) {
                clearTimeout(engramRefetchTimerRef.current);
                engramRefetchTimerRef.current = null;
            }
        };
    }, [sessionId]);

    // Schedule a debounced engram refetch when a digest brings an
    // engram_id we haven't rendered yet.
    useEffect(() => {
        if (!digestEvent || !sessionId) return;
        const vesicle = digestEvent.vesicle as { session_id?: string; engram_ids?: string[] } | undefined;
        if (!vesicle || vesicle.session_id !== sessionId) return;
        const incoming = vesicle.engram_ids || [];
        const hasUnseen = incoming.some(id => !engrams.has(id));
        if (!hasUnseen) return;

        if (engramRefetchTimerRef.current) {
            clearTimeout(engramRefetchTimerRef.current);
        }
        engramRefetchTimerRef.current = setTimeout(async () => {
            engramRefetchTimerRef.current = null;
            try {
                const res = await fetch(`/api/v2/engrams/?sessions=${sessionId}`);
                if (!res.ok) return;
                const list: TalosEngramData[] = await res.json();
                const next = new Map<string, TalosEngramData>();
                list.forEach(e => next.set(e.id, e));
                setEngrams(next);
            } catch (err) {
                console.error('Engram refetch failed:', err);
            }
        }, ENGRAM_REFETCH_DEBOUNCE_MS);
    }, [digestEvent, sessionId, engrams]);

    // Live push: SessionConclusion vesicle lands when mcp_done writes
    // the conclusion row. Same session-id filter as the digest stream.
    useEffect(() => {
        if (!conclusionEvent || !sessionId) return;
        const vesicle = conclusionEvent.vesicle as SessionConclusionData | undefined;
        if (!vesicle || vesicle.session_id !== sessionId) return;
        const apply = async () => {
            setConclusion(vesicle);
        };
        apply();
    }, [conclusionEvent, sessionId]);

    // In-flight turn signal: broadcast by frontal_lobe/signals.py when
    // a ReasoningTurn is created/saved without a model_usage_record.
    // Keyed on dendrite_id=session_id so useDendrite filters for us.
    useEffect(() => {
        if (!turnEvent || !sessionId) return;
        const vesicle = turnEvent.vesicle as InFlightTurn & { session_id?: string } | undefined;
        if (!vesicle || !vesicle.turn_id || vesicle.session_id !== sessionId) return;
        const apply = async () => {
            setInFlightTurns(prev => {
                const next = new Map(prev);
                next.set(vesicle.turn_id, {
                    turn_id: vesicle.turn_id,
                    turn_number: vesicle.turn_number,
                    status_name: vesicle.status_name,
                    created: vesicle.created,
                });
                return next;
            });
        };
        apply();
    }, [turnEvent, sessionId]);

    // Drop ghost placeholders once the real digest arrives for that turn.
    useEffect(() => {
        if (inFlightTurns.size === 0) return;
        const digestIds = new Set(digests.map(d => d.turn_id));
        let shouldPrune = false;
        inFlightTurns.forEach((_, turnId) => {
            if (digestIds.has(turnId)) shouldPrune = true;
        });
        if (!shouldPrune) return;
        const apply = async () => {
            setInFlightTurns(prev => {
                const next = new Map<string, InFlightTurn>();
                prev.forEach((val, key) => {
                    if (!digestIds.has(key)) next.set(key, val);
                });
                return next;
            });
        };
        apply();
    }, [digests, inFlightTurns]);

    // Derive nodes/links from digests + engrams + conclusion + in-flight.
    // Pure computation over state, so it belongs in useMemo rather than
    // a setState-in-effect (which the lint rule forbids).
    const graphData = useMemo<{ nodes: GraphNode[], links: GraphLink[] }>(() => {
        const meanTokens = digests.length
            ? digests.reduce((s, d) => s + (d.tokens_out || 0), 0) / digests.length
            : 0;

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const digestTurnIds = new Set<string>();

        digests.forEach((d, index) => {
            const tId = `turn-${d.turn_id}`;
            digestTurnIds.add(d.turn_id);
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

        // Ghost in-flight turn(s) — skip any whose digest already landed.
        const inFlightSorted = Array.from(inFlightTurns.values())
            .filter(t => !digestTurnIds.has(t.turn_id))
            .sort((a, b) => a.turn_number - b.turn_number);
        inFlightSorted.forEach((t, idx) => {
            const ghostId = `${IN_FLIGHT_PREFIX}${t.turn_id}`;
            nodes.push({
                id: ghostId,
                type: 'turn',
                label: `Turn ${t.turn_number}`,
                status_name: t.status_name || 'Active',
                sizeRatio: 1,
                turn_id: t.turn_id,
                session_id: sessionId,
                turn_number: t.turn_number,
                created: t.created,
                in_flight: true,
            });
            // Chain ghost after the last real turn (or the prior ghost).
            if (idx === 0 && digests.length > 0) {
                const last = digests[digests.length - 1];
                links.push({
                    source: `turn-${last.turn_id}`,
                    target: ghostId,
                    type: 'sequence',
                });
            } else if (idx > 0) {
                const prev = inFlightSorted[idx - 1];
                links.push({
                    source: `${IN_FLIGHT_PREFIX}${prev.turn_id}`,
                    target: ghostId,
                    type: 'sequence',
                });
            }
        });

        // Conclusion node: one octahedron per session, hung off the
        // current last turn by a 'sequence' link. Link re-anchors on
        // every rebuild so it tracks late-arriving turns.
        if (conclusion) {
            const cId = `conclusion-${conclusion.id}`;
            nodes.push({
                ...(conclusion as unknown as Record<string, unknown>),
                id: cId,
                type: 'conclusion',
                label: 'Final Report',
                status_name: conclusion.status_name,
            });
            if (digests.length > 0) {
                const last = digests[digests.length - 1];
                links.push({
                    source: `turn-${last.turn_id}`,
                    target: cId,
                    type: 'sequence',
                });
            }
        }

        // Engram layer: one octahedron per engram linked to this session,
        // with a 'memory' link to each source turn already rendered.
        engrams.forEach((engram) => {
            const eId = `engram-${engram.id}`;
            nodes.push({
                ...engram,
                id: eId,
                type: 'engram',
                label: engram.name,
            });
            (engram.source_turns || []).forEach((turnId) => {
                if (digestTurnIds.has(turnId)) {
                    links.push({
                        source: `turn-${turnId}`,
                        target: eId,
                        type: 'memory',
                    });
                }
            });
        });

        // Clear the mesh registries in lockstep with the graph rebuild.
        // ForceGraph3D repopulates them via nodeThreeObject as it
        // renders the new graph; without the clear, stale meshes would
        // accumulate across rebuilds and keep receiving scale updates
        // in the animate loop.
        // eslint-disable-next-line react-hooks/refs
        activeMeshesRef.current = [];
        // eslint-disable-next-line react-hooks/refs
        inFlightMeshesRef.current = new Map();
        return { nodes, links };
    }, [digests, engrams, conclusion, inFlightTurns, sessionId]);

    // Push cortex stats to the parent whenever our input state changes.
    // onStatsUpdate is a setState on the parent; wrapping in async
    // satisfies the set-state-in-effect rule.
    useEffect(() => {
        const publish = async () => {
            const latest = digests[digests.length - 1];
            const liveGhosts = Array.from(inFlightTurns.values())
                .filter(t => !digests.some(d => d.turn_id === t.turn_id));
            const inFlightCount = liveGhosts.length;
            const statusOverride = inFlightCount > 0 ? 'Active' : (latest?.status_name || 'Unknown');
            const thoughtOverride = inFlightCount > 0 ? 'Thinking...' : (latest?.excerpt || 'Awaiting cortex synchronization...');
            onStatsUpdate({
                level: 1,
                focus: `${digests.length} / ?`,
                xp: digests.reduce((s, d) => s + (d.tokens_out || 0), 0),
                status: statusOverride,
                latestThought: thoughtOverride,
            });
        };
        publish();
    }, [digests, inFlightTurns, onStatsUpdate]);

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

            // In-flight ghosts: grow with elapsed time, layered on top of
            // the active-pulse scale so they still breathe.
            inFlightMeshesRef.current.forEach((mesh, ghostId) => {
                const ghost = inFlightTurns.get(ghostId);
                if (!mesh || !ghost) return;
                const createdMs = Date.parse(ghost.created);
                const elapsedSec = isNaN(createdMs)
                    ? 0
                    : Math.max(0, (Date.now() - createdMs) / 1000);
                const growth = 1 + Math.min(elapsedSec / IN_FLIGHT_GROWTH_SECONDS, IN_FLIGHT_GROWTH_CAP - 1);
                const combined = growth * scale;
                mesh.scale.set(combined, combined, combined);
                if (mesh.material instanceof THREE.MeshPhongMaterial) {
                    mesh.material.emissiveIntensity = intensity;
                }
            });
            frameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(frameId);
    }, [inFlightTurns]);

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
        const isActive = TURN_ACTIVE_STATUSES.includes(node.status_name || '');
        const isInFlight = node.in_flight === true;

        if (node.type === 'turn') {
            const ratio = node.sizeRatio || 1;
            const baseRadius = 6 * ratio;
            geometry = new THREE.SphereGeometry(baseRadius, 32, 32);

            if (isInFlight) {
                // Yellow/amber ghost — visually distinct from completed turns.
                color = new THREE.Color('#facc15');
                emissiveIntensity = 1.0;
            } else {
                const t = Math.max(0, Math.min(1, (ratio - 0.5) / 2.0));
                const colorGreen = new THREE.Color('#4ade80');
                const colorOrange = new THREE.Color('#f99f1b');
                color = colorGreen.clone().lerp(colorOrange, t);
                if (isActive) emissiveIntensity = 1.0;
            }
        } else if (node.type === 'tool') {
            geometry = new THREE.BoxGeometry(6, 6, 6);
            color = '#ef4444';
        } else if (node.type === 'engram') {
            geometry = new THREE.OctahedronGeometry(5);
            color = '#a855f7';
        } else if (node.type === 'conclusion') {
            geometry = new THREE.OctahedronGeometry(10);
            color = '#4ade80';
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

        if (isInFlight && node.turn_id) {
            inFlightMeshesRef.current.set(node.turn_id as string, mesh);
        } else if (isActive && node.type === 'turn') {
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

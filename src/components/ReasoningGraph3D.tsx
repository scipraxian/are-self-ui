import "./ReasoningGraph3D.css";
import { memo, useRef, useCallback, useEffect, useMemo, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { useDendrite } from './SynapticCleft';
import { useSessionDigests } from '../hooks/useSessionDigests';
import {
    digestElapsedMs,
    elapsedToColor,
    elapsedToRatio,
    isInFlight,
} from '../utils/reasoningGraphHelpers';
import type {
    GraphLink,
    GraphNode,
    ReasoningToolCallSummary,
    SessionConclusionData,
    TalosEngramData,
} from "../types.ts";

// Scope: turns + their tool sub-nodes come from a single digest stream
// (via useSessionDigests). The backend broadcasts the digest twice per
// turn — once at turn-start (status='Active', empty excerpt and
// tool_calls_summary) and once at LLM completion (populated). Both
// broadcasts share turn_id so they upsert into one map. We render
// in-flight turns with a live elapsed timer (sourced from
// `Date.now() - digest.created`); completed turns use `digest.delta`
// from the wire. Engrams piggyback a thin dedicated fetch
// (/api/v2/engrams/?sessions=X) on mount and get refreshed when a
// digest brings an engram_id we haven't seen before. Session conclusion
// has its own dendrite.
const MAX_THOUGHT_LENGTH = 140;
const ENGRAM_REFETCH_DEBOUNCE_MS = 250;

const clipExcerpt = (text: string | undefined): string => {
    if (!text) return '';
    if (text.length > MAX_THOUGHT_LENGTH) {
        return `${text.slice(0, MAX_THOUGHT_LENGTH - 1)}…`;
    }
    return text;
};

const formatElapsedShort = (ms: number): string => {
    if (!Number.isFinite(ms) || ms <= 0) return '?';
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    const min = Math.floor(sec / 60);
    const rem = sec - min * 60;
    return `${min}m${rem.toFixed(0)}s`;
};

const generateHoverCardLines = (node: GraphNode): string[] => {
    const lines: string[] = [];

    if (node.type === 'turn') {
        const status = node.status_name || 'Unknown';
        const modelName = node.model_name || 'Unknown';
        const elapsedMs = node.elapsed_ms ?? 0;
        const inFlight = isInFlight(node.status_name);
        const durationLabel = inFlight
            ? 'in flight'
            : (elapsedMs > 0 ? formatElapsedShort(elapsedMs) : '?');
        const tokensOut = node.tokens_out ?? 0;
        lines.push(`Turn ${node.turn_number ?? '?'} · ${durationLabel} · ${status}`);
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
}

export const ReasoningGraph3D = memo(function ReasoningGraph3D({
    sessionId,
    onNodeSelect,
    onStatsUpdate,
}: ReasoningGraphProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fgRef = useRef<any>(null);
    const [engrams, setEngrams] = useState<Map<string, TalosEngramData>>(new Map());
    const [conclusion, setConclusion] = useState<SessionConclusionData | null>(null);
    const engramRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Map<turn_id, mesh> for in-flight turns — animate loop walks this
    // map and re-sizes/recolors using current elapsed (Date.now() -
    // digest.created). Completed turns are NOT tracked: their final
    // size/color is baked into the geometry by renderNode and stays
    // static. Once the second digest broadcast lands and the turn flips
    // out of the in-flight set, the next graph rebuild re-creates the
    // mesh as a static one.
    const inFlightMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
    const meanElapsedMsRef = useRef<number>(0);
    const [bubblePositions, setBubblePositions] = useState<Record<string, BubblePosition>>({});
    const [hoverCard, setHoverCard] = useState<HoverCard | null>(null);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { digests } = useSessionDigests(sessionId);
    const digestEvent = useDendrite('ReasoningTurnDigest', null);
    const conclusionEvent = useDendrite('SessionConclusion', null);

    // Reset per-session stores + cold-fetch engrams and conclusion. F5
    // mid-flight reproduces the live-socket view because graph_data
    // already returns the in-flight digest on the same wire — that's
    // covered by useSessionDigests; we just need engrams + conclusion.
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

        loadEngrams();
        loadConclusion();
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

    // Derive nodes/links from digests + engrams + conclusion. Pure
    // computation over state, so it belongs in useMemo rather than
    // a setState-in-effect (which the lint rule forbids).
    const graphData = useMemo<{ nodes: GraphNode[], links: GraphLink[] }>(() => {
        // Mean of completed-turn elapsed drives the size axis. In-flight
        // digests don't have a final elapsed yet — they're sized live
        // off the animate loop using `Date.now() - digest.created`,
        // normalized to this same mean.
        const elapsedSamples = digests
            .filter(d => !isInFlight(d.status_name))
            .map(digestElapsedMs)
            .filter(ms => ms > 0);
        const meanElapsedMs = elapsedSamples.length
            ? elapsedSamples.reduce((s, v) => s + v, 0) / elapsedSamples.length
            : 0;
        meanElapsedMsRef.current = meanElapsedMs;

        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const digestTurnIds = new Set<string>();

        digests.forEach((d, index) => {
            const tId = `turn-${d.turn_id}`;
            digestTurnIds.add(d.turn_id);
            const inFlight = isInFlight(d.status_name);
            const elapsedMs = inFlight ? 0 : digestElapsedMs(d);
            const sizeRatio = inFlight ? 1 : elapsedToRatio(elapsedMs, meanElapsedMs);
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
                delta: d.delta,
                elapsed_ms: elapsedMs,
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

        // Clear the in-flight mesh registry in lockstep with the graph
        // rebuild. ForceGraph3D repopulates it via nodeThreeObject as it
        // renders the new graph; without the clear, stale meshes would
        // accumulate across rebuilds and keep receiving scale updates
        // in the animate loop.
        // eslint-disable-next-line react-hooks/refs
        inFlightMeshesRef.current = new Map();
        return { nodes, links };
    }, [digests, engrams, conclusion]);

    // Quick lookup of the live digest for a given turn_id — used by
    // the animate loop to source `created` for elapsed math.
    const digestByTurnId = useMemo(() => {
        const map = new Map<string, typeof digests[number]>();
        digests.forEach(d => map.set(d.turn_id, d));
        return map;
    }, [digests]);

    // Push cortex stats to the parent whenever our input state changes.
    useEffect(() => {
        const publish = async () => {
            const latest = digests[digests.length - 1];
            const inFlightCount = digests.filter(d => isInFlight(d.status_name)).length;
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
    }, [digests, onStatsUpdate]);

    // Skip the RAF entirely when nothing is in-flight: completed turns
    // are static, so a session with no live turns should sit still.
    const hasInFlightTurns = useMemo(
        () => digests.some(d => isInFlight(d.status_name)),
        [digests],
    );

    useEffect(() => {
        if (!hasInFlightTurns) return;
        let frameId: number;
        const animate = () => {
            const time = Date.now() * 0.003;
            const scale = 1.0 + Math.abs(Math.sin(time)) * 0.3;
            const intensity = 0.5 + Math.abs(Math.sin(time));

            // In-flight meshes: size + color ride live elapsed (Date.now()
            // - digest.created), normalized to the running mean of
            // completed turns. Once the second digest broadcast lands and
            // status flips out of the in-flight set, the next graph
            // rebuild re-creates the mesh as a static one (sized off
            // delta in renderNode) and this loop stops touching it.
            const meanMs = meanElapsedMsRef.current;
            inFlightMeshesRef.current.forEach((mesh, turnId) => {
                const digest = digestByTurnId.get(turnId);
                if (!mesh || !digest || !digest.created) return;
                const createdMs = Date.parse(digest.created);
                const elapsedMs = isNaN(createdMs) ? 0 : Math.max(0, Date.now() - createdMs);
                const ratio = meanMs > 0
                    ? elapsedToRatio(elapsedMs, meanMs)
                    : 1; // first turn of a session — no mean yet, default 1
                const baseScale = ratio * scale;
                mesh.scale.set(baseScale, baseScale, baseScale);
                if (mesh.material instanceof THREE.MeshPhongMaterial) {
                    const color = elapsedToColor(ratio);
                    mesh.material.color.copy(color);
                    mesh.material.emissive.copy(color);
                    mesh.material.emissiveIntensity = intensity;
                }
            });
            frameId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(frameId);
    }, [digestByTurnId, hasInFlightTurns]);

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

        if (node.type === 'turn') {
            const inFlight = isInFlight(node.status_name);
            const ratio = node.sizeRatio || 1;
            const baseRadius = 6 * (inFlight ? 1 : ratio);
            geometry = new THREE.SphereGeometry(baseRadius, 32, 32);
            color = elapsedToColor(inFlight ? 1 : ratio);
            if (inFlight) emissiveIntensity = 1.0;
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

        if (node.type === 'turn' && node.turn_id && isInFlight(node.status_name)) {
            inFlightMeshesRef.current.set(node.turn_id, mesh);
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

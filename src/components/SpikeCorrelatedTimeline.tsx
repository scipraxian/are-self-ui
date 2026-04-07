import './SpikeCorrelatedTimeline.css';
import { useEffect, useRef, useState } from 'react';

import { apiFetch } from '../api';
import { useDendrite } from './SynapticCleft';
import type { MergeResponse, MergeRow } from '../types';

interface SpikeCorrelatedTimelineProps {
    spikeIds: string[];
}

const DEBOUNCE_MS = 500;
const FLUSH_THRESHOLD = 50;

export function SpikeCorrelatedTimeline({ spikeIds }: SpikeCorrelatedTimelineProps) {
    const [labels, setLabels] = useState<string[]>([]);
    const [rows, setRows] = useState<MergeRow[]>([]);
    const [cursors, setCursors] = useState<Record<string, number>>({});
    const [anyActive, setAnyActive] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);

    const bodyRef = useRef<HTMLDivElement>(null);
    const chunkBufferRef = useRef<Record<string, string[]>>({});
    const cursorsRef = useRef<Record<string, number>>({});
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFetchingDeltaRef = useRef(false);

    // Keep cursorsRef in sync
    useEffect(() => {
        cursorsRef.current = cursors;
    }, [cursors]);

    // Subscribe to Glutamate events for live spike data
    const spikeEvent = useDendrite('Spike', null);

    // Build query string from spike IDs
    const mergeParams = spikeIds
        .map((id, i) => `s${i + 1}=${encodeURIComponent(id)}`)
        .join('&');

    // Initial full fetch
    useEffect(() => {
        if (spikeIds.length === 0) return;
        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            try {
                const res = await apiFetch(`/api/v2/spike-logs/merge/?${mergeParams}`);
                if (!res.ok || cancelled) return;
                const data: MergeResponse = await res.json();
                if (cancelled) return;
                setLabels(data.labels);
                setRows(data.rows);
                setCursors(data.cursors);
                setAnyActive(data.any_active);
            } catch (err) {
                console.error('Merge fetch failed', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [mergeParams, spikeIds.length]);

    // Flush accumulated chunks via delta merge endpoint
    const flushDelta = async () => {
        const buffer = chunkBufferRef.current;
        const hasChunks = Object.values(buffer).some(arr => arr.length > 0);
        if (!hasChunks || isFetchingDeltaRef.current) return;

        // Snapshot and clear buffer
        const payload = { ...buffer };
        chunkBufferRef.current = {};
        isFetchingDeltaRef.current = true;

        try {
            const res = await apiFetch('/api/v2/spike-logs/merge-delta/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chunks: payload,
                    cursors: cursorsRef.current,
                    spike_ids: spikeIds,
                }),
            });

            if (!res.ok) {
                // Fallback: full re-fetch
                const fallback = await apiFetch(`/api/v2/spike-logs/merge/?${mergeParams}`);
                if (fallback.ok) {
                    const data: MergeResponse = await fallback.json();
                    setLabels(data.labels);
                    setRows(data.rows);
                    setCursors(data.cursors);
                    setAnyActive(data.any_active);
                }
                return;
            }

            const delta: MergeResponse = await res.json();
            if (delta.rows.length > 0) {
                setRows(prev => [...prev, ...delta.rows]);
            }
            setCursors(delta.cursors);
            setAnyActive(delta.any_active);
        } catch (err) {
            console.error('Delta merge failed, falling back to full fetch', err);
            try {
                const fallback = await apiFetch(`/api/v2/spikes/merge/?${mergeParams}`);
                if (fallback.ok) {
                    const data: MergeResponse = await fallback.json();
                    setLabels(data.labels);
                    setRows(data.rows);
                    setCursors(data.cursors);
                    setAnyActive(data.any_active);
                }
            } catch {
                // Give up silently
            }
        } finally {
            isFetchingDeltaRef.current = false;
        }
    };

    // Handle Glutamate messages from dendrite
    useEffect(() => {
        if (!spikeEvent) return;
        const vesicle = spikeEvent.vesicle;
        if (spikeEvent.molecule !== 'Glutamate' || !vesicle?.message) return;

        const dendriteId = spikeEvent.dendrite_id;
        if (!dendriteId || !spikeIds.includes(dendriteId)) return;

        // Accumulate chunk
        if (!chunkBufferRef.current[dendriteId]) {
            chunkBufferRef.current[dendriteId] = [];
        }
        chunkBufferRef.current[dendriteId].push(vesicle.message as string);

        // Check total chunk count
        const totalChunks = Object.values(chunkBufferRef.current)
            .reduce((sum, arr) => sum + arr.length, 0);

        if (totalChunks >= FLUSH_THRESHOLD) {
            // Immediate flush
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = null;
            }
            flushDelta();
        } else {
            // Debounce
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            debounceTimerRef.current = setTimeout(() => {
                debounceTimerRef.current = null;
                flushDelta();
            }, DEBOUNCE_MS);
        }
    }, [spikeEvent, spikeIds]);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    // Auto-scroll to bottom when new rows arrive
    useEffect(() => {
        if (autoScroll && bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [rows.length, autoScroll]);

    if (isLoading) {
        return <div className="correlated-timeline-loading">Loading correlated timeline...</div>;
    }

    if (rows.length === 0) {
        return <div className="correlated-timeline-empty">No log entries to display</div>;
    }

    // Distribute labels: left half before timestamp, right half after
    const midpoint = Math.ceil(labels.length / 2);
    const leftLabels = labels.slice(0, midpoint);
    const rightLabels = labels.slice(midpoint);

    return (
        <div className="correlated-timeline">
            <div className="correlated-timeline-toolbar">
                <div className="correlated-timeline-status">
                    <span className={`correlated-timeline-status-dot ${anyActive ? 'correlated-timeline-status-dot--active' : ''}`} />
                    <span>{rows.length} entries</span>
                </div>
                <button
                    className={`correlated-timeline-autoscroll ${autoScroll ? 'correlated-timeline-autoscroll--active' : ''}`}
                    onClick={() => setAutoScroll(prev => !prev)}
                >
                    {autoScroll ? 'AUTO-SCROLL ON' : 'AUTO-SCROLL OFF'}
                </button>
            </div>
            <div className="correlated-timeline-body" ref={bodyRef}>
                <table className="correlated-timeline-table">
                    <thead>
                        <tr>
                            {leftLabels.map(label => (
                                <th key={`l-${label}`}>{label}</th>
                            ))}
                            <th className="correlated-timeline-col-ts">Time</th>
                            {rightLabels.map(label => (
                                <th key={`r-${label}`}>{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, ri) => {
                            const filledCount = labels.filter(l => row.columns[l]).length;
                            const isMerged = filledCount > 1;

                            return (
                                <tr
                                    key={ri}
                                    className={isMerged ? 'correlated-timeline-row--merged' : ''}
                                >
                                    {leftLabels.map((label, ci) => (
                                        <td
                                            key={`l-${ci}`}
                                            className={`correlated-timeline-tint-${ci}`}
                                        >
                                            {row.columns[label] || ''}
                                        </td>
                                    ))}
                                    <td className="correlated-timeline-cell-ts">
                                        {row.timestamp}
                                    </td>
                                    {rightLabels.map((label, ci) => (
                                        <td
                                            key={`r-${ci}`}
                                            className={`correlated-timeline-tint-${midpoint + ci}`}
                                        >
                                            {row.columns[label] || ''}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

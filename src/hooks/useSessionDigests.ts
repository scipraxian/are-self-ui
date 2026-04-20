import { useEffect, useState } from 'react';
import { useDendrite } from '../components/SynapticCleft';
import type { ReasoningTurnDigest } from '../types';

// Shared reader for the per-session digest stream. Pattern:
//   1. Cold-fetch the pull-fallback endpoint on sessionId change.
//   2. Subscribe to the 'ReasoningTurnDigest' Acetylcholine receptor
//      and upsert incoming vesicles (filtered by session_id).
//   3. Return a sorted list; consumers derive everything else from it.
//
// Keeping this logic in one place removes the duplicated fetch+upsert
// block previously living in ReasoningGraph3D and ReasoningInspector,
// and guarantees both views see the same digest ordering.
export interface UseSessionDigestsResult {
    digests: ReasoningTurnDigest[];
}

export function useSessionDigests(
    sessionId: string | null | undefined,
): UseSessionDigestsResult {
    const [digests, setDigests] = useState<ReasoningTurnDigest[]>([]);
    const digestEvent = useDendrite('ReasoningTurnDigest', null);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!sessionId) {
                setDigests([]);
                return;
            }
            try {
                const res = await fetch(
                    `/api/v2/reasoning_sessions/${sessionId}/graph_data/?since_turn_number=-1`,
                );
                if (!res.ok || cancelled) return;
                const list: ReasoningTurnDigest[] = await res.json();
                if (cancelled) return;
                setDigests(list.slice().sort((a, b) => a.turn_number - b.turn_number));
            } catch (err) {
                console.error('Digest cold-fetch failed', err);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    useEffect(() => {
        if (!digestEvent || !sessionId) return;
        const vesicle = digestEvent.vesicle as ReasoningTurnDigest | undefined;
        if (!vesicle || vesicle.session_id !== sessionId) return;

        const apply = async () => {
            setDigests((prev) => {
                const idx = prev.findIndex((d) => d.turn_id === vesicle.turn_id);
                if (idx === -1) {
                    return [...prev, vesicle].sort(
                        (a, b) => a.turn_number - b.turn_number,
                    );
                }
                const next = prev.slice();
                next[idx] = vesicle;
                return next;
            });
        };
        apply();
    }, [digestEvent, sessionId]);

    return { digests };
}

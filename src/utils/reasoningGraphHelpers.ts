// Pure helpers for ReasoningGraph3D — extracted so they can be
// unit-tested without mounting the ForceGraph3D + WebSocket stack.
import * as THREE from 'three';
import type { ReasoningTurnDigest } from '../types';

export const SIZE_MIN = 0.3;
export const SIZE_MAX = 4.0;

// Status names that count as "the turn hasn't finished its LLM round-trip
// yet" — mirrors the backend's TURN_IN_FLIGHT_STATUS_IDS. The set is
// kept here so render code, helpers, and tests share one definition.
export const IN_FLIGHT_STATUS_NAMES: ReadonlySet<string> = new Set([
    'Pending',
    'Active',
    'Paused',
    'Attention Required',
]);

export function isInFlight(statusName: string | null | undefined): boolean {
    return !!statusName && IN_FLIGHT_STATUS_NAMES.has(statusName);
}

// Parse the Django DurationField wire format into milliseconds.
// DRF default for `DurationField` is "[D ]HH:MM:SS[.ffffff]" (e.g.
// "0:00:01.234567" or "1 02:30:00"). Falls back to numeric strings
// (seconds) and bare numbers (also seconds). Returns 0 if unparseable.
export function parseDelta(delta: string | null | undefined): number {
    if (delta == null) return 0;
    if (typeof delta === 'number') {
        return delta > 0 ? delta * 1000 : 0;
    }
    if (typeof delta !== 'string' || delta === '') return 0;

    const numeric = Number(delta);
    if (Number.isFinite(numeric) && numeric > 0) {
        return numeric * 1000;
    }

    // "[D ]H:MM:SS[.ffffff]"
    const match = delta.match(
        /^(?:(\d+)\s+)?(\d+):(\d+):(\d+(?:\.\d+)?)$/,
    );
    if (!match) return 0;
    const days = match[1] ? Number(match[1]) : 0;
    const hours = Number(match[2]);
    const minutes = Number(match[3]);
    const seconds = Number(match[4]);
    return (
        ((days * 24 + hours) * 60 + minutes) * 60 + seconds
    ) * 1000;
}

// Pull elapsed-ms off a digest. For completed turns, use the wire
// `delta` if present, then fall back to `(modified - created)`. Returns
// 0 if no signal is available — readers should treat 0 as "no elapsed
// data, lay out at neutral size."
export function digestElapsedMs(digest: ReasoningTurnDigest): number {
    const fromDelta = parseDelta(digest.delta);
    if (fromDelta > 0) return fromDelta;
    if (digest.created && digest.modified) {
        const start = Date.parse(digest.created);
        const end = Date.parse(digest.modified);
        if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
            return end - start;
        }
    }
    return 0;
}

// Continuous HSL gradient: green (fastest) → orange (slowest).
export function elapsedToColor(ratio: number): THREE.Color {
    const t = Math.max(0, Math.min(1, (ratio - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)));
    const hue = 130 - t * 100;
    const color = new THREE.Color();
    color.setHSL(hue / 360, 0.7, 0.55);
    return color;
}

// Same clamp as the pre-April-18 visual.
export function elapsedToRatio(elapsedMs: number, meanMs: number): number {
    if (!meanMs || meanMs <= 0 || !elapsedMs) return 1;
    const raw = elapsedMs / meanMs;
    return Math.max(SIZE_MIN, Math.min(raw, SIZE_MAX));
}

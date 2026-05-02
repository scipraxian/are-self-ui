import { memo, useEffect, useRef } from 'react';

/**
 * Vector-driven abstract render — Kandinsky-evocative.
 *
 * Takes a unit-normalized vector (typically 768-d, but accepts any
 * length) and paints a small set of geometric shapes whose positions,
 * sizes, and colors are derived deterministically from chunks of the
 * vector. The same vector renders the same image; as the vector shifts
 * (engrams accumulating on a disc), the composition shifts too.
 *
 * The algorithm is intentionally simple — we are signaling semantic
 * state, not generating fine art. Six shapes (three circles + three
 * lines + a triangle) drawn in additive HSL colors over a near-black
 * field. Coordinates and radii are pulled from non-overlapping windows
 * of the vector so each "feature" of the embedding contributes to a
 * different visual element.
 */

interface KandinskyAbstractProps {
    /** Unit-length vector. Any length is accepted; null means render nothing. */
    vector: number[] | null | undefined;
    /** Square edge in CSS pixels. */
    size: number;
    /** Optional class name for outer container. */
    className?: string;
    /** Optional render alpha multiplier for blending behind larger tiles. */
    opacity?: number;
}

function chunkAvg(vector: number[], start: number, count: number): number {
    if (count <= 0) return 0;
    let sum = 0;
    for (let i = 0; i < count; i++) {
        sum += vector[(start + i) % vector.length] ?? 0;
    }
    return sum / count;
}

function unit01(value: number): number {
    // Map a typical normalized component (~roughly bounded by 1/sqrt(N))
    // to [0, 1] in a way that survives both small (1/sqrt(768) ≈ 0.036)
    // and large components without saturating to 0/1 the way a raw
    // (value + 1) / 2 mapping would for unit vectors.
    return Math.max(0, Math.min(1, 0.5 + Math.tanh(value * 6) * 0.5));
}

function KandinskyAbstractInner({
    vector,
    size,
    className,
    opacity = 1,
}: KandinskyAbstractProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(size * dpr);
        canvas.height = Math.round(size * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, size, size);

        // Background — deep neutral so colored shapes pop without screaming.
        const bg = ctx.createLinearGradient(0, 0, size, size);
        bg.addColorStop(0, 'rgba(12, 16, 28, 1)');
        bg.addColorStop(1, 'rgba(20, 12, 28, 1)');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, size, size);

        if (!vector || vector.length === 0) return;

        ctx.globalAlpha = opacity;
        ctx.globalCompositeOperation = 'lighter';

        const chunkSize = Math.max(1, Math.floor(vector.length / 16));

        // Three circles. Each pulls (x, y, r, hue) from four chunks.
        for (let i = 0; i < 3; i++) {
            const base = i * chunkSize * 4;
            const x = unit01(chunkAvg(vector, base, chunkSize)) * size;
            const y = unit01(chunkAvg(vector, base + chunkSize, chunkSize)) * size;
            const r = (0.12 + 0.22 * unit01(chunkAvg(vector, base + chunkSize * 2, chunkSize))) * size;
            const hue = (unit01(chunkAvg(vector, base + chunkSize * 3, chunkSize)) * 360 + i * 73) % 360;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, `hsla(${hue}, 80%, 65%, 0.85)`);
            grad.addColorStop(0.7, `hsla(${hue}, 70%, 45%, 0.35)`);
            grad.addColorStop(1, `hsla(${hue}, 60%, 30%, 0)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }

        // Three diagonal lines. Each pulls (x1, y1, x2, y2, hue) from chunks.
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const base = (12 + i * 4) * chunkSize;
            const x1 = unit01(chunkAvg(vector, base, chunkSize)) * size;
            const y1 = unit01(chunkAvg(vector, base + chunkSize, chunkSize)) * size;
            const x2 = unit01(chunkAvg(vector, base + chunkSize * 2, chunkSize)) * size;
            const y2 = unit01(chunkAvg(vector, base + chunkSize * 3, chunkSize)) * size;
            const hue = (i * 137 + unit01(chunkAvg(vector, base, chunkSize * 4)) * 360) % 360;
            ctx.strokeStyle = `hsla(${hue}, 70%, 70%, 0.85)`;
            ctx.lineWidth = Math.max(1, size * 0.04);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // One triangle anchored on the last few chunks.
        const tBase = vector.length - chunkSize * 4;
        const ax = unit01(chunkAvg(vector, tBase, chunkSize)) * size;
        const ay = unit01(chunkAvg(vector, tBase + chunkSize, chunkSize)) * size;
        const bx = unit01(chunkAvg(vector, tBase + chunkSize * 2, chunkSize)) * size;
        const by = unit01(chunkAvg(vector, tBase + chunkSize * 3, chunkSize)) * size;
        const cx = (ax + bx) * 0.5 + (size * 0.18);
        const cy = (ay + by) * 0.5 - (size * 0.18);
        const tHue = (unit01(chunkAvg(vector, tBase, chunkSize * 4)) * 360 + 200) % 360;
        ctx.fillStyle = `hsla(${tHue}, 75%, 60%, 0.55)`;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
    }, [vector, size, opacity]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{ width: size, height: size, display: 'block' }}
            aria-hidden="true"
        />
    );
}

// Vector arrays get a new reference on every parent refetch even when
// their contents haven't changed. Without a content-aware comparator the
// canvas redraws on every dendrite tick — the "blink" symptom on the
// Identity Ledger. Compare element-by-element so we only repaint on
// genuine semantic shifts.
export const KandinskyAbstract = memo(KandinskyAbstractInner, (prev, next) => {
    if (prev.size !== next.size) return false;
    if (prev.opacity !== next.opacity) return false;
    if (prev.className !== next.className) return false;
    const a = prev.vector;
    const b = next.vector;
    if (a === b) return true;
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
});

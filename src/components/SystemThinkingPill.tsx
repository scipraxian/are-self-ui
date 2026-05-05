import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDendrite } from './SynapticCleft';
import type { ReasoningTurnDigest } from '../types';
import './SystemThinkingPill.css';

const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
    'Completed',
    'Error',
    'Maxed Out',
    'Stopped',
]);

// Timing constants. STALL forces idle if the digest stream goes silent
// without ever closing on a terminal status (covers worker crashes /
// websocket drops). DONE_GATE waits this long after a terminal digest
// before flipping to the green Done flash — if a fresh digest lands in
// the gap, the next turn started and we stay Working. DONE_DISPLAY is
// how long the green flash sits before fading to Idle.
const STALL_TIMEOUT_MS = 8000;
const DONE_GATE_MS = 3000;
const DONE_DISPLAY_MS = 3000;

type Mode = 'idle' | 'working' | 'done';

type TimerRef = ReturnType<typeof setTimeout> | null;

function formatElapsed(ms: number): string {
    if (!Number.isFinite(ms) || ms < 0) return '0s';
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
}

function clearTimer(holder: { current: TimerRef }) {
    if (holder.current) {
        clearTimeout(holder.current);
        holder.current = null;
    }
}

export function SystemThinkingPill() {
    const navigate = useNavigate();
    const digestEvent = useDendrite('ReasoningTurnDigest', null);

    const [mode, setMode] = useState<Mode>('idle');
    const [latestDigest, setLatestDigest] = useState<ReasoningTurnDigest | null>(null);
    // Wall-clock cursor used for elapsed math. Updated only inside
    // effects/timers so render stays pure.
    const [nowMs, setNowMs] = useState(0);

    // Per-session anchor for the "total elapsed" reading on the Done flash.
    // Reset whenever session_id changes or the pill returns to Idle.
    const [sessionStart, setSessionStart] = useState<
        { sessionId: string; startMs: number } | null
    >(null);

    const stallRef = useRef<TimerRef>(null);
    const toDoneRef = useRef<TimerRef>(null);
    const doneEndRef = useRef<TimerRef>(null);

    useEffect(() => {
        if (!digestEvent) return;
        const vesicle = digestEvent.vesicle as ReasoningTurnDigest | undefined;
        if (!vesicle || !vesicle.session_id) return;

        const apply = async () => {
            // Any new digest cancels a pending Done transition — activity
            // resumed before the gate elapsed.
            clearTimer(toDoneRef);
            clearTimer(doneEndRef);

            setSessionStart((prev) => {
                if (prev && prev.sessionId === vesicle.session_id) return prev;
                const parsed = vesicle.created ? Date.parse(vesicle.created) : NaN;
                return {
                    sessionId: vesicle.session_id,
                    startMs: Number.isFinite(parsed) ? parsed : Date.now(),
                };
            });

            setLatestDigest(vesicle);
            setMode('working');
            setNowMs(Date.now());

            clearTimer(stallRef);
            stallRef.current = setTimeout(() => {
                setMode('idle');
                setSessionStart(null);
            }, STALL_TIMEOUT_MS);

            if (TERMINAL_STATUSES.has(vesicle.status_name)) {
                toDoneRef.current = setTimeout(() => {
                    clearTimer(stallRef);
                    setMode('done');
                    doneEndRef.current = setTimeout(() => {
                        setMode('idle');
                        setSessionStart(null);
                    }, DONE_DISPLAY_MS);
                }, DONE_GATE_MS);
            }
        };

        apply();
    }, [digestEvent]);

    useEffect(() => {
        if (mode === 'idle') return;
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, [mode]);

    useEffect(() => {
        return () => {
            clearTimer(stallRef);
            clearTimer(toDoneRef);
            clearTimer(doneEndRef);
        };
    }, []);

    const handleClick = () => {
        if (!latestDigest) return;
        navigate(`/frontal/${latestDigest.session_id}`);
    };

    const showButton = mode !== 'idle' && latestDigest !== null;

    let content: React.ReactNode = null;
    if (showButton && latestDigest) {
        if (mode === 'working') {
            const startMs = latestDigest.created ? Date.parse(latestDigest.created) : NaN;
            const elapsedMs = Number.isFinite(startMs) && nowMs > 0 ? nowMs - startMs : 0;
            content = (
                <>
                    <span className="system-thinking-pill-model">
                        [{latestDigest.model_name || 'unknown'}]
                    </span>
                    <span className="system-thinking-pill-sep">·</span>
                    <span>turn {latestDigest.turn_number}</span>
                    <span className="system-thinking-pill-sep">·</span>
                    <span>{formatElapsed(elapsedMs)}</span>
                </>
            );
        } else {
            const totalMs = sessionStart && nowMs > 0
                ? nowMs - sessionStart.startMs
                : 0;
            content = (
                <>
                    <span>Done</span>
                    <span className="system-thinking-pill-sep">·</span>
                    <span>{latestDigest.turn_number} turns</span>
                    <span className="system-thinking-pill-sep">·</span>
                    <span>{formatElapsed(totalMs)}</span>
                </>
            );
        }
    }

    return (
        <div
            className={`system-thinking-pill-wrapper system-thinking-pill-wrapper--${mode}`}
            data-mode={mode}
        >
            {showButton && (
                <button
                    type="button"
                    className={`system-thinking-pill system-thinking-pill--${mode}`}
                    onClick={handleClick}
                    title={
                        latestDigest
                            ? `Open session ${latestDigest.session_id}`
                            : undefined
                    }
                >
                    {content}
                </button>
            )}
        </div>
    );
}

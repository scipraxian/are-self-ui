import { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

import { apiFetch } from '../api';
import { useRestartOverlay } from '../context/RestartOverlayProvider';
import './RestartOverlay.css';

/**
 * Time between health probes while the workers are bouncing. Picked to
 * be short enough to dismiss the overlay almost immediately once Daphne
 * is back, but not so tight it floods the socket as it comes up.
 */
const PROBE_INTERVAL_MS = 750;

/**
 * Once we've seen one ok we still wait a beat before dismissing — gives
 * other dendrite subscribers a chance to reconnect cleanly. Cheap.
 */
const SETTLE_DELAY_MS = 250;

export function RestartOverlay() {
    const { isRestarting, dismissRestart } = useRestartOverlay();
    const [statusLine, setStatusLine] = useState('Restarting workers…');
    const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

    useEffect(() => {
        if (!isRestarting) return;

        // Fresh probe loop per restart episode. setTimeout self-rescheduling
        // (no setInterval) per the project's no-polling-with-setInterval
        // convention. The cancel ref lets us bail mid-flight if the
        // overlay tears down.
        const handle = { cancelled: false };
        cancelRef.current = handle;

        let firstOkSeen = false;

        const probe = async () => {
            if (handle.cancelled) return;
            try {
                const res = await apiFetch('/api/v2/health/');
                if (handle.cancelled) return;
                if (res.ok) {
                    if (!firstOkSeen) {
                        firstOkSeen = true;
                        setStatusLine('Workers reconnected. Settling…');
                        setTimeout(() => {
                            if (!handle.cancelled) dismissRestart();
                        }, SETTLE_DELAY_MS);
                        return;
                    }
                } else {
                    setStatusLine(`Restarting workers… (probe ${res.status})`);
                }
            } catch {
                // Fetch will reject while Daphne is down — that's the
                // expected state. Keep probing.
                setStatusLine('Restarting workers…');
            }

            if (!handle.cancelled) {
                setTimeout(probe, PROBE_INTERVAL_MS);
            }
        };

        // Brief initial delay — the worker bounce hasn't fully started
        // the moment the response came back, and probing instantly tends
        // to catch the old process still answering.
        const startTimer = setTimeout(probe, PROBE_INTERVAL_MS);

        return () => {
            handle.cancelled = true;
            clearTimeout(startTimer);
        };
    }, [isRestarting, dismissRestart]);

    if (!isRestarting) return null;

    return (
        <div
            className="restart-overlay"
            role="alertdialog"
            aria-live="polite"
            aria-label="Workers restarting"
        >
            <div className="restart-overlay-card">
                <div className="restart-overlay-spinner">
                    <Activity size={32} className="restart-overlay-spinner-icon" />
                </div>
                <div className="restart-overlay-title">Restart imminent</div>
                <div className="restart-overlay-subtitle">{statusLine}</div>
                <div className="restart-overlay-hint">
                    Daphne and Celery are bouncing to pick up the new bundle
                    state. This usually takes a few seconds.
                </div>
            </div>
        </div>
    );
}

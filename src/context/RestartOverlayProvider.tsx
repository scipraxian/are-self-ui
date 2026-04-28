import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/**
 * Restart Overlay context.
 *
 * Any handler that gets a `restart_imminent: true` flag back from a
 * mutation (install / uninstall / catalog_install / genome PATCH) calls
 * `triggerRestart()` to raise the blocking overlay. The overlay polls
 * `GET /api/v2/health/` (unauthenticated, no DB hit) until it returns
 * 200 ok, then dismisses itself. Daphne and Celery bouncing is the
 * expected lifecycle here — no error, just a wait.
 */

interface RestartOverlayContextValue {
    isRestarting: boolean;
    triggerRestart: () => void;
    dismissRestart: () => void;
}

const RestartOverlayContext = createContext<RestartOverlayContextValue | null>(null);

export function useRestartOverlay(): RestartOverlayContextValue {
    const ctx = useContext(RestartOverlayContext);
    if (!ctx) {
        throw new Error('useRestartOverlay must be used inside <RestartOverlayProvider>');
    }
    return ctx;
}

/**
 * Lightweight helper for response bodies. Any mutation that may bounce
 * the workers wraps its `await res.json()` payload through this and
 * triggers the overlay if the flag is present. Cheap, dependency-free,
 * works with any payload shape.
 */
export function maybeFlagRestart(
    payload: unknown,
    trigger: () => void,
): void {
    if (
        payload
        && typeof payload === 'object'
        && (payload as { restart_imminent?: unknown }).restart_imminent === true
    ) {
        trigger();
    }
}

interface RestartOverlayProviderProps {
    children: ReactNode;
}

export function RestartOverlayProvider({ children }: RestartOverlayProviderProps) {
    const [isRestarting, setIsRestarting] = useState(false);

    const triggerRestart = useCallback(() => {
        setIsRestarting(true);
    }, []);

    const dismissRestart = useCallback(() => {
        setIsRestarting(false);
    }, []);

    return (
        <RestartOverlayContext.Provider
            value={{ isRestarting, triggerRestart, dismissRestart }}
        >
            {children}
        </RestartOverlayContext.Provider>
    );
}

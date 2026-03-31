import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';

export interface Neurotransmitter {
    receptor_class: string;
    dendrite_id: string | null;
    molecule: string;
    activity: string;
    vesicle: any;
    timestamp: string;
}

interface SynapticContextType {
    subscribe: (receptorClass: string, callback: (packet: Neurotransmitter) => void) => () => void;
}

const SynapticContext = createContext<SynapticContextType | null>(null);

export const SynapticCleftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const sockets = useRef<Record<string, WebSocket>>({});
    const subscribers = useRef<Record<string, Set<(packet: Neurotransmitter) => void>>>({});

    const subscribe = useCallback((receptorClass: string, callback: (packet: Neurotransmitter) => void) => {
        const cls = receptorClass.toLowerCase();

        if (!subscribers.current[cls]) {
            subscribers.current[cls] = new Set();
        }
        subscribers.current[cls].add(callback);

        if (!sockets.current[cls]) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsUrl = `${protocol}//${window.location.host}/ws/synapse/${cls}/`;

            const ws = new WebSocket(wsUrl);

            ws.onmessage = (event) => {
                try {
                    const packet: Neurotransmitter = JSON.parse(event.data);
                    subscribers.current[cls]?.forEach(cb => cb(packet));
                } catch (e) {
                    console.error(`[Synaptic Cleft] Failed to parse neurotransmitter on ${cls}`, e);
                }
            };

            ws.onclose = () => {
                console.log(`[Synaptic Cleft] Dendrite disconnected from ${cls}`);
                delete sockets.current[cls];
            };

            sockets.current[cls] = ws;
        }

        return () => {
            subscribers.current[cls]?.delete(callback);

            // THE FIX: Give React a 100ms window (for Strict Mode / minor re-renders)
            // before actually killing the WebSocket connection.
            setTimeout(() => {
                if (subscribers.current[cls]?.size === 0 && sockets.current[cls]) {
                    // Only close if it's not already closing/closed
                    if (sockets.current[cls].readyState === WebSocket.OPEN || sockets.current[cls].readyState === WebSocket.CONNECTING) {
                        sockets.current[cls].close();
                    }
                    delete sockets.current[cls];
                }
            }, 100);
        };
    }, []);

    // THE FIX: Memoize the context value so `useDendrite` doesn't infinitely re-trigger
    const contextValue = useMemo(() => ({ subscribe }), [subscribe]);

    return (
        <SynapticContext.Provider value={contextValue}>
            {children}
        </SynapticContext.Provider>
    );
};

// ... (useDendrite hook remains exactly the same below)
export const useDendrite = (receptorClass: string, dendriteId?: string | null) => {
    const context = useContext(SynapticContext);
    if (!context) {
        throw new Error("useDendrite must be used within a SynapticCleftProvider");
    }

    const [latestPacket, setLatestPacket] = useState<Neurotransmitter | null>(null);

    useEffect(() => {
        const unsubscribe = context.subscribe(receptorClass, (packet) => {
            if (!dendriteId || packet.dendrite_id === dendriteId) {
                setLatestPacket(packet);
            }
        });

        return unsubscribe;
    }, [context, receptorClass, dendriteId]);

    return latestPacket;
};
import { useEffect, useRef } from 'react';

interface NeurotransmitterEnvelope {
    receptor_class: string;
    dendrite_id: string;
    molecule: string;
    activity?: string;
    vesicle?: {
        channel?: string;
        message?: string;
        status_id?: number;
        [key: string]: unknown;
    };
    /** Top-level field on Dopamine / Cortisol molecules */
    new_status?: string;
    timestamp?: string;
}

interface UseSynapticCleftOptions {
    spikeId: string;
    onGlutamate: (payload: string) => void;
    onDopamine?: (statusId: string, newStatus: string) => void;
    onCortisol?: (statusId: string, newStatus: string) => void;
}

interface UseSynapticCleftResult {
    close: () => void;
}

export const useSynapticCleft = ({
    spikeId,
    onGlutamate,
    onDopamine,
    onCortisol,
}: UseSynapticCleftOptions): UseSynapticCleftResult => {
    const socketRef = useRef<WebSocket | null>(null);

    // Store callbacks in refs so the WebSocket effect only depends on spikeId.
    // This prevents tearing down and reconnecting the socket every time
    // a callback identity changes (e.g. when autoScroll state toggles).
    const onGlutamateRef = useRef(onGlutamate);
    const onDopamineRef = useRef(onDopamine);
    const onCortisolRef = useRef(onCortisol);

    onGlutamateRef.current = onGlutamate;
    onDopamineRef.current = onDopamine;
    onCortisolRef.current = onCortisol;

    useEffect(() => {
        if (!spikeId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/ws/synapse/spike/`;

        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onmessage = (event: MessageEvent) => {
            const raw = event.data;

            try {
                const envelope: NeurotransmitterEnvelope = JSON.parse(raw);

                // Filter by dendrite_id to only process messages for this spike
                if (envelope.dendrite_id !== spikeId) {
                    return;
                }

                // Route by molecule type
                switch (envelope.molecule) {
                    case 'Glutamate': {
                        const message = envelope.vesicle?.message;
                        if (message && typeof message === 'string') {
                            onGlutamateRef.current(message);
                        }
                        break;
                    }

                    case 'Dopamine': {
                        if (onDopamineRef.current && envelope.new_status) {
                            onDopamineRef.current(
                                String(envelope.vesicle?.status_id ?? ''),
                                envelope.new_status,
                            );
                        }
                        break;
                    }

                    case 'Cortisol': {
                        if (onCortisolRef.current && envelope.new_status) {
                            onCortisolRef.current(
                                String(envelope.vesicle?.status_id ?? ''),
                                envelope.new_status,
                            );
                        }
                        break;
                    }
                }
            } catch {
                // Silently ignore parsing errors
                return;
            }
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [spikeId]);

    const close = () => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    };

    return { close };
};

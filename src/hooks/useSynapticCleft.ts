import { useEffect, useRef } from 'react';

interface UseSynapticCleftOptions {
    spikeId: string;
    onGlutamate: (payload: string) => void;
}

interface UseSynapticCleftResult {
    close: () => void;
}

export const useSynapticCleft = ({ spikeId, onGlutamate }: UseSynapticCleftOptions): UseSynapticCleftResult => {
    const socketRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!spikeId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const url = `${protocol}//${host}/ws/spikes/${encodeURIComponent(spikeId)}/stream/`;

        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onmessage = (event: MessageEvent) => {
            // Glutamate payload: accept either plain text or JSON-wrapped { line }
            const raw = event.data;
            let text: string | null = null;

            if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed.line === 'string') {
                        text = parsed.line;
                    }
                } catch {
                    text = raw;
                }
            }

            if (text) {
                onGlutamate(text);
            }
        };

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [spikeId, onGlutamate]);

    const close = () => {
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
    };

    return { close };
};


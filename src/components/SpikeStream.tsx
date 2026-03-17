import { useEffect, useRef } from 'react';
import { apiFetch } from '../api';
import { useTerminal } from '../hooks/useTerminal';
import { useSynapticCleft } from '../hooks/useSynapticCleft';

interface SpikeStreamProps {
    spikeId: string;
}

export const SpikeStream = ({ spikeId }: SpikeStreamProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const {
        open,
        dispose,
        writeln,
        clear,
        serializeIfNeeded,
        restoreIfNeeded,
    } = useTerminal({ id: spikeId });

    // Historical hydration + terminal attach
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        open(container);
        restoreIfNeeded();

        let cancelled = false;

        const hydrate = async () => {
            try {
                const res = await apiFetch(`/api/v2/spikes/${encodeURIComponent(spikeId)}/`);
                if (!res.ok) {
                    return;
                }
                const data = await res.json() as { execution_log?: string | string[] };
                if (cancelled) return;

                clear();

                if (Array.isArray(data.execution_log)) {
                    for (const line of data.execution_log) {
                        writeln(line ?? '');
                    }
                } else if (typeof data.execution_log === 'string') {
                    const lines = data.execution_log.split(/\r?\n/);
                    for (const line of lines) {
                        writeln(line);
                    }
                }
            } catch {
                // Ignore hydration failures for now; live stream will still function
            }
        };

        hydrate();

        return () => {
            cancelled = true;
            serializeIfNeeded();
            dispose();
        };
    }, [clear, dispose, open, restoreIfNeeded, serializeIfNeeded, spikeId, writeln]);

    // Live WebSocket stream
    const { close } = useSynapticCleft({
        spikeId,
        onGlutamate: (payload) => {
            // Write each incoming Glutamate payload directly to the terminal
            writeln(payload);
        },
    });

    // Ensure socket closes when this specific stream unmounts
    useEffect(() => {
        return () => {
            close();
        };
    }, [close]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000000',
                overflow: 'hidden',
            }}
        />
    );
};


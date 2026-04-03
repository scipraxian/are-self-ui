import './PNSMonitorPage.css';
import 'xterm/css/xterm.css';
import { useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useDendrite } from '../components/SynapticCleft';
import { useTerminal } from '../hooks/useTerminal';
import type { NorepinephrineEvent } from '../types';

interface TerminalPaneProps {
    hostname: string;
    registerWriter: (hostname: string, writer: (text: string) => void) => void;
}

function PNSTerminalPane({ hostname, registerWriter }: TerminalPaneProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);

    const { open, dispose, write, serializeIfNeeded } = useTerminal({
        id: `pns-${hostname}`,
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        let opened = false;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0 && !opened) {
                opened = true;
                observer.disconnect();
                open(container);
                registerWriter(hostname, (text: string) => write(text));
            }
        });

        observer.observe(container);

        return () => {
            observer.disconnect();
            serializeIfNeeded();
            dispose();
        };
    }, [open, dispose, write, serializeIfNeeded, hostname, registerWriter]);

    return (
        <div className="pns-monitor-cell">
            <div className="pns-monitor-cell-header">
                <span className="pns-monitor-cell-hostname">{hostname}</span>
            </div>
            <div className="pns-monitor-cell-terminal" ref={containerRef} />
        </div>
    );
}

export function PNSMonitorPage() {
    const [searchParams] = useSearchParams();
    const { setCrumbs } = useBreadcrumbs();

    const workerHostnames = ['w1', 'w2', 'w3', 'w4']
        .map(key => searchParams.get(key))
        .filter(Boolean) as string[];

    const terminalWriters = useRef<Map<string, (text: string) => void>>(new Map());

    const registerWriter = useCallback((hostname: string, writer: (text: string) => void) => {
        terminalWriters.current.set(hostname, writer);
    }, []);

    // Breadcrumbs
    useEffect(() => {
        setCrumbs([
            { label: 'Peripheral Nervous System', path: '/pns' },
            { label: 'Worker Monitor', path: window.location.pathname + window.location.search },
        ]);
        document.title = 'PNS Monitor | Are-Self';
        return () => setCrumbs([]);
    }, [setCrumbs]);

    // Subscribe to all worker events
    const workerEvent = useDendrite('CeleryWorker', null);

    useEffect(() => {
        if (!workerEvent) return;

        const event = workerEvent as unknown as NorepinephrineEvent;
        const hostname = event.dendrite_id;

        if (!workerHostnames.includes(hostname)) return;

        const writer = terminalWriters.current.get(hostname);
        if (!writer) return;

        switch (event.activity) {
            case 'log': {
                const msg = event.vesicle.message as string;
                writer(msg.endsWith('\n') ? msg.replace(/\n/g, '\r\n') : msg + '\r\n');
                break;
            }
            case 'task_started':
                writer(`\x1b[33m▶ ${event.vesicle.name} [${(event.vesicle.uuid as string).slice(0, 8)}]\x1b[0m\r\n`);
                break;
            case 'task_succeeded':
                writer(`\x1b[32m✓ ${event.vesicle.name} (${event.vesicle.runtime}ms)\x1b[0m\r\n`);
                break;
            case 'task_failed':
                writer(`\x1b[31m✗ ${event.vesicle.name}: ${event.vesicle.exception}\x1b[0m\r\n`);
                break;
            case 'task_received':
                writer(`\x1b[36m◆ Received: ${event.vesicle.name} [${(event.vesicle.uuid as string).slice(0, 8)}]\x1b[0m\r\n`);
                break;
        }
    }, [workerEvent, workerHostnames]);

    if (workerHostnames.length === 0) {
        return (
            <div className="pns-monitor-empty">
                <p>No workers selected. Go to the fleet view and Shift+click workers to select them.</p>
            </div>
        );
    }

    const count = Math.min(workerHostnames.length, 4);

    return (
        <div className="pns-monitor-page">
            <div className="pns-monitor-header">
                <span className="pns-monitor-header-title">Worker Monitor</span>
                <span className="pns-monitor-header-count">
                    {count} worker{count !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="pns-monitor-grid" data-count={count}>
                {workerHostnames.slice(0, 4).map(hostname => (
                    <PNSTerminalPane
                        key={hostname}
                        hostname={hostname}
                        registerWriter={registerWriter}
                    />
                ))}
            </div>
        </div>
    );
}

import { useState, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Download, Power, Trash2 } from 'lucide-react';

import type {
    NeuralModifierInstallationEvent,
    NeuralModifierInstallationLog,
} from '../types';
import './ModifierEventList.css';

interface ModifierEventListProps {
    logs: NeuralModifierInstallationLog[];
}

const EVENT_ICONS: Record<number, ReactNode> = {
    1: <Download size={14} className="modifier-event-icon modifier-event-icon--install" />,
    2: <Trash2 size={14} className="modifier-event-icon modifier-event-icon--uninstall" />,
    3: <Power size={14} className="modifier-event-icon modifier-event-icon--enable" />,
    4: <Power size={14} className="modifier-event-icon modifier-event-icon--disable" />,
    5: <AlertTriangle size={14} className="modifier-event-icon modifier-event-icon--broken" />,
    6: <AlertTriangle size={14} className="modifier-event-icon modifier-event-icon--broken" />,
};

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

function EventRow({ event }: { event: NeuralModifierInstallationEvent }) {
    return (
        <li className="modifier-event-row">
            <span className="modifier-event-icon-wrap">
                {EVENT_ICONS[event.event_type_id] ?? <Download size={14} />}
            </span>
            <div className="modifier-event-body">
                <div className="modifier-event-header">
                    <span className="modifier-event-name">{event.event_type_name}</span>
                    <span className="modifier-event-time">{formatTime(event.created)}</span>
                </div>
                {Object.keys(event.event_data || {}).length > 0 && (
                    <pre className="modifier-event-data">
                        {JSON.stringify(event.event_data, null, 2)}
                    </pre>
                )}
            </div>
        </li>
    );
}

function LogBlock({ log }: { log: NeuralModifierInstallationLog }) {
    const [open, setOpen] = useState(true);
    const manifestVersion =
        (log.installation_manifest as Record<string, unknown>)?.version ?? 'unknown';

    return (
        <div className="modifier-event-log">
            <button
                type="button"
                className="modifier-event-log-header"
                onClick={() => setOpen((prev) => !prev)}
            >
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className="modifier-event-log-title">
                    Log · v{String(manifestVersion)}
                </span>
                <span className="modifier-event-log-time">
                    {formatTime(log.created)}
                </span>
            </button>
            {open && (
                <ul className="modifier-event-list">
                    {log.events.map((event) => (
                        <EventRow key={event.id} event={event} />
                    ))}
                </ul>
            )}
        </div>
    );
}

export function ModifierEventList({ logs }: ModifierEventListProps) {
    if (!logs || logs.length === 0) {
        return (
            <div className="modifier-event-empty">
                No installation events yet.
            </div>
        );
    }

    const sorted = [...logs].sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
    );

    return (
        <div className="modifier-event-timeline">
            {sorted.map((log) => (
                <LogBlock key={log.id} log={log} />
            ))}
        </div>
    );
}

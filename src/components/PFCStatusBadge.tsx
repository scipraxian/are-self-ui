import './PFCStatusBadge.css';

interface PFCStatusBadgeProps {
    name: string;
}

const STATUS_COLORS: Record<string, string> = {
    backlog: '#64748b',
    'to do': '#94a3b8',
    'in progress': '#38bdf8',
    'in review': '#a78bfa',
    done: '#4ade80',
    blocked: '#ef4444',
};

function getStatusColor(name: string): string {
    return STATUS_COLORS[name.toLowerCase()] || '#94a3b8';
}

export function PFCStatusBadge({ name }: PFCStatusBadgeProps) {
    const color = getStatusColor(name);

    return (
        <span
            className="pfc-status-badge"
            style={{ '--badge-color': color } as React.CSSProperties}
        >
            <span className="pfc-status-badge-dot" />
            {name}
        </span>
    );
}

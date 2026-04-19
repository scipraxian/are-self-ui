import './ModifierStatusPill.css';

interface ModifierStatusPillProps {
    statusId: number;
    statusName: string;
}

const STATUS_MODIFIER: Record<number, string> = {
    0: 'modifier-status-pill--available',
    1: 'modifier-status-pill--discovered',
    2: 'modifier-status-pill--installed',
    3: 'modifier-status-pill--enabled',
    4: 'modifier-status-pill--disabled',
    5: 'modifier-status-pill--broken',
};

export function ModifierStatusPill({ statusId, statusName }: ModifierStatusPillProps) {
    const modifierClass = STATUS_MODIFIER[statusId] ?? 'modifier-status-pill--discovered';
    return (
        <span className={`modifier-status-pill ${modifierClass}`} aria-label={`Status: ${statusName}`}>
            <span className="modifier-status-pill-dot" />
            <span className="modifier-status-pill-label">{statusName}</span>
        </span>
    );
}

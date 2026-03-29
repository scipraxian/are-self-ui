import './CNSMetaPill.css';

interface CNSMetaPillProps {
    label: string;
    value: string;
    variant?: 'default' | 'success' | 'failed' | 'running';
}

export const CNSMetaPill = ({ label, value, variant = 'default' }: CNSMetaPillProps) => (
    <div className={`cns-meta-pill cns-meta-pill--${variant}`}>
        <span className="cns-meta-pill-label">{label}:</span>
        <span className="cns-meta-pill-value">{value}</span>
    </div>
);

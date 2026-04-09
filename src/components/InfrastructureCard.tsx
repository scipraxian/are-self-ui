import './InfrastructureCard.css';
import type { InfraServiceStatus } from '../types';

interface DetailItem {
    label: string;
    value: string | number | null;
}

interface Props {
    name: string;
    service: InfraServiceStatus | null;
    icon: React.ReactNode;
    accentColor: string;
    details: DetailItem[];
}

export function InfrastructureCard({ name, service, icon, accentColor, details }: Props) {
    if (!service) {
        return (
            <div className="pns-infra-card pns-infra-card--error">
                <div className="pns-infra-header">
                    <span className="pns-infra-icon">{icon}</span>
                    <span>{name}</span>
                </div>
                <div className="pns-infra-status">Not Connected</div>
            </div>
        );
    }

    const isConnected = service.connected;

    return (
        <div
            className={`pns-infra-card ${isConnected ? 'pns-infra-card--connected' : 'pns-infra-card--disconnected'}`}
            style={{ '--infra-accent-color': accentColor } as React.CSSProperties}
        >
            <div className="pns-infra-header">
                <span className="pns-infra-icon">{icon}</span>
                <span>{name}</span>
                {service.version && <span className="pns-infra-version">{service.version}</span>}
            </div>

            <div className={`pns-infra-status-line ${isConnected ? 'pns-infra-status-line--online' : 'pns-infra-status-line--offline'}`}>
                <span className="pns-infra-dot" />
                <span className="pns-infra-status">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {isConnected && details.length > 0 && (
                <div className="pns-infra-details">
                    {details.map(
                        (detail, i) =>
                            detail.value != null && (
                                <div key={i} className="pns-infra-detail-row">
                                    <span className="pns-infra-detail-label">{detail.label}</span>
                                    <span className="pns-infra-detail-value">{detail.value}</span>
                                </div>
                            )
                    )}
                </div>
            )}
        </div>
    );
}

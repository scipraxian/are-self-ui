import { useParams, useNavigate } from 'react-router-dom';

export function CNSTrainTimelinePlaceholder() {
    const { pathwayId } = useParams<{ pathwayId: string }>();
    const navigate = useNavigate();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '16px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
        }}>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                Train Timeline — Coming Soon
            </h2>
            <p style={{ margin: 0 }}>Pathway #{pathwayId}</p>
            <button
                onClick={() => navigate('/cns')}
                style={{
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-primary)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                }}
            >
                Back to Dashboard
            </button>
        </div>
    );
}

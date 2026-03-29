import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export function CNSSpikeForensicsPlaceholder() {
    const { spikeId } = useParams<{ spikeId: string }>();
    const navigate = useNavigate();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') navigate(-1);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [navigate]);

    return (
        <div className="three-panel-center-stage" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-secondary)',
        }}>
            <h2 style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                Spike Forensics &mdash; Coming Soon
            </h2>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>Spike #{spikeId}</p>
            <button
                onClick={() => navigate(-1)}
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
                &larr; Back
            </button>
        </div>
    );
}

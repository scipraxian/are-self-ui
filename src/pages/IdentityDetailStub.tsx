import { useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { IdentityRoster } from '../components/IdentityRoster';
import { IdentitySheet } from '../components/IdentitySheet';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function IdentityDetailStub() {
    const { discId } = useParams<{ discId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    const type = (searchParams.get('type') as 'base' | 'disc') || 'disc';

    useEffect(() => {
        if (discId) {
            setCrumbs([
                { label: 'Identity Ledger', path: '/identity' },
                { label: `Disc #${discId.slice(0, 6).toUpperCase()}`, path: `/identity/${discId}` },
            ]);
        }
        return () => setCrumbs([]);
    }, [discId, setCrumbs]);

    if (!discId) return null;

    return (
        <ThreePanel
            left={
                <>
                    <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                    <IdentityRoster
                        onSelectIdentity={(id, t) => navigate(`/identity/${id}?type=${t}`)}
                    />
                </>
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/identity')}>
                        ✕
                    </button>
                    <IdentitySheet id={discId} type={type} />
                </div>
            }
            right={
                <>
                    <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                    <div className="layout-placeholder font-mono text-sm">
                        [Contextual Node Details]
                    </div>
                </>
            }
        />
    );
}

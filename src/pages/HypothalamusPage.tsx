import { useEffect } from 'react';
import { ThreePanel } from '../components/ThreePanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function HypothalamusPage() {
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([{ label: 'Hypothalamus', path: '/hypothalamus' }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    return (
        <ThreePanel
            left={
                <>
                    <h2 className="glass-panel-title">AI MODEL CATALOG</h2>
                    <div className="layout-placeholder font-mono text-sm">
                        Model routing and selection filters.
                    </div>
                </>
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <div className="layout-placeholder font-mono text-sm">
                        Hypothalamus — AI model management, budget constraints, circuit breakers, and failover strategies.
                    </div>
                </div>
            }
            right={null}
        />
    );
}

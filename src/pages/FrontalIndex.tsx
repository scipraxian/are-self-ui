import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { ReasoningSidebar } from '../components/ReasoningPanels';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function FrontalIndex() {
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([{ label: 'Frontal Lobe', path: '/frontal' }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    return (
        <ThreePanel
            left={
                <ReasoningSidebar
                    activeSessionId={null}
                    onSelectSession={(id) => navigate(id)}
                    onToggleChat={() => {}}
                />
            }
            center={
                <div className="glass-panel layout-placeholder font-mono text-sm">
                    Select a Cognitive Thread to engage the Cortex.
                </div>
            }
            right={
                <div className="layout-placeholder font-mono text-sm">
                    Cortical Telemetry — select a node for details.
                </div>
            }
        />
    );
}

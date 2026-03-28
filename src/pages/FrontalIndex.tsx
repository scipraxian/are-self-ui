import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { ReasoningSidebar } from '../components/ReasoningPanels';

export function FrontalIndex() {
    const navigate = useNavigate();

    return (
        <ThreePanel
            left={
                <ReasoningSidebar
                    activeSessionId={null}
                    onSelectSession={(id) => navigate(id)}
                    onExit={() => navigate('/')}
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

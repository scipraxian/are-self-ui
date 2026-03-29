import { ThreePanel } from '../components/ThreePanel';
import { IdentityRoster } from '../components/IdentityRoster';
import { TemporalMatrix } from '../components/TemporalMatrix';

export function TemporalStub() {
    return (
        <ThreePanel
            left={
                <>
                    <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                    <IdentityRoster onSelectIdentity={() => {}} />
                </>
            }
            center={<TemporalMatrix onSelectionChange={() => {}} />}
        />
    );
}

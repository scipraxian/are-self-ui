import { useEffect } from 'react';
import { TemporalMatrix } from '../components/TemporalMatrix';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function TemporalStub() {
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([{ label: 'Temporal Lobe', path: '/temporal' }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    return <TemporalMatrix onSelectionChange={() => {}} />;
}

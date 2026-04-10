import { useEffect } from 'react';
import { TemporalMatrix } from '../components/TemporalMatrix';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';

export function TemporalStub() {
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([{
            label: 'Temporal Lobe',
            path: '/temporal',
            tip: 'The Temporal Lobe schedules iterations and shifts — time-boxed windows that scope what identities, pathways, and tasks are active.',
            doc: 'docs/brain-regions/temporal-lobe',
        }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    return <TemporalMatrix onSelectionChange={() => {}} />;
}

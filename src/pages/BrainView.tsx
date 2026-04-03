import { useEffect } from 'react';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { DashboardContent } from './DashboardContent';

/**
 * BrainView – the index route ("/").
 * Renders dashboard content (latest spikes, sessions, system stats) overlaid on the
 * interactive 3D brain background. The background is rendered by LayoutShell's
 * BackgroundCanvas layer.
 */
export function BrainView() {
    const { setCrumbs } = useBreadcrumbs();

    useEffect(() => {
        setCrumbs([]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    return <DashboardContent />;
}

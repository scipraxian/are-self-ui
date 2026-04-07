import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BackgroundCanvas } from './BackgroundCanvas';
import { NavBar } from './NavBar';
import { SpikeSetBar } from './SpikeSetBar';
import { WorkerSetBar } from './WorkerSetBar';
import { ThalamusBubble } from './ThalamusBubble';
import { useGABA } from '../context/GABAProvider';
import { useDendrite } from './SynapticCleft';
import './LayoutShell.css';

/** Routes where the 3D background should be hidden (full-screen graph takes over) */
const GRAPH_ROUTE_PREFIXES = ['/frontal/', '/cns/pathway/', '/cns/spiketrain/'];

function isGraphRoute(pathname: string): boolean {
    return GRAPH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Spike activity cooldown (ms). When the last spike event fires, wait this
 * long before assuming the system is idle again. Prevents rapid toggling
 * during bursts of spike activity.
 */
const SPIKE_IDLE_TIMEOUT = 8000;

export function LayoutShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();

    const isRoot = location.pathname === '/' || location.pathname === '';
    const showBackground = !isGraphRoute(location.pathname);

    /* ---- GPU-saver toggle (default: ON = swap to logo when running) ---- */
    const [gpuSaver, setGpuSaver] = useState(true);

    /* ---- Spike activity detection via dendrite ---- */
    const spikeEvent = useDendrite('Spike', null);
    const [workersActive, setWorkersActive] = useState(false);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!spikeEvent) return;

        setWorkersActive(true);

        if (idleTimerRef.current) {
            clearTimeout(idleTimerRef.current);
        }
        idleTimerRef.current = setTimeout(() => {
            setWorkersActive(false);
        }, SPIKE_IDLE_TIMEOUT);

        return () => {
            if (idleTimerRef.current) {
                clearTimeout(idleTimerRef.current);
            }
        };
    }, [spikeEvent]);

    /** Show the full brain when: GPU-saver is OFF, or workers are idle */
    const showBrain = !gpuSaver || !workersActive;

    // ESC handler: navigate back if not at root
    useEffect(() => {
        const unregister = registerEscapeHandler(() => {
            if (!isRoot) {
                navigate(-1);
            }
        });
        return unregister;
    }, [isRoot, navigate, registerEscapeHandler]);

    const handleLobeClick = (path: string) => {
        navigate(`/${path}`);
    };

    return (
        <div className="layout-shell">
            {/* Background 3D layer */}
            <div className={`layout-bg ${!isRoot ? 'layout-bg--inactive' : ''}`}>
                {showBackground && (
                    <BackgroundCanvas
                        onLobeClick={isRoot ? handleLobeClick : () => {}}
                        interactive={isRoot}
                        showBrain={showBrain}
                    />
                )}
            </div>

            {/* UI layer */}
            <div className="layout-ui">
                <NavBar gpuSaver={gpuSaver} onGpuSaverChange={setGpuSaver} />
                <SpikeSetBar />
                <WorkerSetBar />

                {/* Lobe page content via React Router */}
                <Outlet />
                <ThalamusBubble />
            </div>
        </div>
    );
}

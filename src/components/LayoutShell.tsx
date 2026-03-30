import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BackgroundCanvas } from './BackgroundCanvas';
import { NavBar } from './NavBar';
import { SpikeSetBar } from './SpikeSetBar';
import { useGABA } from '../context/GABAProvider';
import './LayoutShell.css';

/** Routes where the 3D background should be hidden (full-screen graph takes over) */
const GRAPH_ROUTE_PREFIXES = ['/frontal/', '/cns/pathway/', '/cns/spiketrain/'];

function isGraphRoute(pathname: string): boolean {
    return GRAPH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function LayoutShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();

    const isRoot = location.pathname === '/' || location.pathname === '';
    const showBackground = !isGraphRoute(location.pathname);

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
                    />
                )}
            </div>

            {/* UI layer */}
            <div className="layout-ui">
                <NavBar />
                <SpikeSetBar />

                {/* Lobe page content via React Router */}
                <Outlet />
            </div>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Terminal } from 'lucide-react';
import { BackgroundCanvas } from './BackgroundCanvas';
import { HamburgerMenu } from './HamburgerMenu';
import { ThalamusChat } from './ThalamusChat';
import { useGABA } from '../context/GABAProvider';
import './LayoutShell.css';

/** Routes where the 3D background should be hidden (full-screen graph takes over) */
const GRAPH_ROUTE_PREFIXES = ['/frontal/', '/cns/edit/', '/cns/monitor/'];

function isGraphRoute(pathname: string): boolean {
    return GRAPH_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function LayoutShell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();

    const [chatPanelOpen, setChatPanelOpen] = useState(false);

    const isRoot = location.pathname === '/' || location.pathname === '';
    const showBackground = !isGraphRoute(location.pathname);

    // ESC handler: close chat panel first, otherwise navigate back
    useEffect(() => {
        const unregister = registerEscapeHandler(() => {
            if (chatPanelOpen) {
                setChatPanelOpen(false);
            } else if (!isRoot) {
                navigate(-1);
            }
        });
        return unregister;
    }, [chatPanelOpen, isRoot, navigate, registerEscapeHandler]);

    const handleLobeClick = (path: string) => {
        navigate(`/${path}`);
    };

    return (
        <div className="layout-shell">
            {/* Background 3D layer */}
            <div className="layout-bg">
                {showBackground && (
                    <BackgroundCanvas
                        onLobeClick={isRoot ? handleLobeClick : () => {}}
                    />
                )}
            </div>

            {/* UI layer */}
            <div className="layout-ui">
                <HamburgerMenu />

                {/* Lobe page content via React Router */}
                <Outlet />

                {/* Footer */}
                <footer className="glass-panel layout-footer">
                    <div className="font-mono text-xs layout-footer-ticker">
                        <Terminal className="footer-stat-icon" size={14} />
                        <span className="layout-footer-ticker-text">
                            "Awaiting neural synchronization..."
                        </span>
                    </div>
                    <div
                        className="layout-footer-chat"
                        onClick={() => setChatPanelOpen((open) => !open)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setChatPanelOpen((open) => !open)}
                        aria-label={chatPanelOpen ? 'Close Thalamus chat' : 'Open Thalamus chat'}
                    >
                        <MessageSquare size={18} />
                    </div>
                </footer>

                {/* Thalamus chat slide-out panel */}
                <div
                    className={`layout-chat-panel ${chatPanelOpen ? 'layout-chat-panel--open' : ''}`}
                    aria-hidden={!chatPanelOpen}
                >
                    <div className="layout-chat-inner">
                        <ThalamusChat onClose={() => setChatPanelOpen(false)} />
                    </div>
                </div>
            </div>
        </div>
    );
}

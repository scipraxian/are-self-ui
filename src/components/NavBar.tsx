import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useGABA } from '../context/GABAProvider';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useEnvironment } from '../context/EnvironmentProvider';
import './NavBar.css';

export const NavBar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const { registerEscapeHandler } = useGABA();
    const { crumbs } = useBreadcrumbs();
    const { environments, selectedEnvironmentId, setSelectedEnvironmentId } = useEnvironment();

    // Click outside closes dropdown
    useEffect(() => {
        if (!menuOpen) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [menuOpen]);

    // ESC closes dropdown
    useEffect(() => {
        if (!menuOpen) return;

        const unregister = registerEscapeHandler(() => {
            setMenuOpen(false);
        });
        return unregister;
    }, [menuOpen, registerEscapeHandler]);

    const toggleMenu = useCallback(() => {
        setMenuOpen(prev => !prev);
    }, []);

    return (
        <nav className="navbar" ref={rootRef}>
            <div className="navbar-left">
                <button className="navbar-hamburger" onClick={toggleMenu} aria-label="Open navigation">
                    {menuOpen ? <X size={16} /> : <Menu size={16} />}
                </button>
                <Link to="/" className="navbar-logo">ARE-SELF</Link>
            </div>

            <div className="navbar-crumbs">
                {crumbs.map((crumb, i) => (
                    <Fragment key={crumb.path}>
                        <span className="navbar-crumb-sep">&rsaquo;</span>
                        {i < crumbs.length - 1 ? (
                            <Link to={crumb.path} className="navbar-crumb">{crumb.label}</Link>
                        ) : (
                            <span className="navbar-crumb navbar-crumb--active">{crumb.label}</span>
                        )}
                    </Fragment>
                ))}
            </div>

            <div className="navbar-right">
                <select
                    className="navbar-env-select"
                    value={selectedEnvironmentId}
                    onChange={(e) => setSelectedEnvironmentId(e.target.value)}
                >
                    <option value="">All Environments</option>
                    {environments.map(env => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>
            </div>

            {menuOpen && (
                <div className="navbar-dropdown">
                    <Link to="/" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Cortex
                    </Link>
                    <Link to="/frontal" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Frontal Lobe / Reasoning
                    </Link>
                    <Link to="/temporal" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Temporal Lobe / Iterations
                    </Link>
                    <Link to="/cns" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Central Nervous System
                    </Link>
                    <Link to="/pfc" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Prefrontal Cortex
                    </Link>
                    <Link to="/identity" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Identity Ledger
                    </Link>
                    <Link to="/pns" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        Peripheral Nervous System / Fleet
                    </Link>
                </div>
            )}
        </nav>
    );
};

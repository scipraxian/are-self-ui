import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Activity, BookOpen, Brain, Clock, Home, LayoutGrid, Menu,
    Network, Settings, TrendingUp, X, Zap
} from 'lucide-react';
import { useGABA } from '../context/GABAProvider';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { useEnvironment } from '../context/EnvironmentProvider';
import { HelpTip } from './HelpTip';
import './NavBar.css';

interface NavBarProps {
    gpuSaver: boolean;
    onGpuSaverChange: (value: boolean) => void;
}

export const NavBar = ({ gpuSaver, onGpuSaverChange }: NavBarProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();
    const { crumbs } = useBreadcrumbs();
    const { environments, selectedEnvironmentId, selectEnvironment } = useEnvironment();

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
                <Link to="/" className="navbar-logo">
                    <img src="/Are-SelfLogo-transparent.png" alt="Are-Self" className="navbar-logo-img" />
                    <span className="navbar-logo-text">ARE-SELF</span>
                </Link>
                <HelpTip
                    tip="The Are-Self dashboard. Click the ? for docs."
                    doc=""
                    placement="bottom"
                />
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
                <HelpTip
                    tip="Environments scope what you see — pathways, tasks, sessions. Changing here filters every view."
                    doc="docs/ui/environments"
                    placement="bottom"
                />
                <select
                    className="navbar-env-select"
                    value={selectedEnvironmentId}
                    onChange={(e) => selectEnvironment(e.target.value)}
                >
                    <option value="">All Environments</option>
                    {environments.map(env => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>
                <button
                    className="navbar-env-edit-btn"
                    onClick={() => navigate('/environments')}
                    title="Manage Environments"
                >
                    <Settings size={14} />
                </button>
            </div>

            {menuOpen && (
                <div className="navbar-dropdown">
                    <Link to="/cns" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Network size={15} className="nav-dd-icon" style={{ color: '#22d3ee' }} />
                        <span className="nav-dd-route">CNS</span>
                        <span className="nav-dd-label">Graphs</span>
                    </Link>
                    <Link to="/" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Home size={15} className="nav-dd-icon" style={{ color: '#ffffff' }} />
                        <span className="nav-dd-route">Cortex</span>
                        <span className="nav-dd-label">Dashboard</span>
                    </Link>
                    <Link to="/environments" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Settings size={15} className="nav-dd-icon" style={{ color: '#94a3b8' }} />
                        <span className="nav-dd-route">Environments</span>
                        <span className="nav-dd-label">Config</span>
                    </Link>
                    <Link to="/frontal" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <TrendingUp size={15} className="nav-dd-icon" style={{ color: '#a78bfa' }} />
                        <span className="nav-dd-route">Frontal Lobe</span>
                        <span className="nav-dd-label">Reasoning</span>
                    </Link>
                    <Link to="/hippocampus" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <BookOpen size={15} className="nav-dd-icon" style={{ color: '#fbbf24' }} />
                        <span className="nav-dd-route">Hippocampus</span>
                        <span className="nav-dd-label">Memory</span>
                    </Link>
                    <Link to="/hypothalamus" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Zap size={15} className="nav-dd-icon" style={{ color: '#34d399' }} />
                        <span className="nav-dd-route">Hypothalamus</span>
                        <span className="nav-dd-label">Models</span>
                    </Link>
                    <Link to="/identity" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Brain size={15} className="nav-dd-icon" style={{ color: '#38bdf8' }} />
                        <span className="nav-dd-route">Identity</span>
                        <span className="nav-dd-label">Personas</span>
                    </Link>
                    <Link to="/pfc" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <LayoutGrid size={15} className="nav-dd-icon" style={{ color: '#fb7185' }} />
                        <span className="nav-dd-route">Prefrontal Cortex</span>
                        <span className="nav-dd-label">Tools</span>
                    </Link>
                    <Link to="/pns" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Activity size={15} className="nav-dd-icon" style={{ color: '#fb923c' }} />
                        <span className="nav-dd-route">PNS</span>
                        <span className="nav-dd-label">Fleet</span>
                    </Link>
                    <Link to="/temporal" className="navbar-dropdown-item" onClick={() => setMenuOpen(false)}>
                        <Clock size={15} className="nav-dd-icon" style={{ color: '#818cf8' }} />
                        <span className="nav-dd-route">Temporal Lobe</span>
                        <span className="nav-dd-label">Iterations</span>
                    </Link>

                    <div className="navbar-dropdown-divider" />

                    <label className="navbar-dropdown-toggle">
                        <Brain size={14} className="nav-dd-icon" style={{ color: gpuSaver ? '#64748b' : '#38bdf8' }} />
                        <span className="nav-dd-route">GPU Saver</span>
                        <span className="nav-dd-label">During runs</span>
                        <input
                            type="checkbox"
                            className="navbar-toggle-checkbox"
                            checked={gpuSaver}
                            onChange={(e) => onGpuSaverChange(e.target.checked)}
                        />
                        <span className="navbar-toggle-track">
                            <span className="navbar-toggle-thumb" />
                        </span>
                    </label>
                </div>
            )}
        </nav>
    );
};

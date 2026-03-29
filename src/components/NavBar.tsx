import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useGABA } from '../context/GABAProvider';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { apiFetch } from '../api';
import './NavBar.css';

type EnvironmentOption = { id: string; name: string };

const BREADCRUMB_MAP: Record<string, string> = {
    'frontal': 'Frontal Lobe',
    'cns': 'Central Nervous System',
    'temporal': 'Temporal Lobe',
    'pfc': 'Prefrontal Cortex',
    'identity': 'Identity Ledger',
    'pns': 'Peripheral Nervous System',
    'hippocampus': 'Hippocampus',
    'hypothalamus': 'Hypothalamus',
    'pathway': 'Pathway',
    'spike': 'Spike',
    'edit': 'Edit',
    'monitor': 'Monitor',
};

interface Crumb {
    path: string;
    label: string;
}

function buildCrumbs(pathname: string, overrides: { segment: string; label: string }[]): Crumb[] {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: Crumb[] = [];
    let accumulated = '';

    for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        accumulated += '/' + seg;

        // Check overrides first
        const override = overrides.find(o => o.segment === seg);
        if (override) {
            crumbs.push({ path: accumulated, label: override.label });
            continue;
        }

        // Check static map
        const mapped = BREADCRUMB_MAP[seg];
        if (mapped) {
            // Skip intermediate segments like "pathway", "spike", "edit", "monitor"
            // if the next segment is a dynamic ID
            if (['pathway', 'spike', 'edit', 'monitor'].includes(seg) && i + 1 < segments.length) {
                continue;
            }
            crumbs.push({ path: accumulated, label: mapped });
            continue;
        }

        // Dynamic segment — show as short hash
        crumbs.push({ path: accumulated, label: '#' + seg.slice(0, 6).toUpperCase() });
    }

    return crumbs;
}

export const NavBar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);
    const [envId, setEnvId] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const { registerEscapeHandler } = useGABA();
    const { overrides } = useBreadcrumbs();

    const crumbs = buildCrumbs(location.pathname, overrides);

    // Set document title
    useEffect(() => {
        if (crumbs.length > 0) {
            document.title = crumbs[crumbs.length - 1].label + ' — Are-Self';
        } else {
            document.title = 'Are-Self';
        }
    }, [crumbs]);

    // Fetch environments
    useEffect(() => {
        let mounted = true;
        const fetchEnvs = async () => {
            try {
                const res = await apiFetch('/api/v1/environments/');
                if (!res.ok) return;
                const data = await res.json();
                const list = (data?.results ?? data) as EnvironmentOption[];
                if (mounted) setEnvironments(Array.isArray(list) ? list : []);
            } catch {
                // ignore
            }
        };
        fetchEnvs();
        return () => { mounted = false; };
    }, []);

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
                    value={envId}
                    onChange={(e) => setEnvId(e.target.value)}
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

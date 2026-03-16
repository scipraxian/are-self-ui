import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './HamburgerMenu.css';

export const HamburgerMenu = () => {
    const [open, setOpen] = useState(false);

    return (
        <div className="hamburger-root">
            <div className="hamburger-logo">
                <Link to="/" className="hamburger-logo-link">
                    ARE-SELF
                </Link>
            </div>
            <button
                type="button"
                className="hamburger-toggle"
                onClick={() => setOpen((prev) => !prev)}
                aria-label="Open navigation"
            >
                {open ? <X size={18} /> : <Menu size={18} />}
            </button>
            {open && (
                <nav className="hamburger-menu glass-panel">
                    <ul className="hamburger-list">
                        <li>
                            <Link to="/" onClick={() => setOpen(false)}>
                                Main Cortex Splash
                            </Link>
                        </li>
                        <li>
                            <Link to="/frontal" onClick={() => setOpen(false)}>
                                Frontal Lobe / Reasoning
                            </Link>
                        </li>
                        <li>
                            <Link to="/temporal" onClick={() => setOpen(false)}>
                                Temporal Lobe / Iterations
                            </Link>
                        </li>
                        <li>
                            <Link to="/cns" onClick={() => setOpen(false)}>
                                Central Nervous System
                            </Link>
                        </li>
                        <li>
                            <Link to="/pfc" onClick={() => setOpen(false)}>
                                Prefrontal Cortex
                            </Link>
                        </li>
                        <li>
                            <Link to="/identity" onClick={() => setOpen(false)}>
                                Identity Ledger
                            </Link>
                        </li>
                        <li>
                            <a href="/admin/" onClick={() => setOpen(false)}>
                                Django Admin
                            </a>
                        </li>
                    </ul>
                </nav>
            )}
        </div>
    );
};


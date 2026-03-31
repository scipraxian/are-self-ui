import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useGABA } from '../context/GABAProvider';
import './HamburgerMenu.css';

export const HamburgerMenu = () => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const { registerEscapeHandler } = useGABA();

    // Close on click outside
    useEffect(() => {
        if (!open) return;

        const handleMouseDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [open]);

    // ESC closes the nav drawer if open
    useEffect(() => {
        if (!open) return;

        const unregister = registerEscapeHandler(() => {
            setOpen(false);
        });
        return unregister;
    }, [open, registerEscapeHandler]);

    return (
        <div className="hamburger-root" ref={rootRef}>
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
                                Cortex
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
                            <Link to="/pns" onClick={() => setOpen(false)}>
                                Peripheral Nervous System / Fleet
                            </Link>
                        </li>
                        <li>
                            <Link to="/hippocampus" onClick={() => setOpen(false)}>
                                Hippocampus
                            </Link>
                        </li>
                        <li>
                            <Link to="/hypothalamus" onClick={() => setOpen(false)}>
                                Hypothalamus
                            </Link>
                        </li>
                        <li>
                            <Link to="/environments" onClick={() => setOpen(false)}>
                                Environments
                            </Link>
                        </li>
                    </ul>
                </nav>
            )}
        </div>
    );
};

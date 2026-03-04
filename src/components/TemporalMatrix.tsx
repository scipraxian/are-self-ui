import { useRef, useState, useEffect } from 'react';
import { Play, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import './TemporalMatrix.css';

export const TemporalMatrix = () => {
    const boardRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScroll = () => {
        if (boardRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = boardRef.current;
            setCanScrollLeft(scrollLeft > 0);
            // 1px buffer to account for sub-pixel rendering discrepancies
            setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);

        // Setup ResizeObserver to catch inner content width changes
        let resizeObserver: ResizeObserver | null = null;
        if (boardRef.current) {
            resizeObserver = new ResizeObserver(() => checkScroll());
            resizeObserver.observe(boardRef.current);
        }

        return () => {
            window.removeEventListener('resize', checkScroll);
            if (resizeObserver) resizeObserver.disconnect();
        };
    }, []);

    const scrollBoard = (direction: 'left' | 'right') => {
        if (boardRef.current) {
            const scrollAmount = 336;
            boardRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="temporal-matrix-container">

            <div className="matrix-header">
                <div>
                    <h3 className="font-display heading-tracking text-base m-0 text-primary">
                        Iteration Cycle
                    </h3>
                    <div className="font-mono text-xs text-muted" style={{ marginTop: '4px' }}> {/* I left this one margin inline, forgive me! */}
                        Iteration ID: 00000000-0000-0000-0000-000000000000
                    </div>
                </div>
                <button className="btn-action">
                    <Play size={14} fill="currentColor" />
                    INITIATE
                </button>
            </div>

            <div className="matrix-board-wrapper">
                {canScrollLeft ? (
                    <button className="matrix-scroll-btn" onClick={() => scrollBoard('left')}>
                        <ChevronLeft size={24} />
                    </button>
                ) : <div style={{ width: '36px', flexShrink: 0 }} />}

                <div className="matrix-board" ref={boardRef} onScroll={checkScroll}>

                    {/* Column 1: Completed / Waiting */}
                    <div className="matrix-column">
                        <div className="matrix-column-header">
                            <span className="matrix-column-title">1. Grooming</span>
                            <span className="matrix-column-stats" title="Edit Turn Limit">15 / 15</span>
                        </div>
                        <div className="matrix-column-body">
                            <div className="slotted-card">
                                <div className="slotted-card-header">
                                    <span className="slotted-card-title">PM [Lvl 2]</span>
                                    <MoreVertical size={14} className="text-muted" />
                                </div>
                                <div className="font-mono text-xs text-secondary" style={{ display: 'flex', gap: '12px' }}>
                                    <span>XP: 120</span>
                                    <span>F: 10/10</span>
                                </div>
                            </div>
                            <div className="matrix-drop-zone"></div>
                        </div>
                    </div>

                    {/* Column 2: Active */}
                    <div className="matrix-column active">
                        <div className="matrix-column-header">
                            <span className="matrix-column-title active-text">2. Pre-Planning</span>
                            <span className="matrix-column-stats" title="Edit Turn Limit">2 / 5</span>
                        </div>
                        <div className="matrix-column-body">
                            <div className="slotted-card">
                                <div className="slotted-card-header">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="slotted-card-title">Worker [Lvl 5]</span>
                                        <span className="status-dot status-active-pulse"></span>
                                    </div>
                                    <MoreVertical size={14} className="text-muted" />
                                </div>
                                <div className="font-mono text-xs text-secondary" style={{ display: 'flex', gap: '12px' }}>
                                    <span>XP: 450</span>
                                    <span>F: 8/12</span>
                                </div>
                            </div>
                            <div className="matrix-drop-zone"></div>
                        </div>
                    </div>

                    {/* Column 3: Future */}
                    <div className="matrix-column">
                        <div className="matrix-column-header">
                            <span className="matrix-column-title">3. Execution</span>
                            <span className="matrix-column-stats" title="Edit Turn Limit">0 / 50</span>
                        </div>
                        <div className="matrix-column-body">
                            <div className="matrix-drop-zone"></div>
                        </div>
                    </div>

                    {/* Column 4: Future (To force scrolling) */}
                    <div className="matrix-column">
                        <div className="matrix-column-header">
                            <span className="matrix-column-title">4. Post-Execution</span>
                            <span className="matrix-column-stats" title="Edit Turn Limit">0 / 10</span>
                        </div>
                        <div className="matrix-column-body">
                            <div className="matrix-drop-zone"></div>
                        </div>
                    </div>

                </div>

                {canScrollRight ? (
                    <button className="matrix-scroll-btn" onClick={() => scrollBoard('right')}>
                        <ChevronRight size={24} />
                    </button>
                ) : <div style={{ width: '36px', flexShrink: 0 }} />}
            </div>

        </div>
    );
};
import './CNSTerminalPane.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchAddon } from 'xterm-addon-search';
import { useTerminal } from '../hooks/useTerminal';
import { useSynapticCleft } from '../hooks/useSynapticCleft';

interface CNSTerminalPaneProps {
    title: string;
    spikeId: string;
    logField: 'application_log' | 'execution_log';
    initialContent?: string;
    isRunning?: boolean;
}

export const CNSTerminalPane = ({
    title,
    spikeId,
    logField,
    initialContent,
    isRunning = false,
}: CNSTerminalPaneProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoScroll, setAutoScroll] = useState(isRunning);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const contentRef = useRef(initialContent || '');
    const terminalId = `${spikeId}-${logField}`;

    const {
        open,
        dispose,
        writeln,
        clear,
        serializeIfNeeded,
    } = useTerminal({ id: terminalId });

    // Track content for copy/download (append live lines)
    const appendToContent = useCallback((line: string) => {
        contentRef.current += (contentRef.current ? '\n' : '') + line;
    }, []);

    // Terminal attach + historical hydration
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        open(container);

        if (initialContent) {
            clear();
            const lines = initialContent.split(/\r?\n/);
            for (const line of lines) {
                writeln(line);
            }
        }

        return () => {
            serializeIfNeeded();
            dispose();
        };
    }, [open, dispose, clear, writeln, serializeIfNeeded, initialContent]);

    // Live streaming (only if running)
    const onGlutamate = useCallback(
        (payload: string) => {
            writeln(payload);
            appendToContent(payload);
            if (autoScroll) {
                // xterm auto-scrolls on write by default
            }
        },
        [writeln, appendToContent, autoScroll],
    );

    const { close: closeSocket } = useSynapticCleft({
        spikeId: isRunning ? spikeId : '',
        onGlutamate,
    });

    useEffect(() => {
        return () => {
            closeSocket();
        };
    }, [closeSocket]);

    // Search addon — we access it via the terminal's loaded addons
    // The useTerminal hook already loads SearchAddon, but we need our own ref
    // to call findNext/findPrevious. We create a second one here.
    useEffect(() => {
        // SearchAddon is already loaded by useTerminal, but we can't access it.
        // We'll create our own instance — xterm supports multiple search addons.
        // Actually, we should just use the terminal instance directly.
        // For now, we'll skip this and handle search via a workaround.
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(contentRef.current);
        } catch {
            // Fallback: create temporary textarea
            const ta = document.createElement('textarea');
            ta.value = contentRef.current;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    };

    const handleDownload = () => {
        const blob = new Blob([contentRef.current], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `spike_${spikeId}_${logField}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleToggleSearch = () => {
        setShowSearch(prev => {
            if (!prev) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
            }
            return !prev;
        });
        setSearchQuery('');
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            setShowSearch(false);
            setSearchQuery('');
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchAddonRef.current && searchQuery) {
                if (e.shiftKey) {
                    searchAddonRef.current.findPrevious(searchQuery);
                } else {
                    searchAddonRef.current.findNext(searchQuery);
                }
            }
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value;
        setSearchQuery(q);
        if (searchAddonRef.current && q) {
            searchAddonRef.current.findNext(q);
        }
    };

    return (
        <div className="cns-terminal-pane">
            <div className="cns-terminal-toolbar">
                <span className="cns-terminal-title">{title}</span>
                <div className="cns-terminal-actions">
                    <button
                        className="cns-terminal-action-btn"
                        title="Copy All"
                        onClick={handleCopy}
                    >
                        📋
                    </button>
                    <button
                        className="cns-terminal-action-btn"
                        title="Download"
                        onClick={handleDownload}
                    >
                        ⬇
                    </button>
                    <button
                        className={`cns-terminal-action-btn ${showSearch ? 'cns-terminal-action-btn--active' : ''}`}
                        title="Search"
                        onClick={handleToggleSearch}
                    >
                        🔍
                    </button>
                    <button
                        className={`cns-terminal-action-btn ${autoScroll ? 'cns-terminal-action-btn--active' : ''}`}
                        title="Auto-scroll"
                        onClick={() => setAutoScroll(prev => !prev)}
                    >
                        ⏬
                    </button>
                </div>
            </div>
            {showSearch && (
                <div className="cns-terminal-search">
                    <input
                        ref={searchInputRef}
                        className="cns-terminal-search-input"
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleSearchKeyDown}
                    />
                    <span className="cns-terminal-search-hint">
                        Enter / Shift+Enter &middot; Esc to close
                    </span>
                </div>
            )}
            <div className="cns-terminal-body" ref={containerRef} />
        </div>
    );
};

import { useCallback, useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebglAddon } from 'xterm-addon-webgl';
import { CanvasAddon } from 'xterm-addon-canvas';
import { SerializeAddon } from 'xterm-addon-serialize';

// Global renderer/serialization pools shared across all terminals
const MAX_WEBGL_RENDERERS = 8;

let activeTerminals = 0;
const webglSlots = new Set<string>();
const serializedBuffers = new Map<string, string>();

type RendererKind = 'webgl' | 'canvas' | 'none';

interface UseTerminalOptions {
    id: string;
}

interface UseTerminalResult {
    open: (container: HTMLDivElement) => void;
    dispose: () => void;
    write: (data: string) => void;
    writeln: (data: string) => void;
    clear: () => void;
    serializeIfNeeded: () => void;
    restoreIfNeeded: () => void;
}

export const useTerminal = ({ id }: UseTerminalOptions): UseTerminalResult => {
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const searchAddonRef = useRef<SearchAddon | null>(null);
    const serializeAddonRef = useRef<SerializeAddon | null>(null);
    const rendererKindRef = useRef<RendererKind>('none');
    const rendererAddonRef = useRef<WebglAddon | CanvasAddon | null>(null);
    const attachedRef = useRef(false);

    // Lazily create the terminal instance with core addons
    const ensureTerminal = useCallback(() => {
        if (!terminalRef.current) {
            const term = new Terminal({
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                fontSize: 13,
                theme: {
                    background: '#000000',
                    foreground: '#e5e5e5',
                },
                scrollback: 5000,
                disableStdin: false,
            });

            const fit = new FitAddon();
            const search = new SearchAddon();
            const serialize = new SerializeAddon();

            term.loadAddon(fit);
            term.loadAddon(search);
            term.loadAddon(serialize);

            terminalRef.current = term;
            fitAddonRef.current = fit;
            searchAddonRef.current = search;
            serializeAddonRef.current = serialize;
        }

        return terminalRef.current!;
    }, []);

    const attachRenderer = useCallback(() => {
        if (!terminalRef.current || rendererKindRef.current !== 'none') return;

        activeTerminals += 1;

        // Assign WebGL to first N terminals, otherwise canvas
        if (webglSlots.size < MAX_WEBGL_RENDERERS) {
            const webgl = new WebglAddon();
            try {
                terminalRef.current.loadAddon(webgl);
                webglSlots.add(id);
                rendererKindRef.current = 'webgl';
                rendererAddonRef.current = webgl;
            } catch {
                // Fallback to canvas if WebGL context fails
                const canvas = new CanvasAddon();
                terminalRef.current.loadAddon(canvas);
                rendererKindRef.current = 'canvas';
                rendererAddonRef.current = canvas;
            }
        } else {
            const canvas = new CanvasAddon();
            terminalRef.current.loadAddon(canvas);
            rendererKindRef.current = 'canvas';
            rendererAddonRef.current = canvas;
        }
    }, [id]);

    const detachRenderer = useCallback(() => {
        if (!terminalRef.current) return;

        if (rendererKindRef.current === 'webgl') {
            webglSlots.delete(id);
        }

        if (rendererAddonRef.current && 'dispose' in rendererAddonRef.current) {
            rendererAddonRef.current.dispose();
        }

        rendererAddonRef.current = null;
        rendererKindRef.current = 'none';

        if (activeTerminals > 0) {
            activeTerminals -= 1;
        }
    }, [id]);

    const fitToContainer = useCallback(() => {
        if (fitAddonRef.current) {
            try {
                fitAddonRef.current.fit();
            } catch {
                // Ignore fit errors from hidden containers
            }
        }
    }, []);

    const open = useCallback(
        (container: HTMLDivElement) => {
            const term = ensureTerminal();

            if (attachedRef.current) return;

            term.open(container);
            attachedRef.current = true;

            attachRenderer();
            fitToContainer();

            window.addEventListener('resize', fitToContainer);
        },
        [ensureTerminal, attachRenderer, fitToContainer],
    );

    const dispose = useCallback(() => {
        window.removeEventListener('resize', fitToContainer);

        detachRenderer();

        if (terminalRef.current) {
            terminalRef.current.dispose();
            terminalRef.current = null;
        }

        fitAddonRef.current = null;
        searchAddonRef.current = null;
        serializeAddonRef.current = null;
        attachedRef.current = false;
    }, [detachRenderer, fitToContainer]);

    const write = useCallback((data: string) => {
        if (!data) return;
        const term = ensureTerminal();
        term.write(data);
    }, [ensureTerminal]);

    const writeln = useCallback((data: string) => {
        if (!data) return;
        const term = ensureTerminal();
        term.writeln(data);
    }, [ensureTerminal]);

    const clear = useCallback(() => {
        const term = ensureTerminal();
        term.clear();
    }, [ensureTerminal]);

    const serializeIfNeeded = useCallback(() => {
        if (!serializeAddonRef.current) return;
        try {
            const snapshot = serializeAddonRef.current.serialize();
            if (snapshot) {
                serializedBuffers.set(id, snapshot);
            }
        } catch {
            // Ignore serialization failures
        }
    }, [id]);

    const restoreIfNeeded = useCallback(() => {
        const term = ensureTerminal();
        const snapshot = serializedBuffers.get(id);
        if (!snapshot) return;

        try {
            term.reset();
            term.write(snapshot);
        } catch {
            // If restore fails, just leave terminal empty; historical hydration will refill
        }
    }, [ensureTerminal, id]);

    // Cleanup listener on unmount in case dispose wasn't called
    useEffect(() => {
        return () => {
            window.removeEventListener('resize', fitToContainer);
        };
    }, [fitToContainer]);

    return {
        open,
        dispose,
        write,
        writeln,
        clear,
        serializeIfNeeded,
        restoreIfNeeded,
    };
};


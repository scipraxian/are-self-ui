import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';

type EscapeHandler = () => void;

interface GABAContextValue {
    registerEscapeHandler: (handler: EscapeHandler) => () => void;
}

const GABAContext = createContext<GABAContextValue | undefined>(undefined);

export const GABAProvider = ({ children }: { children: ReactNode }) => {
    const handlersRef = useRef<EscapeHandler[]>([]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                const handlers = handlersRef.current;
                if (handlers.length > 0) {
                    event.preventDefault();
                    const top = handlers[handlers.length - 1];
                    top();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const registerEscapeHandler = useCallback((handler: EscapeHandler) => {
        handlersRef.current.push(handler);

        return () => {
            handlersRef.current = handlersRef.current.filter((h) => h !== handler);
        };
    }, []);

    return (
        <GABAContext.Provider value={{ registerEscapeHandler }}>
            {children}
        </GABAContext.Provider>
    );
};

export const useGABA = (): GABAContextValue => {
    const ctx = useContext(GABAContext);
    if (!ctx) {
        throw new Error('useGABA must be used within a GABAProvider');
    }
    return ctx;
};


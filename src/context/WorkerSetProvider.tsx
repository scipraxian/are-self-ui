import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface WorkerSetContextType {
    selectedWorkers: string[];
    addWorker: (hostname: string) => void;
    removeWorker: (hostname: string) => void;
    clearWorkers: () => void;
    isSelected: (hostname: string) => boolean;
}

const MAX_WORKERS = 4;

const WorkerSetContext = createContext<WorkerSetContextType>({
    selectedWorkers: [],
    addWorker: () => {},
    removeWorker: () => {},
    clearWorkers: () => {},
    isSelected: () => false,
});

export const WorkerSetProvider = ({ children }: { children: ReactNode }) => {
    const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

    const addWorker = useCallback((hostname: string) => {
        setSelectedWorkers(prev => {
            // Toggle: if already selected, remove it
            if (prev.includes(hostname)) {
                return prev.filter(h => h !== hostname);
            }
            // Adding a 5th replaces the oldest
            if (prev.length >= MAX_WORKERS) {
                return [...prev.slice(1), hostname];
            }
            return [...prev, hostname];
        });
    }, []);

    const removeWorker = useCallback((hostname: string) => {
        setSelectedWorkers(prev => prev.filter(h => h !== hostname));
    }, []);

    const clearWorkers = useCallback(() => {
        setSelectedWorkers([]);
    }, []);

    const isSelected = useCallback((hostname: string) => {
        return selectedWorkers.includes(hostname);
    }, [selectedWorkers]);

    const value = useMemo(() => ({
        selectedWorkers,
        addWorker,
        removeWorker,
        clearWorkers,
        isSelected,
    }), [selectedWorkers, addWorker, removeWorker, clearWorkers, isSelected]);

    return (
        <WorkerSetContext.Provider value={value}>
            {children}
        </WorkerSetContext.Provider>
    );
};

export const useWorkerSet = () => useContext(WorkerSetContext);

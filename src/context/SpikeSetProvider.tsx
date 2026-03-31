import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export interface SpikeSetItem {
    spikeId: string;
    label: string;
    trainHash: string;
}

interface SpikeSetContextType {
    selectedSpikes: SpikeSetItem[];
    addSpike: (item: SpikeSetItem) => void;
    removeSpike: (spikeId: string) => void;
    clearSpikes: () => void;
    isSelected: (spikeId: string) => boolean;
}

const MAX_SPIKES = 4;

const SpikeSetContext = createContext<SpikeSetContextType>({
    selectedSpikes: [],
    addSpike: () => {},
    removeSpike: () => {},
    clearSpikes: () => {},
    isSelected: () => false,
});

export const SpikeSetProvider = ({ children }: { children: ReactNode }) => {
    const [selectedSpikes, setSelectedSpikes] = useState<SpikeSetItem[]>([]);

    const addSpike = useCallback((item: SpikeSetItem) => {
        setSelectedSpikes(prev => {
            // Toggle: if already selected, remove it
            if (prev.some(s => s.spikeId === item.spikeId)) {
                return prev.filter(s => s.spikeId !== item.spikeId);
            }
            // Adding a 5th replaces the oldest
            if (prev.length >= MAX_SPIKES) {
                return [...prev.slice(1), item];
            }
            return [...prev, item];
        });
    }, []);

    const removeSpike = useCallback((spikeId: string) => {
        setSelectedSpikes(prev => prev.filter(s => s.spikeId !== spikeId));
    }, []);

    const clearSpikes = useCallback(() => {
        setSelectedSpikes([]);
    }, []);

    const isSelected = useCallback((spikeId: string) => {
        return selectedSpikes.some(s => s.spikeId === spikeId);
    }, [selectedSpikes]);

    const value = useMemo(() => ({
        selectedSpikes,
        addSpike,
        removeSpike,
        clearSpikes,
        isSelected,
    }), [selectedSpikes, addSpike, removeSpike, clearSpikes, isSelected]);

    return (
        <SpikeSetContext.Provider value={value}>
            {children}
        </SpikeSetContext.Provider>
    );
};

export const useSpikeSet = () => useContext(SpikeSetContext);

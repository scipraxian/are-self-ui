import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../api';

interface Environment {
    id: string;
    name: string;
}

interface EnvironmentContextType {
    environments: Environment[];
    selectedEnvironmentId: string;
    setSelectedEnvironmentId: (id: string) => void;
    isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType>({
    environments: [],
    selectedEnvironmentId: '',
    setSelectedEnvironmentId: () => {},
    isLoading: true,
});

export function EnvironmentProvider({ children }: { children: ReactNode }) {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await apiFetch('/api/v1/environments/');
                if (!res.ok) return;
                const data = await res.json();
                const envs: Environment[] = Array.isArray(data) ? data : data.results ?? [];
                setEnvironments(envs);
            } catch (err) {
                console.error('Failed to fetch environments', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const value = useMemo(() => ({
        environments,
        selectedEnvironmentId,
        setSelectedEnvironmentId,
        isLoading,
    }), [environments, selectedEnvironmentId, isLoading]);

    return (
        <EnvironmentContext.Provider value={value}>
            {children}
        </EnvironmentContext.Provider>
    );
}

export const useEnvironment = () => useContext(EnvironmentContext);

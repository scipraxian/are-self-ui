import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiFetch } from '../api';

export interface ContextVariable {
    id: number;
    key: number;
    key_name: string;
    value: string;
    environment: string;
}

export interface Environment {
    id: string;
    name: string;
    description: string | null;
    type: number;
    type_name: string;
    status: number;
    status_name: string;
    available: boolean;
    selected: boolean;
    default_iteration_definition: number | null;
    contexts: ContextVariable[];
    created: string;
    modified: string;
}

interface EnvironmentContextType {
    environments: Environment[];
    selectedEnvironmentId: string;
    selectEnvironment: (id: string) => void;
    refreshEnvironments: () => void;
    isLoading: boolean;
}

const EnvironmentContext = createContext<EnvironmentContextType>({
    environments: [],
    selectedEnvironmentId: '',
    selectEnvironment: () => {},
    refreshEnvironments: () => {},
    isLoading: true,
});

export function EnvironmentProvider({ children }: { children: ReactNode }) {
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [selectedEnvironmentId, setSelectedEnvironmentId] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const loadEnvironments = useCallback(async () => {
        try {
            const res = await apiFetch('/api/v2/environments/');
            if (!res.ok) return;
            const data = await res.json();
            const envs: Environment[] = Array.isArray(data) ? data : data.results ?? [];
            setEnvironments(envs);

            const selected = envs.find((e: Environment) => e.selected);
            if (selected) {
                setSelectedEnvironmentId(selected.id);
            }
        } catch (err) {
            console.error('Failed to fetch environments', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/environments/');
                if (!res.ok || cancelled) return;
                const data = await res.json();
                const envs: Environment[] = Array.isArray(data) ? data : data.results ?? [];
                if (cancelled) return;
                setEnvironments(envs);

                const selected = envs.find((e: Environment) => e.selected);
                if (selected && !cancelled) {
                    setSelectedEnvironmentId(selected.id);
                }
            } catch (err) {
                console.error('Failed to fetch environments', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);

    const selectEnvironment = useCallback(async (envId: string) => {
        setSelectedEnvironmentId(envId);
        if (envId) {
            try {
                await apiFetch(`/api/v2/environments/${envId}/select/`, { method: 'POST' });
                setEnvironments(prev => prev.map(e => ({ ...e, selected: e.id === envId })));
            } catch (err) {
                console.error('Failed to select environment', err);
            }
        }
    }, []);

    const refreshEnvironments = useCallback(() => {
        loadEnvironments();
    }, [loadEnvironments]);

    const value = useMemo(() => ({
        environments,
        selectedEnvironmentId,
        selectEnvironment,
        refreshEnvironments,
        isLoading,
    }), [environments, selectedEnvironmentId, selectEnvironment, refreshEnvironments, isLoading]);

    return (
        <EnvironmentContext.Provider value={value}>
            {children}
        </EnvironmentContext.Provider>
    );
}

export const useEnvironment = () => useContext(EnvironmentContext);

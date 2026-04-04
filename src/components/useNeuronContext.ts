import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api';

interface ContextRow {
    key: string;
    value: string;
    display_value: string;
}

/**
 * Shared hook for custom node components to fetch and edit NeuronContext.
 * Mirrors the same REST pattern used by CNSInspector / CNSEditPage.
 */
export function useNeuronContext(neuronId: string) {
    const [context, setContext] = useState<Record<string, string>>({});
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!neuronId) return;
        apiFetch(`/api/v1/neurons/${neuronId}/inspector_details/`)
            .then(res => res.json())
            .then(details => {
                const ctx: Record<string, string> = {};
                (details.context_matrix || []).forEach((row: ContextRow) => {
                    ctx[row.key] = row.display_value || row.value;
                });
                setContext(ctx);
                setLoaded(true);
            })
            .catch(() => setLoaded(true));
    }, [neuronId]);

    const updateContext = useCallback(async (key: string, value: string) => {
        if (!neuronId) return;
        try {
            const searchRes = await apiFetch(
                `/api/v1/node-contexts/?neuron=${neuronId}&key=${key}`
            );
            const searchData = await searchRes.json();
            const existing = searchData.results?.[0] ?? null;

            if (!value) {
                if (existing) {
                    await apiFetch(`/api/v1/node-contexts/${existing.id}/`, { method: 'DELETE' });
                }
            } else if (existing) {
                await apiFetch(`/api/v1/node-contexts/${existing.id}/`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ value }),
                });
            } else {
                await apiFetch(`/api/v1/node-contexts/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ neuron: neuronId, key, value }),
                });
            }

            // Update local state
            setContext(prev => ({ ...prev, [key]: value }));

            // Notify inspector panel to refresh if it's open on this node
            window.dispatchEvent(
                new CustomEvent('cns-context-changed', { detail: { neuronId, key, value } })
            );
        } catch (err) {
            console.error('Failed to sync context:', err);
        }
    }, [neuronId]);

    return { context, loaded, updateContext };
}

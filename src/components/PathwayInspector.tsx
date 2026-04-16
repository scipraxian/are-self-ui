import "./PathwayInspector.css";
import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { apiFetch } from '../api';

interface PathwayInspectorProps {
    pathwayId: string;
}

interface PathwayDetails {
    id: string;
    name: string;
    environment?: string | null;
    environment_name?: string | null;
}

interface EnvironmentOption {
    id: string;
    name: string;
}

export const PathwayInspector = ({ pathwayId }: PathwayInspectorProps) => {
    const [details, setDetails] = useState<PathwayDetails | null>(null);
    const [environments, setEnvironments] = useState<EnvironmentOption[]>([]);
    const [isLoadingEnvs, setIsLoadingEnvs] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch pathway details
    useEffect(() => {
        if (!pathwayId) return;
        let isMounted = true;

        apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setDetails(data);
            })
            .catch(console.error);

        return () => {
            isMounted = false;
        };
    }, [pathwayId]);

    // Fetch environments on mount
    useEffect(() => {
        let cancelled = false;

        const loadEnvironments = async () => {
            try {
                setIsLoadingEnvs(true);
                const res = await apiFetch('/api/v2/environments/');

                if (cancelled) return;

                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setEnvironments(data);
                    } else if (data.results) {
                        setEnvironments(data.results);
                    }
                }
            } catch (err) {
                console.error('Failed to load environments:', err);
            } finally {
                if (!cancelled) {
                    setIsLoadingEnvs(false);
                }
            }
        };

        loadEnvironments();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleEnvironmentChange = async (envId: string | null) => {
        if (!pathwayId) return;
        setIsSaving(true);
        try {
            const response = await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ environment: envId }),
            });

            if (response.ok) {
                const updatedData = await response.json();
                setDetails(prev => prev ? {
                    ...prev,
                    environment: updatedData.environment ?? null,
                    environment_name: updatedData.environment_name ?? null,
                } : null);
            } else {
                console.error('Failed to update pathway environment');
            }
        } catch (err) {
            console.error('Error updating pathway environment:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!details) {
        return <div className="pathway-inspector-loading">Loading pathway...</div>;
    }

    return (
        <div className="pathway-inspector-root">
            <div className="pathway-inspector-header">
                <div className="pathway-inspector-header-content">
                    <Settings size={14} />
                    <span className="pathway-inspector-title">{details.name}</span>
                </div>
            </div>

            <div className="pathway-inspector-body">
                <div className="pathway-inspector-section">
                    <label className="pathway-inspector-label">PATHWAY ENVIRONMENT</label>
                    <select
                        className="pathway-inspector-select"
                        value={details.environment || ''}
                        onChange={(e) => handleEnvironmentChange(e.target.value || null)}
                        disabled={isSaving || isLoadingEnvs}
                    >
                        <option value="">Inherit</option>
                        {environments.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                    </select>

                    {details.environment && (
                        <div className="pathway-inspector-override">
                            <span className="pathway-inspector-override-badge">OVERRIDE: {details.environment_name}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

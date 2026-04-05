import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { CNSEditorPalette } from '../components/CNSEditorPalette';
import { CNSEditor } from '../components/CNSEditor';
import { CNSInspector } from '../components/CNSInspector';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import { apiFetch } from '../api';
import type { GraphNode } from '../types';

export function CNSEditPage() {
    const { pathwayId } = useParams<{ pathwayId: string }>();
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [pathwayName, setPathwayName] = useState('');

    const fetchPathwayName = useCallback(async () => {
        if (!pathwayId) return;
        try {
            const res = await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/`);
            if (!res.ok) return;
            const data = await res.json();
            setPathwayName(data.name || '');
        } catch {
            // ignore
        }
    }, [pathwayId]);

    useEffect(() => {
        fetchPathwayName();
    }, [fetchPathwayName]);

    useEffect(() => {
        setCrumbs([
            { label: 'Central Nervous System', path: '/cns' },
            ...(pathwayName
                ? [{ label: pathwayName, path: `/cns/pathway/${pathwayId}` }]
                : []),
            { label: 'Edit', path: `/cns/pathway/${pathwayId}/edit` },
        ]);
        return () => setCrumbs([]);
    }, [pathwayId, pathwayName, setCrumbs]);

    if (!pathwayId) return null;

    return (
        <ThreePanel
            centerClassName="three-panel-center--cns-graph"
            left={
                <CNSEditorPalette
                    pathwayId={pathwayId}
                    onBack={() => navigate(`/cns/pathway/${pathwayId}`)}
                />
            }
            center={
                <CNSEditor
                    pathwayId={pathwayId}
                    onDrillDown={(id) => navigate(`/cns/pathway/${id}/edit`)}
                    onNodeSelect={setSelectedNode}
                    onNodeDoubleClick={(effectorId) => navigate(`/cns/effector/${effectorId}/edit`)}
                    onLaunch={(trainId) => navigate(`/cns/spiketrain/${trainId}`)}
                    isMonitorMode={false}
                />
            }
            right={
                <CNSInspector
                    node={selectedNode}
                    pathwayId={pathwayId}
                    onDelete={(id) => {
                        apiFetch(`/api/v2/neurons/${id}/`, { method: 'DELETE' })
                            .then(() => {
                                window.dispatchEvent(
                                    new CustomEvent('cns-node-deleted', { detail: id })
                                );
                            })
                            .catch(console.error);
                    }}
                    onContextChange={async (nodeId, key, value) => {
                        try {
                            const searchRes = await apiFetch(
                                `/api/v1/node-contexts/?neuron=${nodeId}&key=${key}`
                            );
                            const searchData = await searchRes.json();
                            const existing =
                                searchData.results && searchData.results.length > 0
                                    ? searchData.results[0]
                                    : null;

                            if (!value) {
                                if (existing) {
                                    await apiFetch(`/api/v1/node-contexts/${existing.id}/`, {
                                        method: 'DELETE',
                                    });
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
                                    body: JSON.stringify({ neuron: nodeId, key, value }),
                                });
                            }
                        } catch (err) {
                            console.error('Failed to sync context override via REST:', err);
                        }
                    }}
                />
            }
        />
    );
}

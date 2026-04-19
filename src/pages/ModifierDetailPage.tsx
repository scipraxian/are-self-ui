import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { apiFetch } from '../api';
import { ModifierEventList } from '../components/ModifierEventList';
import { ModifierStatusPill } from '../components/ModifierStatusPill';
import { useDendrite } from '../components/SynapticCleft';
import { ThreePanel } from '../components/ThreePanel';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import type { NeuralModifierDetail } from '../types';
import './ModifierDetailPage.css';

export function ModifierDetailPage() {
    const { slug = '' } = useParams<{ slug: string }>();
    const { setCrumbs } = useBreadcrumbs();

    const [detail, setDetail] = useState<NeuralModifierDetail | null>(null);
    const [notFound, setNotFound] = useState(false);
    const modifierEvent = useDendrite('NeuralModifier', null);

    useEffect(() => {
        setCrumbs([
            { label: 'Neuroplasticity', path: '/modifiers' },
            { label: slug, path: `/modifiers/${slug}` },
        ]);
        return () => setCrumbs([]);
    }, [slug, setCrumbs]);

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        const load = async () => {
            try {
                const res = await apiFetch(`/api/v2/neural-modifiers/${slug}/`);
                if (cancelled) return;
                if (res.status === 404) {
                    setNotFound(true);
                    setDetail(null);
                    return;
                }
                if (!res.ok) return;
                const data = (await res.json()) as NeuralModifierDetail;
                if (!cancelled) {
                    setDetail(data);
                    setNotFound(false);
                }
            } catch (err) {
                console.error('Failed to load modifier detail', err);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [slug, modifierEvent]);

    if (notFound) {
        return (
            <ThreePanel
                center={
                    <div className="modifier-detail-empty">
                        No NeuralModifier with slug <code>{slug}</code>.
                    </div>
                }
            />
        );
    }

    if (!detail) {
        return (
            <ThreePanel
                center={<div className="modifier-detail-empty">Loading…</div>}
            />
        );
    }

    const left = (
        <div className="modifier-detail-sidebar">
            <h2 className="modifier-detail-sidebar-title">{detail.name}</h2>
            <div className="modifier-detail-status-row">
                <ModifierStatusPill
                    statusId={detail.status_id}
                    statusName={detail.status_name}
                />
            </div>
            <dl className="modifier-detail-meta">
                <div>
                    <dt>Slug</dt>
                    <dd><code>{detail.slug}</code></dd>
                </div>
                <div>
                    <dt>Version</dt>
                    <dd><code>{detail.version}</code></dd>
                </div>
                <div>
                    <dt>Author</dt>
                    <dd>{detail.author}</dd>
                </div>
                <div>
                    <dt>License</dt>
                    <dd>{detail.license}</dd>
                </div>
                <div>
                    <dt>Contributions</dt>
                    <dd><code>{detail.contribution_count}</code></dd>
                </div>
                <div>
                    <dt>Hash</dt>
                    <dd className="modifier-detail-hash"><code>{detail.manifest_hash}</code></dd>
                </div>
            </dl>
        </div>
    );

    const center = (
        <div className="modifier-detail-center">
            <section className="modifier-detail-section">
                <h3 className="modifier-detail-section-title">Manifest</h3>
                <pre className="modifier-detail-manifest">
                    {JSON.stringify(detail.manifest_json, null, 2)}
                </pre>
            </section>

            <section className="modifier-detail-section">
                <h3 className="modifier-detail-section-title">Installation history</h3>
                <ModifierEventList logs={detail.installation_logs} />
            </section>
        </div>
    );

    return <ThreePanel left={left} center={center} />;
}

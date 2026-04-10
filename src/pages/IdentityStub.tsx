import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, Brain } from 'lucide-react';
import { HelpTip } from '../components/HelpTip';
import { ThreePanel } from '../components/ThreePanel';
import { IdentityRoster } from '../components/IdentityRoster';
import { apiFetch } from '../api';
import { useBreadcrumbs } from '../context/BreadcrumbProvider';
import './IdentityStub.css';

interface IdentityTypeOption {
    id: string | number;
    name: string;
}

export function IdentityStub() {
    const navigate = useNavigate();
    const { setCrumbs } = useBreadcrumbs();

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createTypeId, setCreateTypeId] = useState<string>('');
    const [identityTypes, setIdentityTypes] = useState<IdentityTypeOption[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [rosterKey, setRosterKey] = useState(0);

    useEffect(() => {
        setCrumbs([{
            label: 'Identity Ledger',
            path: '/identity',
            tip: 'Identities are AI persona blueprints — system prompt, tools, addons, model routing. Forged into IdentityDiscs when slotted into a shift.',
            doc: 'docs/brain-regions/identity',
        }]);
        return () => setCrumbs([]);
    }, [setCrumbs]);

    useEffect(() => {
        if (!showCreateForm) return;
        let cancelled = false;

        const load = async () => {
            try {
                const res = await apiFetch('/api/v2/identity_types/');
                if (cancelled || !res.ok) return;
                const data = await res.json();
                if (cancelled) return;
                setIdentityTypes(data.results || data);
            } catch (err) {
                console.error('Failed to fetch identity types', err);
            }
        };

        load();
        return () => { cancelled = true; };
    }, [showCreateForm]);

    const handleCreate = async () => {
        if (!createName.trim()) return;
        setIsCreating(true);
        setCreateError(null);
        try {
            const payload: Record<string, string> = { name: createName.trim() };
            if (createTypeId) payload.identity_type = createTypeId;

            const res = await apiFetch('/api/v2/identities/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Create failed (${res.status})`);
            const created = await res.json();
            setShowCreateForm(false);
            setCreateName('');
            setCreateTypeId('');
            setRosterKey(prev => prev + 1);
            navigate(`/identity/${created.id}?type=base`);
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : 'Failed to create identity.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <ThreePanel
            left={
                <>
                    <div className="identity-page-header">
                        <h2 className="glass-panel-title">
                            <Brain size={18} style={{ color: '#38bdf8', marginRight: '8px', verticalAlign: 'middle' }} />
                            IDENTITY ROSTER
                        </h2>
                        <HelpTip
                            tip="Identities are AI persona blueprints — system prompt, tools, addons, model routing. Forged into IdentityDiscs when slotted into a Temporal shift."
                            doc="docs/ui/identity"
                            placement="right"
                        />
                    </div>
                    {!showCreateForm ? (
                        <button
                            className="btn-action identity-create-btn"
                            onClick={() => setShowCreateForm(true)}
                        >
                            <Plus size={14} /> CREATE IDENTITY
                        </button>
                    ) : (
                        <div className="identity-create-form">
                            <input
                                className="loadout-input"
                                type="text"
                                placeholder="Identity name..."
                                value={createName}
                                onChange={(e) => setCreateName(e.target.value)}
                                autoFocus
                            />
                            <select
                                className="loadout-input"
                                value={createTypeId}
                                onChange={(e) => setCreateTypeId(e.target.value)}
                            >
                                <option value="">-- Identity Type --</option>
                                {identityTypes.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            {createError && (
                                <span className="font-mono text-xs identity-create-form-error">{createError}</span>
                            )}
                            <div className="identity-create-form-actions">
                                <button
                                    className="btn-primary"
                                    onClick={handleCreate}
                                    disabled={isCreating || !createName.trim()}
                                >
                                    {isCreating ? <Loader2 className="animate-spin" size={12} /> : 'Create'}
                                </button>
                                <button
                                    className="btn-secondary-outline"
                                    onClick={() => { setShowCreateForm(false); setCreateError(null); }}
                                    disabled={isCreating}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                    <IdentityRoster
                        key={rosterKey}
                        onSelectIdentity={(id, type) => navigate(`/identity/${id}?type=${type}`)}
                    />
                </>
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/')}>
                        ✕
                    </button>
                    <div className="layout-placeholder font-mono text-sm">
                        Select an identity from the roster to view synaptic data.
                    </div>
                </div>
            }
            right={null}
        />
    );
}

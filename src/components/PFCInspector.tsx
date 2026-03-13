import "./PFCInspector.css";
import { useState, useEffect, type ReactNode } from 'react';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import { Target, ListChecks, ShieldAlert, Zap, AlertTriangle, Link2, Cpu, Globe, MessageSquare, Trash2 } from 'lucide-react';

interface PFCInspectorProps {
    item: PFCAgileItem;
    onUpdate: () => void;
    onDelete: () => void;
}

interface AccordionProps {
    title: string;
    color: string;
    icon?: ReactNode;
    open?: boolean;
    children: ReactNode;
}

const Accordion = ({ title, color, icon, open = false, children }: AccordionProps) => {
    return (
        <details open={open} style={{ marginBottom: '10px', border: `1px solid ${color}40`, borderRadius: '8px', background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <summary style={{ backgroundColor: `${color}20`, color: color, padding: '8px 15px', fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {icon}
                <span>{title}</span>
            </summary>
            <div className="pfcinspector-ui-135">
                {children}
            </div>
        </details>
    );
};

export const PFCInspector = ({ item, onUpdate, onDelete }: PFCInspectorProps) => {
    const [localData, setLocalData] = useState<PFCAgileItem>(item);
    const [environments, setEnvironments] = useState<{id: string, name: string}[]>([]);

    const [newComment, setNewComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        let isMounted = true;
        apiFetch('/api/v1/environments/')
            .then(res => res.json())
            .then(data => {
                if (isMounted) setEnvironments(data.results || data);
            })
            .catch(console.error);
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        setLocalData(item);
    }, [item]);

    const getItemColor = (type: string) => {
        if (type === 'EPIC') return '#a855f7';
        if (type === 'STORY') return '#3b82f6';
        return '#4ade80';
    };

    const endpointMap = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
    const color = getItemColor(item.item_type);

    const handleSave = async (field: keyof PFCAgileItem, value: string | number | undefined) => {
        // Only skip if the value truly matches the original item, not the local draft
        if (item[field] === value) return;

        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });

            if (res.ok) {
                onUpdate();
            }
        } catch (err) {
            console.error(`Failed to update ${field}:`, err);
        }
    };

    const handleDeleteTicket = async () => {
        if (!confirm(`WARNING: Are you sure you want to permanently delete this ${item.item_type}? This action cannot be undone.`)) return;

        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'DELETE'
            });

            if (res.ok || res.status === 204) {
                onUpdate();
                onDelete();
            }
        } catch (err) {
            console.error(`Failed to delete ${item.item_type}:`, err);
        }
    };

    const handleEnvironmentChange = async (envId: string | null) => {
        const envObj = environments.find(env => env.id === envId) || null;
        setLocalData(prev => ({ ...prev, environment: envObj }));

        try {
            const res = await apiFetch(`/api/v2/pfc-epics/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ environment: envId })
            });
            if (res.ok) onUpdate();
        } catch (err) {
            console.error("Failed to update environment", err);
        }
    };

    const handlePriorityChange = async (direction: 'up' | 'down') => {
        const current = localData.priority || 3;
        let next = current;

        if (direction === 'up' && current > 1) next = current - 1;
        if (direction === 'down' && current < 4) next = current + 1;

        if (next === current) return;

        setLocalData(prev => ({ ...prev, priority: next }));

        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority: next })
            });
            if (res.ok) onUpdate();
        } catch (err) {
            console.error("Failed to update priority", err);
        }
    };

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        setIsPosting(true);
        try {
            const targetField = item.item_type.toLowerCase();
            const payload = {
                text: newComment,
                [targetField]: item.id
            };

            const res = await apiFetch(`/api/v2/pfc-comments/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNewComment("");
                onUpdate();
            }
        } catch (err) {
            console.error("Failed to post comment", err);
        } finally {
            setIsPosting(false);
        }
    };

    const getPriorityLabel = (p?: number) => {
        switch(p) {
            case 1: return "P1: CRITICAL";
            case 2: return "P2: HIGH";
            case 3: return "P3: NORMAL";
            case 4: return "P4: LOW";
            default: return "P3: NORMAL";
        }
    };

    const renderTextarea = (field: keyof PFCAgileItem, placeholder: string) => (
        <textarea className="pfcinspector-ui-134"
            value={localData[field] as string || ''}
            placeholder={placeholder}
            onChange={(e) => setLocalData({ ...localData, [field]: e.target.value })}
            onBlur={(e) => handleSave(field, e.target.value)}
        />
    );

    return (
        <div className="scroll-hidden common-layout-8">
            <div className="common-layout-9">

                {/* Header */}
                <div className="pfcinspector-ui-133">
                    <div className="pfcinspector-ui-132">
                        <div className="common-layout-15">
                            <span className="font-mono text-xs" style={{ background: `${color}20`, color: color, padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                                {item.item_type}
                            </span>
                            <span className="font-mono text-xs text-muted">ID: {item.id.split('-')[0]}</span>
                        </div>

                        <div className="pfcinspector-ui-131">
                            <button
                                onClick={() => handlePriorityChange('up')}
                                disabled={localData.priority === 1}
                                style={{ background: 'transparent', border: 'none', color: localData.priority === 1 ? '#333' : '#e2e8f0', cursor: localData.priority === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center' }}
                            >
                                ▲
                            </button>
                            <span className="font-mono text-xs" style={{ color: localData.priority === 1 ? '#ef4444' : localData.priority === 2 ? '#f99f1b' : '#94a3b8', width: '85px', textAlign: 'center', fontWeight: 800 }}>
                                {getPriorityLabel(localData.priority)}
                            </span>
                            <button
                                onClick={() => handlePriorityChange('down')}
                                disabled={localData.priority === 4}
                                style={{ background: 'transparent', border: 'none', color: localData.priority === 4 ? '#333' : '#e2e8f0', cursor: localData.priority === 4 ? 'not-allowed' : 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center' }}
                            >
                                ▼
                            </button>
                        </div>
                    </div>

                    <input className="pfcinspector-ui-130"
                        value={localData.name}
                        onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
                        onBlur={(e) => handleSave('name', e.target.value)}
                        onFocus={(e) => e.target.style.borderColor = 'var(--border-glass-strong)'}
                    />
                </div>

                {item.item_type === 'EPIC' && (
                    <div className="pfcinspector-ui-129">
                        <Globe size={16} color="#38bdf8" />
                        <span className="font-mono text-xs pfcinspector-ui-128">ENVIRONMENT:</span>
                        <select className="pfcinspector-ui-127"
                            value={localData.environment?.id || ''}
                            onChange={(e) => handleEnvironmentChange(e.target.value || null)}
                        >
                            <option value="">Global (Unscoped)</option>
                            {environments.map(env => (
                                <option key={env.id} value={env.id}>{env.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="common-layout-6">

                    {/* Core Description */}
                    <div className="pfcinspector-ui-126">
                        <div className="pfcinspector-ui-125">Description</div>
                        {renderTextarea('description', 'Enter general description...')}
                    </div>

                    {/* ASSIGNMENT & HISTORY - Re-added with 'open' prop so it's visible by default */}
                    <Accordion title="Assignment & Chain of Custody" color="#facc15" icon={<Cpu size={14}/>} open>
                        <div className="pfcinspector-ui-124">
                            <div className="common-layout-15">
                                <span className="pfcinspector-ui-123">ACTIVE OWNER:</span>
                                {item.owning_disc ? (
                                    <span className="pfcinspector-ui-122">
                                        {item.owning_disc.name}
                                    </span>
                                ) : (
                                    <span className="pfcinspector-ui-121">Unassigned / Backlog</span>
                                )}
                            </div>
                            <div className="pfcinspector-ui-120">
                                <span className="pfcinspector-ui-119">PREVIOUS:</span>
                                <div className="pfcinspector-ui-118">
                                    {item.previous_owners && item.previous_owners.length > 0 ? (
                                        item.previous_owners.map(prev => (
                                            <span className="pfcinspector-ui-117" key={prev.id}>
                                                {prev.name}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="pfcinspector-ui-116">No prior chain of custody</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Accordion>

                    {/* Definition of Ready / Done Data */}
                    <Accordion title="Perspective (The Why/Who)" color="#38bdf8" icon={<Target size={14}/>} open>
                        {renderTextarea('perspective', 'e.g. As a User, I want to...')}
                    </Accordion>

                    <Accordion title="Assertions (Success Criteria)" color="#4ade80" icon={<ListChecks size={14}/>} open>
                        {renderTextarea('assertions', '- Assert that the system does X\n- Assert that Y is returned')}
                    </Accordion>

                    <Accordion title="Outside (Negative Constraints)" color="#ef4444" icon={<ShieldAlert size={14}/>}>
                        {renderTextarea('outside', 'What should the AI specifically AVOID doing?')}
                    </Accordion>

                    <Accordion title="Dependencies" color="#facc15" icon={<Link2 size={14}/>}>
                        {renderTextarea('dependencies', 'Required blockers or preceding tickets...')}
                    </Accordion>

                    <Accordion title="DoD Exceptions" color="#f99f1b" icon={<AlertTriangle size={14}/>}>
                        {renderTextarea('dod_exceptions', 'Any exceptions to the standard Definition of Done...')}
                    </Accordion>

                    <Accordion title="Demo Specifics" color="#a855f7" icon={<Zap size={14}/>}>
                        {renderTextarea('demo_specifics', 'How will this be demonstrated at the end of the shift?')}
                    </Accordion>

                    {/* COMMENTS BLOCK */}
                    <Accordion title={`Communication Log (${item.comments?.length || 0})`} color="#e2e8f0" icon={<MessageSquare size={14}/>} open>
                        <div className="pfcinspector-ui-115">
                            <div className="pfcinspector-ui-114">
                                {item.comments && item.comments.length > 0 ? item.comments.map(c => (
                                    <div key={c.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', borderLeft: `2px solid ${c.user ? '#38bdf8' : '#f99f1b'}` }}>
                                        <div className="pfcinspector-ui-113">
                                            <span style={{ fontWeight: 'bold', color: c.user ? '#38bdf8' : '#f99f1b' }}>{c.user ? c.user.username : 'Are-Self (System)'}</span>
                                            <span>{new Date(c.created).toLocaleString()}</span>
                                        </div>
                                        <div className="pfcinspector-ui-112">
                                            {c.text}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="pfcinspector-ui-111">No communication logged.</div>
                                )}
                            </div>

                            <div className="pfcinspector-ui-110">
                                <textarea className="pfcinspector-ui-109"
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Add a directive or comment..."
                                    onFocus={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--border-glass)'}
                                />
                                <button
                                    onClick={handlePostComment}
                                    disabled={!newComment.trim() || isPosting}
                                    style={{ alignSelf: 'flex-end', background: '#e2e8f0', color: '#020617', border: 'none', padding: '6px 16px', borderRadius: '4px', fontWeight: 800, fontSize: '0.75rem', cursor: newComment.trim() && !isPosting ? 'pointer' : 'not-allowed', opacity: newComment.trim() && !isPosting ? 1 : 0.5, transition: 'all 0.2s', textTransform: 'uppercase' }}
                                >
                                    {isPosting ? 'Transmitting...' : 'Send Message'}
                                </button>
                            </div>
                        </div>
                    </Accordion>

                </div>
            </div>

            <div className="pfcinspector-ui-108">
                <a
                    href={`http://localhost:8000/admin/prefrontal_cortex/pfc${item.item_type.toLowerCase()}/${item.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '10px', backgroundColor: 'transparent',
                        color: color, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1rem',
                        textDecoration: 'none', borderRadius: '8px', border: `1px solid ${color}`,
                        textTransform: 'uppercase', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = `${color}20`; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    ADVANCED DB RECORD ↗
                </a>
                <button className="pfcinspector-ui-107"
                    onClick={handleDeleteTicket}
                    title="Permanently Delete Ticket"
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; e.currentTarget.style.borderColor = '#ef4444'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)'; }}
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
};
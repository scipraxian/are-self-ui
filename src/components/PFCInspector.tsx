import "./PFCInspector.css";
import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import type { PFCItemStatus } from './PrefrontalCortex';
import { Target, ListChecks, ShieldAlert, Zap, AlertTriangle, Link2, Cpu, Globe, MessageSquare, Trash2, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

interface PFCInspectorProps {
    item: PFCAgileItem;
    allItems: PFCAgileItem[];
    statuses: PFCItemStatus[];
    onUpdate: () => void;
    onDelete: () => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

interface AccordionProps {
    title: string;
    variant: 'epic' | 'story' | 'task';
    icon?: ReactNode;
    open?: boolean;
    children: ReactNode;
}

const Accordion = ({ title, variant, icon, open = false, children }: AccordionProps) => {
    return (
        <details open={open} className={`pfcinspector-accordion pfcinspector-accordion--${variant}`}>
            <summary className="pfcinspector-accordion-summary">
                {icon}
                <span>{title}</span>
            </summary>
            <div className="pfcinspector-accordion-content">
                {children}
            </div>
        </details>
    );
};

export const PFCInspector = ({ item, allItems, statuses, onUpdate, onDelete, isExpanded, onToggleExpand }: PFCInspectorProps) => {
    const navigate = useNavigate();
    const [localData, setLocalData] = useState<PFCAgileItem>(item);
    const [environments, setEnvironments] = useState<{id: string, name: string}[]>([]);
    const [identityDiscs, setIdentityDiscs] = useState<{id: string, name: string}[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isPosting, setIsPosting] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const loadEnvs = async () => {
            try {
                const res = await apiFetch('/api/v1/environments/');
                const data = await res.json();
                if (isMounted) setEnvironments(data.results || data);
            } catch (err) { console.error(err); }
        };

        const loadDiscs = async () => {
            try {
                const res = await apiFetch('/api/v2/identity-discs/');
                const data = await res.json();
                if (isMounted) setIdentityDiscs(data.results || data);
            } catch (err) { console.error(err); }
        };

        loadEnvs();
        loadDiscs();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        setLocalData(item);
    }, [item]);

    const endpointMap: Record<string, string> = { EPIC: 'pfc-epics', STORY: 'pfc-stories', TASK: 'pfc-tasks' };
    const typeClass = item.item_type.toLowerCase() as 'epic' | 'story' | 'task';

    const handleSave = async (field: keyof PFCAgileItem, value: string | number | undefined) => {
        if (item[field] === value) return;
        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            if (res.ok) onUpdate();
        } catch (err) {
            console.error(`Failed to update ${field}:`, err);
        }
    };

    const handleStatusChange = async (statusId: string) => {
        const numId = Number(statusId);
        const statusObj = statuses.find(s => s.id === numId);
        if (statusObj) {
            setLocalData(prev => ({ ...prev, status: statusObj }));
        }
        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: numId })
            });
            if (res.ok) onUpdate();
        } catch (err) {
            console.error("Failed to update status:", err);
        }
    };

    const handleAssigneeChange = async (discId: string) => {
        const numId = discId ? Number(discId) : null;
        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owning_disc: numId })
            });
            if (res.ok) onUpdate();
        } catch (err) {
            console.error("Failed to update assignee:", err);
        }
    };

    const handleDeleteTicket = async () => {
        if (!confirm(`WARNING: Are you sure you want to permanently delete this ${item.item_type}? This action cannot be undone.`)) return;
        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, { method: 'DELETE' });
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
            const res = await apiFetch(`/api/v2/pfc-comments/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newComment, [targetField]: item.id })
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
        <textarea className="pfc-inspector-textarea"
            value={localData[field] as string || ''}
            placeholder={placeholder}
            onChange={(e) => setLocalData({ ...localData, [field]: e.target.value })}
            onBlur={(e) => handleSave(field, e.target.value)}
        />
    );

    // Completion stats for epics and stories
    const getChildStats = () => {
        if (item.item_type === 'EPIC') {
            const childStories = allItems.filter(i => i.item_type === 'STORY' && i.parent_id === item.id);
            const storyIds = childStories.map(s => s.id);
            const childTasks = allItems.filter(i => i.item_type === 'TASK' && storyIds.includes(i.parent_id || ''));
            const done = childTasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
            return { childCount: childStories.length, taskCount: childTasks.length, doneCount: done, label: 'stories' };
        }
        if (item.item_type === 'STORY') {
            const childTasks = allItems.filter(i => i.item_type === 'TASK' && i.parent_id === item.id);
            const done = childTasks.filter(t => t.status?.name?.toLowerCase() === 'done').length;
            return { childCount: childTasks.length, taskCount: childTasks.length, doneCount: done, label: 'tasks' };
        }
        return null;
    };

    const childStats = getChildStats();
    const completionPct = childStats && childStats.taskCount > 0
        ? Math.round((childStats.doneCount / childStats.taskCount) * 100)
        : 0;

    // Parent breadcrumb for tasks/stories
    const parentItem = item.parent_id ? allItems.find(i => i.id === item.parent_id) : null;
    const grandparentItem = parentItem?.parent_id ? allItems.find(i => i.id === parentItem.parent_id) : null;

    return (
        <div className="pfc-inspector">
            <div className="pfc-inspector-toolbar">
                <button
                    className="pfc-inspector-fulledit-btn"
                    onClick={() => navigate(`/pfc/${item.item_type.toLowerCase()}/${item.id}/edit`)}
                    title="Open full editor"
                >
                    <ExternalLink size={14} />
                </button>
                {onToggleExpand && (
                    <button
                        className="pfc-inspector-expand-btn"
                        onClick={onToggleExpand}
                        title={isExpanded ? 'Collapse inspector' : 'Expand inspector'}
                    >
                        {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    </button>
                )}
            </div>

            {/* Header */}
            <div className="pfc-inspector-header">
                <div className="pfc-inspector-header-block">
                    {/* Parent breadcrumb */}
                    {(parentItem || grandparentItem) && (
                        <div className="pfc-inspector-breadcrumb">
                            {grandparentItem && (
                                <>
                                    <span
                                        className="pfc-inspector-breadcrumb-link pfc-inspector-breadcrumb-link--epic"
                                        onClick={() => navigate(`/pfc/epic/${grandparentItem.id}`)}
                                    >
                                        {grandparentItem.name}
                                    </span>
                                    <span className="pfc-inspector-breadcrumb-sep">/</span>
                                </>
                            )}
                            {parentItem && (
                                <span
                                    className={`pfc-inspector-breadcrumb-link pfc-inspector-breadcrumb-link--${parentItem.item_type.toLowerCase()}`}
                                    onClick={() => navigate(`/pfc/${parentItem.item_type.toLowerCase()}/${parentItem.id}`)}
                                >
                                    {parentItem.name}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="pfc-inspector-header-row">
                        <div className="common-layout-15">
                            <span className={`pfcinspector-type-pill pfcinspector-type-pill--${typeClass}`}>
                                {item.item_type}
                            </span>
                            <span className="font-mono text-xs text-muted">ID: {item.id.split('-')[0]}</span>
                        </div>

                        <div className="pfc-inspector-priority-group">
                            <button
                                onClick={() => handlePriorityChange('up')}
                                disabled={localData.priority === 1}
                                type="button"
                                className="pfcinspector-priority-btn"
                            >
                                &#9650;
                            </button>
                            <span className={`pfcinspector-priority-label pfcinspector-priority-label--${localData.priority || 3}`}>
                                {getPriorityLabel(localData.priority)}
                            </span>
                            <button
                                onClick={() => handlePriorityChange('down')}
                                disabled={localData.priority === 4}
                                type="button"
                                className="pfcinspector-priority-btn"
                            >
                                &#9660;
                            </button>
                        </div>
                    </div>

                    <input className="pfc-inspector-name-input"
                        value={localData.name}
                        onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
                        onBlur={(e) => handleSave('name', e.target.value)}
                    />

                    {/* Status dropdown */}
                    <div className="pfc-inspector-field-inline">
                        <span className="pfc-inspector-field-label--inline">STATUS:</span>
                        <select
                            className="pfc-inspector-status-select"
                            value={localData.status?.id || ''}
                            onChange={e => handleStatusChange(e.target.value)}
                        >
                            {statuses.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Completion bar for epics/stories */}
            {childStats && childStats.taskCount > 0 && (
                <div className="pfc-inspector-completion">
                    <div className="pfc-inspector-completion-header">
                        <span>{childStats.childCount} {childStats.label}</span>
                        <span>{childStats.doneCount}/{childStats.taskCount} tasks done ({completionPct}%)</span>
                    </div>
                    <div className="pfc-inspector-completion-bar">
                        <div
                            className="pfc-inspector-completion-fill"
                            style={{ width: `${completionPct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Body */}
            <div className="pfc-inspector-body">
                {item.item_type === 'EPIC' && (
                    <div className="pfc-inspector-env-row">
                        <Globe size={16} color="#38bdf8" />
                        <span className="font-mono text-xs pfc-inspector-env-label">ENVIRONMENT:</span>
                        <select className="pfc-inspector-env-select"
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

                {/* Assignee dropdown */}
                <Accordion title="Assignment & Chain of Custody" variant={typeClass} icon={<Cpu size={14}/>} open>
                    <div className="pfc-inspector-assignment-body">
                        <div className="pfc-inspector-field-inline">
                            <span className="pfc-inspector-field-label--active">ACTIVE OWNER:</span>
                            <select
                                className="pfc-inspector-assignee-select"
                                value={localData.owning_disc?.id || ''}
                                onChange={e => handleAssigneeChange(e.target.value)}
                            >
                                <option value="">Unassigned</option>
                                {identityDiscs.map(disc => (
                                    <option key={disc.id} value={disc.id}>{disc.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="pfc-inspector-field-row">
                            <span className="pfc-inspector-field-label">PREVIOUS:</span>
                            <div className="pfc-inspector-prev-owner-list">
                                {item.previous_owners && item.previous_owners.length > 0 ? (
                                    item.previous_owners.map(prev => (
                                        <span className="pfc-inspector-prev-owner-tag" key={prev.id}>
                                            {prev.name}
                                        </span>
                                    ))
                                ) : (
                                    <span className="pfc-inspector-owner-empty">No prior chain of custody</span>
                                )}
                            </div>
                        </div>
                    </div>
                </Accordion>

                {/* Core Description */}
                <div className="pfc-inspector-description-box">
                    <div className="pfc-inspector-section-header">Description</div>
                    {renderTextarea('description', 'Enter general description...')}
                </div>

                {/* BDD Fields */}
                <Accordion title="Perspective (The Why/Who)" variant={typeClass} icon={<Target size={14}/>} open>
                    {renderTextarea('perspective', 'e.g. As a User, I want to...')}
                </Accordion>

                <Accordion title="Assertions (Success Criteria)" variant={typeClass} icon={<ListChecks size={14}/>} open>
                    {renderTextarea('assertions', '- Assert that the system does X\n- Assert that Y is returned')}
                </Accordion>

                <Accordion title="Outside (Negative Constraints)" variant={typeClass} icon={<ShieldAlert size={14}/>}>
                    {renderTextarea('outside', 'What should the AI specifically AVOID doing?')}
                </Accordion>

                <Accordion title="Dependencies" variant={typeClass} icon={<Link2 size={14}/>}>
                    {renderTextarea('dependencies', 'Required blockers or preceding tickets...')}
                </Accordion>

                <Accordion title="DoD Exceptions" variant={typeClass} icon={<AlertTriangle size={14}/>}>
                    {renderTextarea('dod_exceptions', 'Any exceptions to the standard Definition of Done...')}
                </Accordion>

                <Accordion title="Demo Specifics" variant={typeClass} icon={<Zap size={14}/>}>
                    {renderTextarea('demo_specifics', 'How will this be demonstrated at the end of the shift?')}
                </Accordion>

                {/* Comments */}
                <Accordion title={`Communication Log (${item.comments?.length || 0})`} variant={typeClass} icon={<MessageSquare size={14}/>} open>
                    <div className="pfc-inspector-comment-section">
                        <div className="pfc-inspector-comment-list">
                            {item.comments && item.comments.length > 0 ? item.comments.map(c => (
                                <div
                                    key={c.id}
                                    className={`pfcinspector-comment-row ${c.user ? "pfcinspector-comment-row--user" : "pfcinspector-comment-row--system"}`}
                                >
                                    <div className="pfc-inspector-comment-meta">
                                        <span className={`pfcinspector-comment-author ${c.user ? "pfcinspector-comment-author--user" : "pfcinspector-comment-author--system"}`}>
                                            {c.user ? c.user.username : 'Are-Self (System)'}
                                        </span>
                                        <span>{new Date(c.created).toLocaleString()}</span>
                                    </div>
                                    <div className="pfc-inspector-comment-text">
                                        {c.text}
                                    </div>
                                </div>
                            )) : (
                                <div className="pfc-inspector-comment-empty">No communication logged.</div>
                            )}
                        </div>

                        <div className="pfc-inspector-comment-form">
                            <textarea className="pfc-inspector-comment-input"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a directive or comment..."
                            />
                            <button
                                onClick={handlePostComment}
                                disabled={!newComment.trim() || isPosting}
                                className="pfcinspector-comment-send"
                            >
                                {isPosting ? 'Transmitting...' : 'Send Message'}
                            </button>
                        </div>
                    </div>
                </Accordion>
            </div>

            {/* Actions */}
            <div className="pfc-inspector-actions">
                <a
                    href={`/admin/prefrontal_cortex/pfc${item.item_type.toLowerCase()}/${item.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`pfcinspector-db-link pfcinspector-db-link--${typeClass}`}
                >
                    ADVANCED DB RECORD &#8599;
                </a>
                <button className="pfc-inspector-delete-btn"
                    onClick={handleDeleteTicket}
                    title="Permanently Delete Ticket"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    );
};

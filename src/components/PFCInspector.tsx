import { useState, useEffect, ReactNode } from 'react';
import { apiFetch } from '../api';
import type { PFCAgileItem } from '../types';
import { Target, ListChecks, ShieldAlert, Zap, AlertTriangle, Link2 } from 'lucide-react';

interface PFCInspectorProps {
    item: PFCAgileItem;
    onUpdate: () => void; // Callback to tell the board to re-fetch
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
            <div style={{ padding: '0' }}>
                {children}
            </div>
        </details>
    );
};

export const PFCInspector = ({ item, onUpdate }: PFCInspectorProps) => {
    const [localData, setLocalData] = useState<PFCAgileItem>(item);

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

    const handleSave = async (field: keyof PFCAgileItem, value: any) => {
        if (localData[field] === value) return; // Prevent unnecessary API calls if unchanged

        try {
            const endpoint = endpointMap[item.item_type];
            const res = await apiFetch(`/api/v2/${endpoint}/${item.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });

            if (res.ok) {
                onUpdate(); // Trigger board refresh
            }
        } catch (err) {
            console.error(`Failed to update ${field}:`, err);
        }
    };

    const renderTextarea = (field: keyof PFCAgileItem, placeholder: string) => (
        <textarea
            style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                padding: '12px 15px',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.8rem',
                minHeight: '80px',
                resize: 'vertical',
                outline: 'none'
            }}
            value={localData[field] as string || ''}
            placeholder={placeholder}
            onChange={(e) => setLocalData({ ...localData, [field]: e.target.value })}
            onBlur={(e) => handleSave(field, e.target.value)}
        />
    );

    return (
        <div className="scroll-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div style={{ flex: 1 }}>

                {/* Header */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span className="font-mono text-xs" style={{ background: `${color}20`, color: color, padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                            {item.item_type}
                        </span>
                        <span className="font-mono text-xs text-muted">ID: {item.id.split('-')[0]}</span>
                    </div>

                    <input
                        value={localData.name}
                        onChange={(e) => setLocalData({ ...localData, name: e.target.value })}
                        onBlur={(e) => handleSave('name', e.target.value)}
                        style={{
                            width: '100%', background: 'transparent', border: '1px solid transparent', color: '#f8fafc',
                            fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800, padding: '4px 8px',
                            marginLeft: '-8px', borderRadius: '4px', outline: 'none', transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--border-glass-strong)'}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Core Description */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-glass)', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Description</div>
                        {renderTextarea('description', 'Enter general description...')}
                    </div>

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
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', paddingBottom: '20px' }}>
                <a
                    href={`http://localhost:8000/admin/prefrontal_cortex/pfc${item.item_type.toLowerCase()}/${item.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block', padding: '10px 20px', backgroundColor: 'transparent',
                        color: color, fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '1rem',
                        textDecoration: 'none', borderRadius: '8px', border: `1px solid ${color}`,
                        width: '100%', textTransform: 'uppercase', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = `${color}20`; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                    ADVANCED DB RECORD ↗
                </a>
            </div>
        </div>
    );
};
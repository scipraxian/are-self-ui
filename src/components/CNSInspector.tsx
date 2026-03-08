import { type ReactNode, useEffect, useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { apiFetch } from '../api';
import type { CNSContextRow } from "../types.ts";

interface CNSInspectorProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    node: any;
    pathwayId: string;
    onDelete: (id: string | number) => void;
    onContextChange: (nodeId: string | number, key: string, value: string) => void;
}

interface NodeDetails {
    neuron_id: number;
    name: string;
    description: string;
    context_matrix: CNSContextRow[];
}

interface AccordionProps {
    title: string;
    color: string;
    open?: boolean;
    children: ReactNode;
    rightElement?: ReactNode;
}

const Accordion = ({ title, color, open = false, children, rightElement }: AccordionProps) => {
    return (
        <details open={open} style={{ marginBottom: '10px', border: `1px solid ${color}`, borderRadius: '8px', background: 'rgba(0,0,0,0.4)', overflow: 'hidden' }}>
            <summary style={{ backgroundColor: `${color}33`, color: color, padding: '8px 15px', fontFamily: 'Outfit, sans-serif', fontSize: '0.95rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>► {title}</span>
                {rightElement && <span>{rightElement}</span>}
            </summary>
            <div style={{ padding: '12px' }}>
                {children}
            </div>
        </details>
    );
};

export const CNSInspector = ({ node, pathwayId, onDelete, onContextChange }: CNSInspectorProps) => {
    const [details, setDetails] = useState<NodeDetails | null>(null);

    useEffect(() => {
        if (!node?.id) return;
        let isMounted = true;
        apiFetch(`/central_nervous_system/graph/${pathwayId}/neuron_details?neuron_id=${node.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setDetails(data);
            })
            .catch(console.error);
        return () => {
            isMounted = false;
        };

    }, [node?.id, pathwayId]);

    if (!node) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                <h2 className="glass-panel-title">TELEMETRY OVERRIDE</h2>
                <div style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '10px' }}>Select a neuron to inspect its properties.</div>
            </div>
        );
    }

    if (!details) {
        return <div className="flex flex-col items-center justify-center p-8 text-center h-full" style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>Loading details...</div>;
    }

    const handleAddVariable = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const key = prompt("Enter variable name (e.g. MY_VAR):");
        if (key && key.trim()) {
            onContextChange(node.id, key.trim().toUpperCase(), '');
            setDetails(prev => prev ? {
                ...prev,
                context_matrix: [...prev.context_matrix, { key: key.trim().toUpperCase(), source: 'override', value: '', display_value: '', is_readonly: false }]
            } : null);
        }
    };

    const handleClearOverride = (e: React.MouseEvent, key: string) => {
        e.preventDefault();
        e.stopPropagation();
        onContextChange(node.id, key, '');
        setDetails(prev => prev ? { ...prev, context_matrix: prev.context_matrix.map(m => m.key === key ? { ...m, source: 'default', value: '' } : m) } : null);
    };

    return (
        <div className="scroll-hidden" style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h2 className="glass-panel-title" style={{ margin: 0, color: '#f8fafc' }}>
                        TELEMETRY OVERRIDE
                    </h2>
                    <button onClick={() => onDelete(node.id)} className="btn-ghost" style={{ padding: '4px 8px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)', minWidth: 'auto', minHeight: 'auto' }} title="Delete Node">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    <div style={{ display: 'flex', gap: '10px', fontFamily: 'Outfit', textTransform: 'uppercase' }}>
                        <div style={{ flex: 1, padding: '8px', textAlign: 'center', background: '#cc99cc', color: 'black', fontWeight: 800, borderRadius: '20px' }}>ID: {details.neuron_id}</div>
                        <div style={{ flex: 2, padding: '8px', textAlign: 'center', background: '#38bdf8', color: 'black', fontWeight: 800, borderRadius: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{details.name}</div>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                        {details.description || 'No specialized purpose defined for this neuron.'}
                    </div>

                    <Accordion
                        title={`CONTEXT VARIABLES (${details.context_matrix.length})`}
                        color="#4ade80"
                        open
                        rightElement={
                            <button onClick={handleAddVariable} style={{ background: 'transparent', border: 'none', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                                <Plus size={14} /> ADD
                            </button>
                        }
                    >
                        {details.context_matrix.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {details.context_matrix.map((item) => {
                                    const isGlobal = item.source === 'global';
                                    const isOverride = item.source === 'override';

                                    let borderColor = '#4ade80'; // Default
                                    let labelColor = '#4ade80';
                                    if (isGlobal) {
                                        borderColor = '#38bdf8';
                                        labelColor = '#38bdf8';
                                    } else if (isOverride) {
                                        borderColor = '#facc15';
                                        labelColor = '#facc15';
                                    }

                                    const isLong = item.display_value.length > 50 || item.key.toLowerCase().includes('prompt');

                                    return (
                                        <div key={item.key} style={{ border: `1px solid ${borderColor}`, borderRadius: '4px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ color: labelColor, fontWeight: 'bold', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                                                    &gt; {item.key}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ fontSize: '0.7rem', color: isGlobal ? '#94a3b8' : labelColor, textTransform: 'uppercase', border: `1px solid ${isGlobal ? '#475569' : labelColor}`, padding: '2px 6px', borderRadius: '4px' }}>
                                                        {item.source}
                                                    </span>
                                                    {isOverride && (
                                                        <button
                                                            onClick={(e) => handleClearOverride(e, item.key)}
                                                            style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                                            title="Clear Override"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                {isLong ? (
                                                    <textarea
                                                        style={{
                                                            width: '100%',
                                                            background: 'rgba(0,0,0,0.4)',
                                                            border: `1px solid ${isGlobal ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                            borderRadius: '4px',
                                                            padding: '8px',
                                                            color: isGlobal ? '#94a3b8' : '#e2e8f0',
                                                            fontFamily: 'JetBrains Mono',
                                                            fontSize: '0.8rem',
                                                            minHeight: '80px',
                                                            resize: 'vertical',
                                                            outline: 'none',
                                                            cursor: isGlobal ? 'not-allowed' : 'text'
                                                        }}
                                                        defaultValue={item.value}
                                                        readOnly={item.is_readonly}
                                                        placeholder={isGlobal ? 'Value handled globally.' : 'Enter specific override...'}
                                                        onBlur={(e) => {
                                                            if (item.value !== e.target.value) onContextChange(node.id, item.key, e.target.value);
                                                        }}
                                                    />
                                                ) : (
                                                    <input
                                                        type="text"
                                                        style={{
                                                            width: '100%',
                                                            background: 'rgba(0,0,0,0.4)',
                                                            border: `1px solid ${isGlobal ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                                            borderRadius: '4px',
                                                            padding: '8px',
                                                            color: isGlobal ? '#94a3b8' : '#e2e8f0',
                                                            fontFamily: 'JetBrains Mono',
                                                            fontSize: '0.8rem',
                                                            outline: 'none',
                                                            cursor: isGlobal ? 'not-allowed' : 'text'
                                                        }}
                                                        defaultValue={item.value}
                                                        readOnly={item.is_readonly}
                                                        placeholder={isGlobal ? 'Value handled globally.' : 'Enter specific override...'}
                                                        onBlur={(e) => {
                                                            if (item.value !== e.target.value) onContextChange(node.id, item.key, e.target.value);
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>
                                No variables detected.
                            </div>
                        )}
                    </Accordion>
                </div>
            </div>

            <div style={{ marginTop: '20px', textAlign: 'center', paddingBottom: '20px' }}>
                <a
                    href={`http://localhost:8000/admin/central_nervous_system/neuron/${node.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-block',
                        padding: '10px 20px',
                        backgroundColor: '#cc3333',
                        color: 'black',
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 800,
                        fontSize: '1.2rem',
                        textDecoration: 'none',
                        borderRadius: '20px',
                        border: '2px solid #ef4444',
                        width: '80%',
                        textTransform: 'uppercase',
                        transition: 'transform 0.1s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    ACCESS DB RECORD ↗
                </a>
            </div>
        </div>
    );
};
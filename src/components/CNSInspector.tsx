import "./CNSInspector.css";
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
            <div className="cnsinspector-ui-22">
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

        apiFetch(`/api/v1/neurons/${node.id}/inspector_details/`)
            .then(res => res.json())
            .then(data => {
                if (isMounted) setDetails(data);
            })
            .catch(console.error);

        return () => {
            isMounted = false;
        };

    }, [node?.id]);

    if (!node) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                <h2 className="glass-panel-title">TELEMETRY OVERRIDE</h2>
                <div className="cnsinspector-ui-21">Select a neuron to inspect its properties.</div>
            </div>
        );
    }

    if (!details) {
        return <div className="flex flex-col items-center justify-center p-8 text-center h-full cnsinspector-ui-20">Loading details...</div>;
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
        <div className="scroll-hidden cnsinspector-ui-19">
            <div className="cnsinspector-ui-18">
                <div className="cnsinspector-ui-17">
                    <h2 className="glass-panel-title cnsinspector-ui-16">
                        TELEMETRY OVERRIDE
                    </h2>
                    <button onClick={() => onDelete(node.id)} className="btn-ghost cnsinspector-ui-15" title="Delete Node">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="cnsinspector-ui-14">

                    <div className="cnsinspector-ui-13">
                        <div className="cnsinspector-ui-12">ID: {details.neuron_id}</div>
                        <div className="cnsinspector-ui-11">{details.name}</div>
                    </div>

                    <div className="cnsinspector-ui-10">
                        {details.description || 'No specialized purpose defined for this neuron.'}
                    </div>

                    <Accordion
                        title={`CONTEXT VARIABLES (${details.context_matrix.length})`}
                        color="#4ade80"
                        open
                        rightElement={
                            <button className="cnsinspector-ui-9" onClick={handleAddVariable}>
                                <Plus size={14} /> ADD
                            </button>
                        }
                    >
                        {details.context_matrix.length > 0 ? (
                            <div className="cnsinspector-ui-8">
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
                                            <div className="cnsinspector-ui-7">
                                                <div style={{ color: labelColor, fontWeight: 'bold', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                                                    &gt; {item.key}
                                                </div>
                                                <div className="cnsinspector-ui-6">
                                                    <span style={{ fontSize: '0.7rem', color: isGlobal ? '#94a3b8' : labelColor, textTransform: 'uppercase', border: `1px solid ${isGlobal ? '#475569' : labelColor}`, padding: '2px 6px', borderRadius: '4px' }}>
                                                        {item.source}
                                                    </span>
                                                    {isOverride && (
                                                        <button className="cnsinspector-ui-5"
                                                            onClick={(e) => handleClearOverride(e, item.key)}
                                                            title="Clear Override"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="cnsinspector-ui-4">
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
                            <div className="cnsinspector-ui-3">
                                No variables detected.
                            </div>
                        )}
                    </Accordion>
                </div>
            </div>

            <div className="cnsinspector-ui-2">
                <a className="cnsinspector-ui-1"
                    href={`http://localhost:8000/admin/central_nervous_system/neuron/${node.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    ACCESS DB RECORD ↗
                </a>
            </div>
        </div>
    );
};
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
    variant?: 'green' | 'blue' | 'yellow' | 'red';
    open?: boolean;
    children: ReactNode;
    rightElement?: ReactNode;
}

const Accordion = ({ title, variant = 'green', open = false, children, rightElement }: AccordionProps) => {
    return (
        <details open={open} className={`cnsinspector-accordion cnsinspector-accordion--${variant}`}>
            <summary className="cnsinspector-accordion-summary">
                <span className="cnsinspector-accordion-title">► {title}</span>
                {rightElement && <span>{rightElement}</span>}
            </summary>
            <div className="cns-inspector-accordion-body">
                {children}
            </div>
        </details>
    );
};

export const CNSInspector = ({ node, onDelete, onContextChange }: CNSInspectorProps) => {
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
                <div className="cns-inspector-empty-hint">Select a neuron to inspect its properties.</div>
            </div>
        );
    }

    if (!details) {
        return <div className="cns-inspector-loading">Loading details...</div>;
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
        <div className="scroll-hidden cns-inspector-root">
            <div className="cns-inspector-body">
                <div className="cns-inspector-title-row">
                    <h2 className="glass-panel-title cns-inspector-title">
                        TELEMETRY OVERRIDE
                    </h2>
                    <button onClick={() => onDelete(node.id)} className="btn-ghost cns-inspector-delete-btn" title="Delete Node">
                        <Trash2 size={16} />
                    </button>
                </div>

                <div className="cns-inspector-content">

                    <div className="cns-inspector-node-layout">
                        <div className="cns-inspector-node-id">ID: {details.neuron_id}</div>
                        <div className="cns-inspector-node-name">{details.name}</div>
                    </div>

                    <div className="cns-inspector-description-box">
                        {details.description || 'No specialized purpose defined for this neuron.'}
                    </div>

                    <Accordion
                        title={`CONTEXT VARIABLES (${details.context_matrix.length})`}
                        variant="green"
                        open
                        rightElement={
                            <button className="cns-inspector-add-btn" onClick={handleAddVariable}>
                                <Plus size={14} /> ADD
                            </button>
                        }
                    >
                        {details.context_matrix.length > 0 ? (
                            <div className="cns-inspector-var-list">
                                {details.context_matrix.map((item) => {
                                    const isGlobal = item.source === 'global';
                                    const isOverride = item.source === 'override';

                                    const isLong = item.display_value.length > 50 || item.key.toLowerCase().includes('prompt');
                                    const sourceClass = isGlobal ? 'global' : isOverride ? 'override' : 'default';

                                    return (
                                        <div
                                            key={item.key}
                                            className={`cnsinspector-context-row cnsinspector-context-row--${sourceClass}`}
                                        >
                                            <div className="cns-inspector-var-header">
                                                <div className={`cnsinspector-context-key cnsinspector-context-key--${sourceClass}`}>
                                                    &gt; {item.key}
                                                </div>
                                                <div className="cns-inspector-source-row">
                                                    <span className={`cnsinspector-context-source cnsinspector-context-source--${sourceClass}`}>
                                                        {item.source}
                                                    </span>
                                                    {isOverride && (
                                                        <button className="cns-inspector-clear-btn"
                                                            onClick={(e) => handleClearOverride(e, item.key)}
                                                            title="Clear Override"
                                                        >
                                                            ✕
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="cns-inspector-input-wrap">
                                                {isLong ? (
                                                    <textarea
                                                        className={`cnsinspector-context-input cnsinspector-context-input--${sourceClass}`}
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
                                                        className={`cnsinspector-context-input cnsinspector-context-input--${sourceClass}`}
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
                            <div className="cns-inspector-empty-text">
                                No variables detected.
                            </div>
                        )}
                    </Accordion>
                </div>
            </div>

            <div className="cns-inspector-admin-section">
                <a className="cns-inspector-admin-link"
                    href={`/admin/central_nervous_system/neuron/${node.id}/change/`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    ACCESS DB RECORD ↗
                </a>
            </div>
        </div>
    );
};
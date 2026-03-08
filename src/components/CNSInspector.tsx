import { useEffect, useState } from 'react';
import { Settings, Trash2 } from 'lucide-react';
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
            <div className="flex flex-col items-center justify-center p-8 text-center text-[#64748b] h-full">
                <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                Select a neuron to inspect its properties or telemetry.
            </div>
        );
    }

    if (!details) {
        return <div className="flex items-center justify-center text-[#64748b] h-full">Loading details...</div>;
    }

    const handleAddVariable = () => {
        const key = prompt("Enter variable name (e.g. MY_VAR):");
        if (key && key.trim()) {
            onContextChange(node.id, key.trim().toUpperCase(), '');
            // Optimistic update
            setDetails(prev => prev ? {
                ...prev,
                context_matrix: [...prev.context_matrix, { key: key.trim().toUpperCase(), source: 'override', value: '', display_value: '', is_readonly: false }]
            } : null);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-y-auto text-[#f1f5f9]">

            <div className="mb-5">
                <div className="text-[0.8rem] text-[#94a3b8] mb-1">SPELL</div>
                <div className="text-[1.1rem] font-bold">{details.name}</div>
                <div className="text-[0.8rem] text-[#64748b] mt-1 italic">{details.description || 'No description'}</div>
            </div>

            <div className="flex items-center justify-between mt-6 mb-3 border-b border-[#1e293b] pb-2">
                <span className="text-[0.75rem] uppercase tracking-widest font-bold text-[#64748b]">Context Variables</span>
                <button
                    onClick={handleAddVariable}
                    className="bg-[#1e293b] border border-[#334155] text-[#cbd5e1] rounded px-2 hover:bg-[#334155] transition-colors"
                    title="Add Override"
                >
                    +
                </button>
            </div>

            {details.context_matrix.length > 0 ? (
                <div className="flex flex-col gap-3">
                    {details.context_matrix.map(item => {
                        const isGlobal = item.source === 'global';
                        const isOverride = item.source === 'override';

                        let dotColor = '#4ade80'; // Default
                        if (isGlobal) dotColor = '#3b82f6';
                        if (isOverride) dotColor = '#facc15';

                        const isLong = item.display_value.length > 50 || item.key.toLowerCase().includes('prompt');

                        return (
                            <div key={item.key} className="flex flex-col gap-1">
                                <div className="flex justify-between items-end">
                                    <span className="font-mono text-[0.8rem] text-[#e2e8f0]">{item.key}</span>
                                    <div className="flex items-center gap-1.5 text-[0.65rem] text-[#64748b] uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}80` }}></span>
                                        {item.source}
                                    </div>
                                </div>

                                <div className="relative">
                                    {isLong ? (
                                        <textarea
                                            className={`w-full bg-[#1e293b] border rounded-md p-2 font-mono text-[0.8rem] min-h-[60px] resize-y focus:outline-none focus:border-[#60a5fa] ${isGlobal ? 'border-dashed border-[#475569] text-[#94a3b8] cursor-not-allowed bg-slate-800/50' : isOverride ? 'border-yellow-500/50 text-white' : 'border-[#334155] text-[#cbd5e1]'}`}
                                            defaultValue={item.value}
                                            readOnly={item.is_readonly}
                                            placeholder={isGlobal ? 'Global Value' : 'Default'}
                                            onBlur={(e) => onContextChange(node.id, item.key, e.target.value)}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className={`w-full bg-[#1e293b] border rounded-md p-2 font-mono text-[0.8rem] focus:outline-none focus:border-[#60a5fa] ${isGlobal ? 'border-dashed border-[#475569] text-[#94a3b8] cursor-not-allowed bg-slate-800/50' : isOverride ? 'border-yellow-500/50 text-white' : 'border-[#334155] text-[#cbd5e1]'}`}
                                            defaultValue={item.value}
                                            readOnly={item.is_readonly}
                                            placeholder={isGlobal ? 'Global Value' : 'Default'}
                                            onBlur={(e) => onContextChange(node.id, item.key, e.target.value)}
                                        />
                                    )}
                                    {isOverride && (
                                        <button
                                            onClick={() => {
                                                onContextChange(node.id, item.key, '');
                                                setDetails(prev => prev ? { ...prev, context_matrix: prev.context_matrix.map(m => m.key === item.key ? { ...m, source: 'default', value: '' } : m) } : null);
                                            }}
                                            className="absolute right-2 top-2 text-red-500/70 hover:text-red-500 cursor-pointer"
                                            title="Reset to Default"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-3 text-center text-[#64748b] italic border border-dashed border-[#334155] rounded-md">
                    No variables detected in Spell.
                </div>
            )}

            <div className="mt-8 pt-5 border-t border-[#1e293b] flex gap-2">
                <a href={`/admin/central_nervous_system/neuron/${node.id}/change/`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 p-2 bg-[#1e293b] border border-[#334155] text-[#cbd5e1] rounded-md hover:bg-[#334155] hover:text-white transition-colors no-underline text-[0.85rem] font-medium">
                    <Settings size={14} /> Advanced
                </a>
                <button onClick={() => onDelete(node.id)} className="flex items-center justify-center gap-2 p-2 bg-transparent border border-red-500/50 text-red-500 rounded-md hover:bg-red-500/10 transition-colors text-[0.85rem] font-medium">
                    <Trash2 size={14} /> Delete
                </button>
            </div>

            <div className="mt-5 p-3 bg-[#020617] rounded-md text-[0.7rem] text-[#475569] leading-relaxed">
                <div className="font-bold text-[#64748b] mb-1">COLOR LEGEND</div>
                <div className="flex items-center gap-2 mb-0.5"><span className="text-[#4ade80]">●</span> Default (Spell)</div>
                <div className="flex items-center gap-2 mb-0.5"><span className="text-[#facc15]">●</span> Override (Neuron)</div>
                <div className="flex items-center gap-2"><span className="text-[#3b82f6]">●</span> Global (Env)</div>
            </div>
        </div>
    );
};
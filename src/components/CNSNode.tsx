import './CNSNode.css';
import React, { useEffect, useMemo } from 'react';
import { Eye, Play, X } from 'lucide-react';
import type {CNSNeuron} from "../types.ts";
import { ensureDynamicCss, safeCssIdent } from '../utils/styleRegistry';

interface CNSNodeProps {
    node: CNSNeuron;
    isSelected: boolean;
    onSelect: (node: CNSNeuron, shiftKey: boolean) => void;
    onDelete: (id: string | number) => void;
    onDragStart: (e: React.MouseEvent, node: CNSNeuron) => void;
    onPinMouseDown: (e: React.MouseEvent, nodeId: string | number, portIndex: number, color: string) => void;
    isMonitorMode: boolean;
}

export const CNSNode = ({ node, isSelected, onSelect, onDelete, onDragStart, onPinMouseDown, isMonitorMode }: CNSNodeProps) => {

    // Status colors from your legacy CSS
    let headerBg = '#2d2d2d';
    if (node.is_root) headerBg = '#8b0000';
    if (node.invoked_pathway_id) headerBg = 'linear-gradient(135deg, #b45309 0%, #78350f 100%)';

    if (isMonitorMode) {
        if (node.status_id === 2 || node.status_id === 3) headerBg = '#f7941d'; // Running
        if (node.status_id === 4) headerBg = '#4caf50'; // Success
        if (node.status_id === 5) headerBg = '#f44336'; // Failed
    }

    const cssId = useMemo(() => safeCssIdent(String(node.id)), [node.id]);
    const posClass = `cnsnode-pos-${cssId}`;
    const headerClass = `cnsnode-header-bg-${cssId}`;

    useEffect(() => {
        const key = `cnsnode:${cssId}`;
        const zIndex = isSelected ? 10 : 1;
        ensureDynamicCss(
            key,
            `.${posClass}{left:${node.x}px;top:${node.y}px;z-index:${zIndex};}
             .${headerClass}{background:${headerBg};}`,
        );
    }, [cssId, headerBg, isSelected, node.x, node.y, headerClass, posClass]);

    return (
        <div
            className={`cnsnode-root ${posClass} ${isSelected ? 'cnsnode-root--selected' : ''}`}
            onMouseDown={(e) => { e.stopPropagation(); onSelect(node, e.shiftKey); }}
        >
            {/* HEADER */}
            <div
                className={`cnsnode-header ${headerClass}`}
                onMouseDown={(e) => onDragStart(e, node)}
            >
                <h4 className="m-0 text-sm font-bold text-white drop-shadow-md">
                    {node.invoked_pathway_id ? `🌀 ${node.title}` : node.title}
                </h4>
                <div className="flex gap-1 ml-auto">
                    <button className="bg-[#0078d4] text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-accent-orange transition-colors" title="Inspect">
                        <Eye size={12} />
                    </button>
                    {node.is_root && !isMonitorMode && (
                        <button className="bg-white/10 text-white rounded-sm px-1.5 hover:bg-white/20 transition-colors">
                            <Play size={12} />
                        </button>
                    )}
                    {!node.is_root && !isMonitorMode && (
                        <button className="text-gray-400 hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}>
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* BODY & PINS */}
            <div className="p-3 flex justify-between min-h-[80px]">
                {/* INPUTS */}
                <div className="flex flex-col gap-3">
                    {!node.is_root && (
                        <div className="flex items-center gap-2 text-[11px] text-[#999]">
                            <div className="w-3 h-3 rounded-sm bg-[#888] border border-white/10"></div>
                            <span>Input</span>
                        </div>
                    )}
                </div>

                {/* OUTPUTS */}
                <div className="flex flex-col gap-3 items-end">
                    <div className="flex items-center flex-row-reverse gap-2 text-[11px] text-[#999]">
                        <div
                            className="w-3 h-3 rounded-sm bg-white border border-white/10 cursor-crosshair hover:scale-125 hover:shadow-[0_0_8px_#fff] transition-all"
                            onMouseDown={(e) => onPinMouseDown(e, node.id, 0, '#ffffff')}
                        ></div>
                        <span>{node.is_root ? '' : 'Flow'}</span>
                    </div>
                    {!node.is_root && (
                        <>
                            <div className="flex items-center flex-row-reverse gap-2 text-[11px] text-[#999]">
                                <div
                                    className="w-3 h-3 rounded-sm bg-[#4caf50] border border-white/10 cursor-crosshair hover:scale-125 hover:shadow-[0_0_8px_#4caf50] transition-all"
                                    onMouseDown={(e) => onPinMouseDown(e, node.id, 1, '#4caf50')}
                                ></div>
                                <span>Success</span>
                            </div>
                            <div className="flex items-center flex-row-reverse gap-2 text-[11px] text-[#999]">
                                <div
                                    className="w-3 h-3 rounded-sm bg-[#f44336] border border-white/10 cursor-crosshair hover:scale-125 hover:shadow-[0_0_8px_#f44336] transition-all"
                                    onMouseDown={(e) => onPinMouseDown(e, node.id, 2, '#f44336')}
                                ></div>
                                <span>Fail</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
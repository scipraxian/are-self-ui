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
                <h4 className="cnsnode-title">
                    {node.invoked_pathway_id ? `🌀 ${node.title}` : node.title}
                </h4>
                <div className="cnsnode-actions">
                    <button className="cnsnode-inspect-btn" title="Inspect">
                        <Eye size={12} />
                    </button>
                    {node.is_root && !isMonitorMode && (
                        <button className="cnsnode-play-btn">
                            <Play size={12} />
                        </button>
                    )}
                    {!node.is_root && !isMonitorMode && (
                        <button className="cnsnode-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}>
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* BODY & PINS */}
            <div className="cnsnode-body">
                {/* INPUTS */}
                <div className="cnsnode-ports-left">
                    {!node.is_root && (
                        <div className="cnsnode-port-label">
                            <div className="cnsnode-port cnsnode-port--input"></div>
                            <span>Input</span>
                        </div>
                    )}
                </div>

                {/* OUTPUTS */}
                <div className="cnsnode-ports-right">
                    <div className="cnsnode-port-label cnsnode-port-label--right">
                        <div
                            className="cnsnode-port cnsnode-port--flow"
                            onMouseDown={(e) => onPinMouseDown(e, node.id, 0, '#ffffff')}
                        ></div>
                        <span>{node.is_root ? '' : 'Flow'}</span>
                    </div>
                    {!node.is_root && (
                        <>
                            <div className="cnsnode-port-label cnsnode-port-label--right">
                                <div
                                    className="cnsnode-port cnsnode-port--success"
                                    onMouseDown={(e) => onPinMouseDown(e, node.id, 1, '#4caf50')}
                                ></div>
                                <span>Success</span>
                            </div>
                            <div className="cnsnode-port-label cnsnode-port-label--right">
                                <div
                                    className="cnsnode-port cnsnode-port--fail"
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
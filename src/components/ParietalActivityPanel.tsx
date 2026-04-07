import { useState, useMemo } from 'react';
import { summarizeTool } from '../utils/toolFormatters';
import type { ReasoningSessionData, ToolCallData } from '../types';
import './ParietalActivityPanel.css';

interface ParietalActivityPanelProps {
    sessionData: ReasoningSessionData | null;
    onToolSelect?: (turnNumber: number, toolIndex: number) => void;
}

export function ParietalActivityPanel({
    sessionData,
    onToolSelect,
}: ParietalActivityPanelProps) {
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

    // Flatten all tool calls across all turns with turn metadata
    const allTools = useMemo(() => {
        if (!sessionData?.turns) return [];

        const flattened: Array<{
            turnNumber: number;
            toolIndex: number;
            tool: ToolCallData;
        }> = [];

        sessionData.turns.forEach((turn) => {
            turn.tool_calls?.forEach((tool, idx) => {
                flattened.push({
                    turnNumber: turn.turn_number,
                    toolIndex: idx,
                    tool,
                });
            });
        });

        return flattened;
    }, [sessionData]);

    // Get unique tool names for filter chips
    const uniqueTools = useMemo(() => {
        const names = new Set<string>();
        allTools.forEach((item) => {
            names.add(item.tool.tool_name);
        });
        return Array.from(names).sort();
    }, [allTools]);

    // Filter tools and detect "recovered" status
    const filteredTools = useMemo(() => {
        let filtered = allTools;

        if (selectedFilter) {
            filtered = filtered.filter((item) => item.tool.tool_name === selectedFilter);
        }

        // Add recovery detection
        return filtered.map((item, idx, arr) => {
            const summary = summarizeTool(item.tool);
            const isRecovered =
                summary.success === true &&
                idx > 0 &&
                arr[idx - 1].tool.tool_name === item.tool.tool_name &&
                summarizeTool(arr[idx - 1].tool).success === false;

            return {
                ...item,
                summary,
                isRecovered,
            };
        });
    }, [allTools, selectedFilter]);

    // Calculate stats
    const totalCalls = allTools.length;
    const errorCount = useMemo(
        () => allTools.filter((item) => {
            const summary = summarizeTool(item.tool);
            return summary.success === false;
        }).length,
        [allTools]
    );
    const uniqueToolCount = uniqueTools.length;

    return (
        <div className="parietal-activity-panel">
            {/* Header */}
            <div className="parietal-header">
                <h2 className="parietal-title">PARIETAL LOBE ACTIVITY</h2>
                <div className="parietal-stats">
                    <span className="parietal-stat">
                        <span className="parietal-stat-value">{totalCalls}</span> calls
                    </span>
                    <span className="parietal-stat">
                        <span className="parietal-stat-value parietal-stat-error">{errorCount}</span> errors
                    </span>
                    <span className="parietal-stat">
                        <span className="parietal-stat-value">{uniqueToolCount}</span> tools
                    </span>
                </div>
            </div>

            {/* Filter chips */}
            {uniqueTools.length > 0 && (
                <div className="parietal-filters">
                    <button
                        className={`parietal-filter-chip ${selectedFilter === null ? 'parietal-filter-chip--active' : ''}`}
                        onClick={() => setSelectedFilter(null)}
                    >
                        All
                    </button>
                    {uniqueTools.map((toolName) => (
                        <button
                            key={toolName}
                            className={`parietal-filter-chip ${selectedFilter === toolName ? 'parietal-filter-chip--active' : ''}`}
                            onClick={() => setSelectedFilter(toolName)}
                        >
                            {toolName}
                        </button>
                    ))}
                </div>
            )}

            {/* Tool list */}
            <div className="parietal-list">
                {filteredTools.length === 0 ? (
                    <div className="parietal-empty">
                        <p>No tool calls found{selectedFilter ? ` for ${selectedFilter}` : ''}</p>
                    </div>
                ) : (
                    <div className="parietal-rows">
                        {filteredTools.map((item, displayIdx) => {
                            const { turnNumber, toolIndex, tool, summary, isRecovered } = item;
                            const icon = summary.success === true ? '✓' : summary.success === false ? '✗' : '◦';
                            const statusClass =
                                summary.success === true
                                    ? 'parietal-row-success'
                                    : summary.success === false
                                      ? 'parietal-row-error'
                                      : '';

                            return (
                                <div
                                    key={`${displayIdx}-${turnNumber}-${toolIndex}`}
                                    className={`parietal-row ${statusClass}`}
                                    onClick={() => onToolSelect?.(turnNumber, toolIndex)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="parietal-row-header">
                                        <span className="parietal-row-turn">T{turnNumber}</span>
                                        <span className="parietal-row-icon">⚙</span>
                                        <span className="parietal-row-tool">{tool.tool_name}</span>
                                        <span className="parietal-row-action">{summary.action}</span>
                                    </div>
                                    <div className="parietal-row-status">
                                        <span className={`parietal-row-icon-status ${summary.success === true ? 'parietal-status-ok' : summary.success === false ? 'parietal-status-error' : 'parietal-status-unknown'}`}>
                                            {icon}
                                        </span>
                                        {isRecovered && (
                                            <span className="parietal-row-recovered">← recovered</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

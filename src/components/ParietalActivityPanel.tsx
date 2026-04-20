import { useState, useMemo } from 'react';
import type { ReasoningTurnDigest } from '../types';
import './ParietalActivityPanel.css';

interface ParietalActivityPanelProps {
    digests: ReasoningTurnDigest[];
    onToolSelect?: (turnId: string, toolCallId: string) => void;
}

interface FlatToolRow {
    turnNumber: number;
    turnId: string;
    toolCallId: string;
    toolName: string;
    success: boolean | null;
    target: string;
}

export function ParietalActivityPanel({
    digests,
    onToolSelect,
}: ParietalActivityPanelProps) {
    const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

    // Flatten the digest stream into one row per tool call. The digest's
    // tool_calls_summary is the authoritative list here — full
    // arguments/result_payload/traceback are fetched on-demand by the
    // inspector when a row is clicked.
    const allTools = useMemo<FlatToolRow[]>(() => {
        const rows: FlatToolRow[] = [];
        digests.forEach((d) => {
            (d.tool_calls_summary || []).forEach((tc) => {
                rows.push({
                    turnNumber: d.turn_number,
                    turnId: d.turn_id,
                    toolCallId: tc.id,
                    toolName: tc.tool_name,
                    success: tc.success,
                    target: tc.target,
                });
            });
        });
        return rows;
    }, [digests]);

    const uniqueTools = useMemo(() => {
        const names = new Set<string>();
        allTools.forEach((t) => names.add(t.toolName));
        return Array.from(names).sort();
    }, [allTools]);

    // Filter, then flag each row as "recovered" if the same tool failed
    // on the previous adjacent row and succeeded on this one.
    const filteredTools = useMemo(() => {
        const base = selectedFilter
            ? allTools.filter((t) => t.toolName === selectedFilter)
            : allTools;

        return base.map((row, idx, arr) => {
            const prev = idx > 0 ? arr[idx - 1] : null;
            const isRecovered =
                row.success === true &&
                prev !== null &&
                prev.toolName === row.toolName &&
                prev.success === false;
            return { ...row, isRecovered };
        });
    }, [allTools, selectedFilter]);

    const totalCalls = allTools.length;
    const errorCount = useMemo(
        () => allTools.filter((t) => t.success === false).length,
        [allTools],
    );
    const uniqueToolCount = uniqueTools.length;

    return (
        <div className="parietal-activity-panel">
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

            <div className="parietal-list">
                {filteredTools.length === 0 ? (
                    <div className="parietal-empty">
                        <p>No tool calls found{selectedFilter ? ` for ${selectedFilter}` : ''}</p>
                    </div>
                ) : (
                    <div className="parietal-rows">
                        {filteredTools.map((row) => {
                            const icon = row.success === true ? '✓' : row.success === false ? '✗' : '◦';
                            const statusClass =
                                row.success === true
                                    ? 'parietal-row-success'
                                    : row.success === false
                                        ? 'parietal-row-error'
                                        : '';
                            const action = row.target || row.toolName;

                            return (
                                <div
                                    key={row.toolCallId}
                                    className={`parietal-row ${statusClass}`}
                                    onClick={() => onToolSelect?.(row.turnId, row.toolCallId)}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div className="parietal-row-header">
                                        <span className="parietal-row-turn">T{row.turnNumber}</span>
                                        <span className="parietal-row-icon">⚙</span>
                                        <span className="parietal-row-tool">{row.toolName}</span>
                                        <span className="parietal-row-action">{action}</span>
                                    </div>
                                    <div className="parietal-row-status">
                                        <span className={`parietal-row-icon-status ${row.success === true ? 'parietal-status-ok' : row.success === false ? 'parietal-status-error' : 'parietal-status-unknown'}`}>
                                            {icon}
                                        </span>
                                        {row.isRecovered && (
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

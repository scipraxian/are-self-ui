/**
 * toolFormatters.ts — Semantic one-liner rendering for known Parietal Lobe tools.
 *
 * Shared between ReasoningPanels (inspector), SessionChat (chat view),
 * ParietalActivityPanel (all-calls list), and ReasoningGraph3D (hover cards).
 *
 * Known tools get human-readable summaries. Unknown tools fall back to
 * tool_name + first arg key.
 */

import type { ToolCallData } from '../types';

// ── Public Types ──────────────────────────────────────────────

export interface ToolSummary {
    /** e.g. "update perspective" or "passed turn" */
    action: string;
    /** e.g. "story a927948a" — optional target identifier */
    target: string | null;
    /** Short preview of the value/content — truncated */
    preview: string | null;
    /** The thought field if the model provided one */
    thought: string | null;
    /** true/false/null if unknown */
    success: boolean | null;
    /** true if there was a traceback or error in result */
    hasError: boolean;
    /** Raw error message if present */
    errorMessage: string | null;
}

// ── Helpers ───────────────────────────────────────────────────

function parseArgs(raw: string | Record<string, unknown>): Record<string, unknown> {
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) as Record<string, unknown>;
        } catch {
            return {};
        }
    }
    return raw || {};
}

function parseResult(raw: string): Record<string, unknown> | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function truncate(s: string | null | undefined, max = 60): string | null {
    if (!s) return null;
    const clean = String(s).trim();
    if (clean.length <= max) return clean;
    return clean.slice(0, max) + '\u2026';
}

function shortId(uuid: string | null | undefined): string {
    if (!uuid) return '';
    return String(uuid).split('-')[0] || String(uuid).slice(0, 8);
}

// ── Known Tool Formatters ─────────────────────────────────────

function formatTicket(args: Record<string, unknown>, result: Record<string, unknown> | null): Partial<ToolSummary> {
    const action = String(args.action || 'unknown');
    const itemId = shortId(args.item_id as string);
    const fieldName = args.field_name as string || null;
    const fieldValue = args.field_value as string || null;

    const target = itemId
        ? (fieldName ? `${itemId} · "${fieldName}"` : itemId)
        : null;

    const ok = result?.ok as boolean | undefined;
    const error = result?.error as string | undefined;

    return {
        action: fieldName ? `${action} ${fieldName}` : action,
        target: target ? `story ${target}` : null,
        preview: truncate(fieldValue, 80),
        success: ok === true ? true : ok === false ? false : null,
        hasError: !!error,
        errorMessage: error ? truncate(String(error), 120) : null,
    };
}

function formatDone(args: Record<string, unknown>): Partial<ToolSummary> {
    const outcome = args.outcome_status as string || args.goal_achieved ? 'SUCCESS' : 'DONE';
    const summary = args.summary as string || null;

    return {
        action: outcome,
        target: null,
        preview: truncate(summary, 120),
    };
}

function formatPass(_args: Record<string, unknown>): Partial<ToolSummary> {
    return {
        action: 'passed turn',
        target: null,
        preview: 'Focus pool restored',
    };
}

function formatRespond(args: Record<string, unknown>): Partial<ToolSummary> {
    const message = args.message as string || args.response as string || null;
    return {
        action: 'responded to user',
        target: null,
        preview: truncate(message, 120),
    };
}

function formatEngram(args: Record<string, unknown>): Partial<ToolSummary> {
    const action = args.action as string || 'access';
    const name = args.name as string || args.query as string || null;
    return {
        action: `${action} engram`,
        target: null,
        preview: truncate(name, 80),
    };
}

// ── Registry ──────────────────────────────────────────────────

type FormatterFn = (
    args: Record<string, unknown>,
    result: Record<string, unknown> | null,
) => Partial<ToolSummary>;

const FORMATTERS: Record<string, FormatterFn> = {
    mcp_ticket: formatTicket,
    mcp_done: (a) => formatDone(a),
    mcp_pass: (a) => formatPass(a),
    mcp_respond_to_user: (a) => formatRespond(a),
    mcp_engram: (a) => formatEngram(a),
    mcp_engram_search: (a) => formatEngram({ ...a, action: 'search' }),
    mcp_engram_store: (a) => formatEngram({ ...a, action: 'store' }),
    mcp_engram_recall: (a) => formatEngram({ ...a, action: 'recall' }),
};

// ── Main Export ───────────────────────────────────────────────

/**
 * Produce a human-readable summary of a tool call.
 * Known tools get semantic formatting. Unknown tools get a generic fallback.
 */
export function summarizeTool(tc: ToolCallData): ToolSummary {
    const args = parseArgs(tc.arguments);
    const result = parseResult(tc.result_payload);
    const thought = (args.thought as string) || null;
    const statusOk = tc.status_name?.toUpperCase() === 'SUCCESS';
    const hasTb = !!tc.traceback;

    // Try known formatter
    const formatter = FORMATTERS[tc.tool_name];
    if (formatter) {
        const partial = formatter(args, result);
        return {
            action: partial.action || tc.tool_name,
            target: partial.target || null,
            preview: partial.preview || null,
            thought: thought ? truncate(thought, 200) : null,
            success: partial.success ?? (statusOk ? true : hasTb ? false : null),
            hasError: partial.hasError ?? hasTb,
            errorMessage: partial.errorMessage || (hasTb ? truncate(tc.traceback, 120) : null),
        };
    }

    // Fallback: tool_name + first non-plumbing arg
    const plumbing = new Set(['session_id', 'turn_id', 'thought']);
    const meaningful = Object.entries(args).find(([k]) => !plumbing.has(k));
    const fallbackAction = meaningful
        ? `${meaningful[0]}: ${truncate(String(meaningful[1]), 40)}`
        : tc.tool_name;

    return {
        action: fallbackAction,
        target: null,
        preview: null,
        thought: thought ? truncate(thought, 200) : null,
        success: statusOk ? true : hasTb ? false : null,
        hasError: hasTb,
        errorMessage: hasTb ? truncate(tc.traceback, 120) : null,
    };
}

/**
 * One-liner string for compact displays (activity panel, hover cards, turn markers).
 * Format: "mcp_ticket → update perspective  ✓"
 */
export function toolOneLiner(tc: ToolCallData): string {
    const s = summarizeTool(tc);
    const icon = s.success === true ? ' ✓' : s.success === false ? ' ✗' : '';
    return `${tc.tool_name} → ${s.action}${icon}`;
}

/**
 * Extract thought field from a tool call's arguments.
 */
export function extractThought(tc: ToolCallData): string | null {
    const args = parseArgs(tc.arguments);
    const thought = args.thought as string | undefined;
    return thought ? String(thought).trim() : null;
}

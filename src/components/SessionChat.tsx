/**
 * SessionChat – Isolated chat interface for a specific ReasoningSession.
 * Utilizes the Synaptic Cleft (O² routing matrix) for zero-polling, real-time sync.
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
    AssistantRuntimeProvider,
    useLocalRuntime,
    AuiIf,
    ThreadPrimitive,
    ComposerPrimitive,
    MessagePrimitive,
    ChainOfThoughtPrimitive,
    type ChatModelAdapter,
    type ThreadMessage,
    type ThreadAssistantMessagePart,
} from '@assistant-ui/react';
import { apiFetch } from '../api';
import { useDendrite, type Neurotransmitter } from './SynapticCleft.tsx';
import './ThalamusChat.css'; // Reusing the glassmorphic styles

// Assuming a standard REST structure for your session endpoints

const getInteractUrl = (sessionId: string) => `/api/v2/reasoning_sessions/${sessionId}/resume/`;
const getMessagesUrl = (sessionId: string) => `/api/v2/reasoning_sessions/${sessionId}/messages/?volatile=true`;

// ---------------------------------------------------------------------------
// Local JSON type aliases — mirrors assistant-ui's ReadonlyJSONObject without
// importing it (avoids a cross-package type drift).
// ---------------------------------------------------------------------------
type JSONPrimitive = string | number | boolean | null;
type JSONValue = JSONPrimitive | JSONValue[] | { [key: string]: JSONValue };
type ReadonlyJSONObject = { readonly [key: string]: JSONValue };

// ---------------------------------------------------------------------------
// Backend shapes
// ---------------------------------------------------------------------------

export interface BackendToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string | Record<string, JSONValue>;
    };
}

export interface BackendMessagePart {
    type: 'text' | 'reasoning' | 'tool-call' | 'tool-result';
    text?: string;
    reasoning?: string;
    toolCallId?: string;
    toolName?: string;
    args?: string | Record<string, JSONValue>;
    result?: JSONValue;
}

export interface BackendMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content?: string | JSONValue;
    text?: string;
    parts?: BackendMessagePart[];
    tool_calls?: BackendToolCall[];
    tool_call_id?: string;
    name?: string;
}

interface SynapseChatEvent extends Event {
    detail: Neurotransmitter;
}

// ---------------------------------------------------------------------------
// Pure utility helpers
// ---------------------------------------------------------------------------

function getRawText(m: BackendMessage): string {
    if (typeof m.content === 'string') return m.content;
    if (typeof m.text === 'string') return m.text;
    return '';
}

function parseArgsObject(args: string | Record<string, JSONValue> | undefined): ReadonlyJSONObject {
    if (args === undefined || args === null) return {};
    if (typeof args === 'string') {
        try {
            const parsed: unknown = JSON.parse(args);
            if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed as ReadonlyJSONObject;
            }
        } catch {
            // ignore malformed JSON
        }
        return {};
    }
    return args as ReadonlyJSONObject;
}

function argsToText(args: string | Record<string, JSONValue> | undefined): string {
    if (args === undefined || args === null) return '{}';
    if (typeof args === 'string') return args;
    return JSON.stringify(args);
}

function safeStringify(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2) ?? String(value);
    } catch {
        return String(value);
    }
}

// ---------------------------------------------------------------------------
// Content builder
// Produces a strongly-typed ThreadAssistantMessagePart[] from a backend msg.
// tool-result parts are merged into the result field of their paired tool-call.
// ---------------------------------------------------------------------------

function buildAssistantParts(m: BackendMessage, index: number): ThreadAssistantMessagePart[] {
    const parts: ThreadAssistantMessagePart[] = [];

    if (m.parts && m.parts.length > 0) {
        // First pass: build parts and track tool-call indices by id so we can
        // attach tool-result payloads in the same pass.
        const toolCallIndexById = new Map<string, number>();

        for (const p of m.parts) {
            switch (p.type) {
                case 'reasoning': {
                    parts.push({ type: 'reasoning', text: p.reasoning ?? p.text ?? '' });
                    break;
                }
                case 'text': {
                    if (p.text) {
                        parts.push({ type: 'text', text: p.text });
                    }
                    break;
                }
                case 'tool-call': {
                    const tcId = p.toolCallId ?? `tc-${index}-${parts.length}`;
                    toolCallIndexById.set(tcId, parts.length);
                    parts.push({
                        type: 'tool-call',
                        toolCallId: tcId,
                        toolName: p.toolName ?? 'unknown_tool',
                        args: parseArgsObject(p.args),
                        argsText: argsToText(p.args),
                    });
                    break;
                }
                case 'tool-result': {
                    // Attach the result onto the matching tool-call part in-place.
                    const tcId = p.toolCallId;
                    if (tcId !== undefined) {
                        const tcIdx = toolCallIndexById.get(tcId);
                        if (tcIdx !== undefined) {
                            const existing = parts[tcIdx];
                            if (existing.type === 'tool-call') {
                                parts[tcIdx] = {
                                    ...existing,
                                    result: p.result ?? p.text ?? '',
                                };
                            }
                        }
                    }
                    break;
                }
            }
        }
    } else {
        const rawText = getRawText(m);
        if (rawText) {
            parts.push({ type: 'text', text: rawText });
        }
    }

    // Append flat tool_calls (OpenAI-style) that exist outside of parts.
    if (m.tool_calls) {
        for (const tc of m.tool_calls) {
            parts.push({
                type: 'tool-call',
                toolCallId: tc.id,
                toolName: tc.function?.name ?? 'unknown_tool',
                args: parseArgsObject(tc.function?.arguments),
                argsText: argsToText(tc.function?.arguments),
            });
        }
    }

    return parts;
}

// ---------------------------------------------------------------------------
// Thread history helpers
// ---------------------------------------------------------------------------

function getLastUserText(messages: readonly ThreadMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== 'user') continue;
        if (Array.isArray(m.content)) {
            for (const part of m.content) {
                if (part.type === 'text' && 'text' in part && typeof part.text === 'string') {
                    return part.text;
                }
            }
        }
    }
    return '';
}

// ---------------------------------------------------------------------------
// Model adapter
// ---------------------------------------------------------------------------

const createSessionModelAdapter = (sessionId: string): ChatModelAdapter => ({
    async run({ messages, abortSignal }): Promise<{ content: readonly ThreadAssistantMessagePart[] }> {
        const userText = getLastUserText(messages);
        if (!userText.trim()) {
            return { content: [{ type: 'text', text: '[No message to send.]' }] };
        }

        // 1. Post the new user message to the specific session
        const res = await apiFetch(getInteractUrl(sessionId), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reply: userText.trim() }),
            signal: abortSignal,
        });

        if (!res.ok) {
            try {
                const errorData = await res.json() as { message?: string };
                return { content: [{ type: 'text', text: `⚠️ ${errorData.message ?? 'Unknown error'}` }] };
            } catch {
                return { content: [{ type: 'text', text: `⚠️ Network error: ${res.status}` }] };
            }
        }

        // 2. Wait natively for the Synaptic Cleft to deliver this specific session's response
        return new Promise<{ content: readonly ThreadAssistantMessagePart[] }>((resolve) => {
            const eventName = `synapse_chat_message_${sessionId}`;

            const handleWsEvent = (e: Event) => {
                const customEvent = e as SynapseChatEvent;
                const v = customEvent.detail.vesicle as BackendMessage | undefined;

                if (v && (v.role === 'assistant' || v.role === 'tool')) {
                    window.removeEventListener(eventName, handleWsEvent);
                    resolve({ content: buildAssistantParts(v, 0) });
                }
            };

            window.addEventListener(eventName, handleWsEvent);

            abortSignal?.addEventListener('abort', () => {
                window.removeEventListener(eventName, handleWsEvent);
                resolve({ content: [{ type: 'text', text: '[Cancelled.]' }] });
            });
        });
    },
});

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------

const ChainOfThought: React.FC = () => (
    <ChainOfThoughtPrimitive.Root className="thalamus-cot-root">
        <ChainOfThoughtPrimitive.AccordionTrigger className="thalamus-cot-trigger">
            <span>🤔 Thought Process</span>
        </ChainOfThoughtPrimitive.AccordionTrigger>

        <AuiIf condition={(s) => !s.chainOfThought.collapsed}>
            <ChainOfThoughtPrimitive.Parts>
                {({ part }) => {
                    if (part.type !== 'reasoning') return null;
                    const text =
                        'reasoning' in part && typeof part.reasoning === 'string'
                            ? part.reasoning
                            : 'text' in part && typeof part.text === 'string'
                                ? part.text
                                : '';
                    return (
                        <div className="thalamus-cot-content">
                            {text}
                        </div>
                    );
                }}
            </ChainOfThoughtPrimitive.Parts>
        </AuiIf>
    </ChainOfThoughtPrimitive.Root>
);

// Receives content as a prop — avoids the deprecated useMessage() hook and
// the TS2339 "message does not exist on MessageState" error entirely.
interface CustomMessageToolsProps {
    content: readonly ThreadAssistantMessagePart[];
}

const RESULT_PREVIEW_LIMIT = 200;

const CustomMessageTools: React.FC<CustomMessageToolsProps> = ({ content }) => (
    <>
        {content.map((part, idx) => {
            if (part.type !== 'tool-call') return null;

            const hasResult = part.result !== undefined;
            const argsObj = (part.args ?? {}) as Record<string, JSONValue>;
            const thought = argsObj.thought;
            const otherArgs = Object.entries(argsObj).filter(([k]) => k !== 'thought');
            const resultStr = hasResult ? safeStringify(part.result) : '';
            const isLongResult = resultStr.length > RESULT_PREVIEW_LIMIT;

            return (
                <React.Fragment key={`${part.toolCallId}-${idx}`}>
                    <div className="thalamus-tool-call">
                        <div className="thalamus-tool-call-header">
                            <span className="thalamus-tool-call-icon">⚙️</span>
                            <span className="thalamus-tool-call-name">{part.toolName}</span>
                        </div>
                        {thought && (
                            <div className="thalamus-tool-thought">
                                {String(thought)}
                            </div>
                        )}
                        {otherArgs.length > 0 && (
                            <div className="thalamus-tool-call-params">
                                {otherArgs.map(([key, val]) => (
                                    <div key={key} className="thalamus-tool-param">
                                        <span className="thalamus-tool-param-key">{key}</span>
                                        <span className="thalamus-tool-param-val">
                                            {typeof val === 'string' ? val : safeStringify(val)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {hasResult && (
                        <div className="thalamus-tool-result">
                            <div className="thalamus-tool-result-label">Result</div>
                            {isLongResult ? (
                                <details className="thalamus-tool-result-details">
                                    <summary className="thalamus-tool-result-summary">
                                        {resultStr.slice(0, RESULT_PREVIEW_LIMIT)}…
                                    </summary>
                                    <div className="thalamus-tool-result-value">
                                        {resultStr}
                                    </div>
                                </details>
                            ) : (
                                <div className="thalamus-tool-result-value">
                                    {resultStr}
                                </div>
                            )}
                        </div>
                    )}
                </React.Fragment>
            );
        })}
    </>
);

function SessionThreadInner() {
    return (
        <ThreadPrimitive.Root className="thalamus-thread">
            <ThreadPrimitive.Viewport className="thalamus-viewport">
                <AuiIf condition={(s) => s.thread.isEmpty}>
                    <div className="thalamus-welcome">
                        <p>Frontal Lobe Session</p>
                        <p className="thalamus-welcome-hint">
                            Inject a message directly into this active Spike.
                        </p>
                    </div>
                </AuiIf>
                <ThreadPrimitive.Messages>
                    {({ message }) => {
                        // Narrowed cast: we only pass assistant content to CustomMessageTools,
                        // and only when the role is actually 'assistant'.
                        const assistantContent: readonly ThreadAssistantMessagePart[] =
                            message.role === 'assistant'
                                ? (message.content as readonly ThreadAssistantMessagePart[])
                                : [];

                        return (
                            <div className={`thalamus-message thalamus-message--${message.role}`}>
                                <MessagePrimitive.Root>
                                    <div className="thalamus-message-text">
                                        <MessagePrimitive.Parts
                                            components={{ ChainOfThought }}
                                        />
                                        {message.role === 'assistant' && (
                                            <CustomMessageTools content={assistantContent} />
                                        )}
                                    </div>
                                </MessagePrimitive.Root>
                            </div>
                        );
                    }}
                </ThreadPrimitive.Messages>

                <ThreadPrimitive.ViewportFooter className="thalamus-footer">
                    <ThreadPrimitive.ScrollToBottom className="thalamus-scroll-btn" />
                    <ComposerPrimitive.Root className="thalamus-composer">
                        <ComposerPrimitive.Input
                            className="thalamus-input"
                            placeholder="Message this session…"
                        />
                        <AuiIf condition={(s) => !s.thread.isRunning}>
                            <ComposerPrimitive.Send className="thalamus-send">Send</ComposerPrimitive.Send>
                        </AuiIf>
                        <AuiIf condition={(s) => s.thread.isRunning}>
                            <ComposerPrimitive.Cancel className="thalamus-cancel">Cancel</ComposerPrimitive.Cancel>
                        </AuiIf>
                    </ComposerPrimitive.Root>
                </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
    );
}

function SessionRuntimeProvider({ sessionId, children }: { sessionId: string; children: React.ReactNode }) {
    const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(true);

    // Sprout a Dendrite to listen to the new Ledger-backed SynapseResponse globally
    const newChatPacket = useDendrite('SynapseResponse', null);
    const [seenMessageIds] = useState<Set<string>>(new Set());

    // Filter cross-talk and bridge the WebSocket packet into a DOM event locked to this Session ID
    useEffect(() => {
        if (newChatPacket && newChatPacket.activity === 'created') {
            const vesicle = newChatPacket.vesicle;

            // THE CRITICAL CHECK: Does this message belong to this specific session?
            if (vesicle && (vesicle as Record<string, unknown>).session_id === sessionId) {
                // Deduplicate by message ID to prevent processing the same message twice
                const msgId = (vesicle as Record<string, unknown>).id;
                if (msgId && seenMessageIds.has(String(msgId))) {
                    return; // Skip if we've already processed this message ID
                }
                if (msgId) {
                    seenMessageIds.add(String(msgId));
                }

                const eventName = `synapse_chat_message_${sessionId}`;
                const event = new CustomEvent(eventName, { detail: newChatPacket });
                window.dispatchEvent(event);
            }
        }
    }, [newChatPacket, sessionId, seenMessageIds]);

    // Initial Hydration with deduplication
    useEffect(() => {
        let cancelled = false;

        apiFetch(getMessagesUrl(sessionId))
            .then(res => res.json())
            .then((data: { messages?: BackendMessage[] }) => {
                if (cancelled) return;
                const list = data.messages || [];

                // Deduplicate messages by creating a content hash to detect duplicates
                const seenHashes = new Set<string>();

                const formatted: ThreadMessage[] = [];

                list.forEach((m: BackendMessage, i: number) => {
                    // Create a hash of the message content for deduplication
                    const contentHash = `${m.role}:${getRawText(m) || JSON.stringify(m.parts || m.tool_calls || '')}`;

                    // Skip if we've already seen this exact message
                    if (seenHashes.has(contentHash)) {
                        return;
                    }
                    seenHashes.add(contentHash);

                    if (m.role === 'user') {
                        const text = getRawText(m);
                        if (text.trim()) { // Only add non-empty user messages
                            formatted.push({
                                id: `history-${i}-user-${contentHash.slice(0, 8)}`,
                                role: 'user',
                                content: [{ type: 'text', text }],
                                createdAt: new Date(),
                                metadata: { custom: {} },
                                attachments: [],
                            } as unknown as ThreadMessage);
                        }
                    } else {
                        // assistant / system / tool — all rendered as assistant bubbles.
                        const parts = buildAssistantParts(m, i);
                        if (parts.length > 0) { // Only add messages with actual parts
                            formatted.push({
                                id: `history-${i}-assistant-${contentHash.slice(0, 8)}`,
                                role: 'assistant',
                                content: parts,
                                createdAt: new Date(),
                                metadata: { custom: {} },
                                attachments: [],
                                status: { type: 'complete' },
                            } as unknown as ThreadMessage);
                        }
                    }
                });

                setInitialMessages(formatted);
                setIsSyncing(false);
            })
            .catch(() => {
                if (!cancelled) setIsSyncing(false);
            });

        return () => {
            cancelled = true;
        };
    }, [sessionId]);

    const adapter = useMemo(() => createSessionModelAdapter(sessionId), [sessionId]);
    const runtime = useLocalRuntime(adapter, { initialMessages });

    if (isSyncing) {
        return (
            <div className="thalamus-welcome thalamus-welcome--syncing">
                <p>Syncing session memory…</p>
            </div>
        );
    }

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}

export interface SessionChatProps {
    sessionId: string;
    title?: string;
    onClose?: () => void;
}

export function SessionChat({ sessionId, title = 'SESSION OVERLAY', onClose }: SessionChatProps): React.JSX.Element {
    return (
        <div className="thalamus-chat glass-panel">
            <div className="thalamus-chat-header">
                <h2 className="glass-panel-title">{title}</h2>
                {onClose && (
                    <button
                        type="button"
                        className="panel-close-btn"
                        onClick={onClose}
                        aria-label="Close chat"
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="thalamus-chat-body">
                <SessionRuntimeProvider sessionId={sessionId}>
                    <SessionThreadInner />
                </SessionRuntimeProvider>
            </div>
        </div>
    );
}
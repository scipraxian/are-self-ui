/**
 * Thalamus – direct chat interface using @assistant-ui/react.
 * Renders the assistant-ui Thread with a custom runtime that POSTs to the
 * API Gateway and syncs message history natively via Synaptic WebSockets.
 */

import React, { useEffect, useState } from 'react';
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
import './ThalamusChat.css';

const INTERACT_URL = 'http://127.0.0.1:8000/api/v2/thalamus/interact/';
const MESSAGES_URL = 'http://127.0.0.1:8000/api/v2/thalamus/messages/';

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

// Maps backend history messages to ThreadMessage.
// We force-cast via unknown because the assistant-ui discriminated union
// has internal required fields (status, attachments, metadata) with no
// public constructor — this cast is intentional and isolated to this mapper.
function mapBackendMessageToThread(m: BackendMessage, index: number): ThreadMessage {
    const id = `history-${index}-${m.role}`;

    if (m.role === 'user') {
        const text = getRawText(m);
        return {
            id,
            role: 'user',
            content: [{ type: 'text', text }],
            createdAt: new Date(),
            metadata: { custom: {} },
            attachments: [],
            // NOTE: status is NOT valid on user messages — the runtime throws if present
        } as unknown as ThreadMessage;
    }

    // assistant / system / tool — all rendered as assistant bubbles.
    return {
        id,
        role: 'assistant',
        content: buildAssistantParts(m, index),
        createdAt: new Date(),
        metadata: { custom: {} },
        attachments: [],
        status: { type: 'complete' },
    } as unknown as ThreadMessage;
}

// ---------------------------------------------------------------------------
// Model adapter
// ---------------------------------------------------------------------------

const thalamusModelAdapter: ChatModelAdapter = {
    async run({ messages, abortSignal }): Promise<{ content: readonly ThreadAssistantMessagePart[] }> {
        const userText = getLastUserText(messages);
        if (!userText.trim()) {
            return { content: [{ type: 'text', text: '[No message to send.]' }] };
        }

        let baselineLength = 0;
        try {
            const baseRes = await apiFetch(MESSAGES_URL);
            if (baseRes.ok) {
                const baseData = await baseRes.json() as { messages?: BackendMessage[] };
                baselineLength = (baseData.messages ?? []).length;
            }
        } catch {
            console.warn('Failed to fetch baseline history.');
        }

        const res = await apiFetch(INTERACT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText.trim() }),
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

        return new Promise<{ content: readonly ThreadAssistantMessagePart[] }>((resolve) => {
            const handleWsEvent = async (e: Event): Promise<void> => {
                const { detail } = e as SynapseChatEvent;

                if (detail.activity !== 'saved') return;

                try {
                    const historyRes = await apiFetch(MESSAGES_URL);
                    if (!historyRes.ok) return;

                    const data = await historyRes.json() as { messages?: BackendMessage[] };
                    const list = data.messages ?? [];

                    if (list.length <= baselineLength) return;

                    const lastMsg = list[list.length - 1];
                    if (lastMsg?.role === 'assistant' || lastMsg?.role === 'tool') {
                        window.removeEventListener('synapse_chat_message', handleWsEvent);
                        resolve({ content: buildAssistantParts(lastMsg, list.length) });
                    }
                } catch (err) {
                    console.error('Failed to fetch AI response:', err);
                }
            };

            window.addEventListener('synapse_chat_message', handleWsEvent);

            abortSignal?.addEventListener('abort', () => {
                window.removeEventListener('synapse_chat_message', handleWsEvent);
                resolve({ content: [{ type: 'text', text: '[Cancelled.]' }] });
            });
        });
    },
};

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------

const ChainOfThought: React.FC = () => (
    <ChainOfThoughtPrimitive.Root className="thalamus-cot-root my-2">
        <ChainOfThoughtPrimitive.AccordionTrigger className="thalamus-cot-trigger cursor-pointer text-sm font-bold text-gray-500 mb-1 flex items-center hover:text-gray-300 transition-colors">
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
                        <div className="thalamus-cot-content text-sm text-gray-400 italic mt-2 whitespace-pre-wrap border-l-2 border-gray-600 pl-3">
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

const CustomMessageTools: React.FC<CustomMessageToolsProps> = ({ content }) => (
    <>
        {content.map((part, idx) => {
            if (part.type !== 'tool-call') return null;

            // TypeScript has narrowed part to ToolCallMessagePart here.
            // result is typed as unknown (the TResult generic default).
            const hasResult = part.result !== undefined;

            return (
                <React.Fragment key={`${part.toolCallId}-${idx}`}>
                    <div className="thalamus-tool-call bg-gray-800 border border-blue-900/50 rounded-md p-3 my-2 text-sm shadow-sm">
                        <div className="font-bold text-blue-400 mb-1 flex items-center gap-2">
                            <span>⚙️</span>
                            <span>{part.toolName}</span>
                        </div>
                        <pre className="text-gray-300 font-mono text-xs bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                            {part.argsText}
                        </pre>
                    </div>

                    {hasResult && (
                        <div className="thalamus-tool-result bg-gray-800/50 border border-gray-700 border-dashed rounded-md p-3 my-1 text-sm shadow-inner">
                            <div className="font-semibold text-green-400 mb-1 text-xs uppercase tracking-wide">
                                Tool Return Value
                            </div>
                            <div className="text-gray-400 font-mono text-xs whitespace-pre-wrap break-words">
                                {safeStringify(part.result)}
                            </div>
                        </div>
                    )}
                </React.Fragment>
            );
        })}
    </>
);

function ThalamusThreadInner(): React.JSX.Element {
    return (
        <ThreadPrimitive.Root className="thalamus-thread">
            <ThreadPrimitive.Viewport className="thalamus-viewport">
                <AuiIf condition={(s) => s.thread.isEmpty}>
                    <div className="thalamus-welcome">
                        <p>Thalamus</p>
                        <p className="thalamus-welcome-hint">
                            Send a message to ignite the neural pathway. Responses arrive instantly via Synapse.
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
                            placeholder="Message the Thalamus…"
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

function ThalamusRuntimeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
    const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(true);

    const newTurnPacket = useDendrite('ReasoningTurn', null);

    useEffect(() => {
        if (newTurnPacket?.activity === 'saved') {
            const event = new CustomEvent('synapse_chat_message', { detail: newTurnPacket });
            window.dispatchEvent(event);
        }
    }, [newTurnPacket]);

    useEffect(() => {
        let cancelled = false;

        apiFetch(MESSAGES_URL)
            .then((res) => res.json())
            .then((data: { messages?: BackendMessage[] }) => {
                if (cancelled) return;
                setInitialMessages((data.messages ?? []).map(mapBackendMessageToThread));
                setIsSyncing(false);
            })
            .catch(() => {
                if (!cancelled) setIsSyncing(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const runtime = useLocalRuntime(thalamusModelAdapter, { initialMessages });

    if (isSyncing) {
        return (
            <div className="thalamus-welcome flex justify-center items-center h-full text-gray-500">
                <p>Syncing neural pathways…</p>
            </div>
        );
    }

    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}

export interface ThalamusChatProps {
    onClose?: () => void;
}

export function ThalamusChat({ onClose }: ThalamusChatProps): React.JSX.Element {
    return (
        <div className="thalamus-chat glass-panel flex flex-col h-full">
            <div className="thalamus-chat-header flex justify-between items-center p-4 border-b border-gray-700">
                <h2 className="glass-panel-title font-bold text-lg tracking-widest text-indigo-400">
                    THALAMUS
                </h2>
                {onClose && (
                    <button
                        type="button"
                        className="bbb-close-btn text-gray-400 hover:text-white transition-colors"
                        onClick={onClose}
                        aria-label="Close chat"
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="thalamus-chat-body flex-1 overflow-hidden relative">
                <ThalamusRuntimeProvider>
                    <ThalamusThreadInner />
                </ThalamusRuntimeProvider>
            </div>
        </div>
    );
}
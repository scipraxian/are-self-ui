/**
 * Thalamus – direct chat interface using @assistant-ui/react.
 * Renders the assistant-ui Thread with a custom runtime that POSTs to the
 * API Gateway and syncs message history (async Celery responses).
 */

import { useEffect, useState } from 'react';
import {
    AssistantRuntimeProvider,
    useLocalRuntime,
    AuiIf,
    ThreadPrimitive,
    ComposerPrimitive,
    MessagePrimitive,
    type ChatModelAdapter,
    type ThreadMessage,
} from '@assistant-ui/react';
import { apiFetch } from '../api';
import './ThalamusChat.css';

const INTERACT_URL = '/api/v2/thalamus/interact/';
const MESSAGES_URL = '/api/v2/thalamus/messages/';
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120000;

interface BackendMessage {
    role: string;
    content?: string;
    text?: string;
}

function getLastUserText(messages: readonly ThreadMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (m.role !== 'user') continue;
        const content = m.content;
        if (Array.isArray(content)) {
            const textPart = content.find((p: { type?: string }) => p.type === 'text');
            if (textPart && typeof (textPart as { text?: string }).text === 'string') {
                return (textPart as { text: string }).text;
            }
        }
        if (typeof content === 'string') return content;
    }
    return '';
}

const thalamusModelAdapter: ChatModelAdapter = {
    async run({ messages, abortSignal }) {
        const userText = getLastUserText(messages);
        if (!userText.trim()) {
            return { content: [{ type: 'text', text: '[No message to send.]' }] };
        }

        // 1. Establish the baseline database size BEFORE posting
        let baselineCount = 0;
        try {
            const preRes = await apiFetch(MESSAGES_URL, { signal: abortSignal });
            if (preRes.ok) {
                const preData = await preRes.json() as { messages?: BackendMessage[] };
                baselineCount = (preData.messages || []).length;
            }
        } catch {
            // Proceed even if baseline fails, it will just fallback to standard polling
        }

        // 2. Post the new user message to the backend
        const res = await apiFetch(INTERACT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText.trim() }),
            signal: abortSignal,
        });

        if (!res.ok) {
            const err = await res.text();
            return {
                content: [{ type: 'text', text: `Request failed: ${res.status}. ${err}` }],
            };
        }

        const data = (await res.json()) as { ok?: boolean; message?: string };
        if (data.ok !== true) {
            return {
                content: [
                    {
                        type: 'text',
                        text: data.message ?? 'Neural pathway re-ignited. Awaiting response…',
                    },
                ],
            };
        }

        // 3. Poll until the database has MORE messages than the baseline
        const start = Date.now();

        while (Date.now() - start < POLL_TIMEOUT_MS) {
            if (abortSignal?.aborted) {
                return { content: [{ type: 'text', text: '[Cancelled.]' }] };
            }

            try {
                const msgRes = await apiFetch(MESSAGES_URL, { signal: abortSignal });
                if (msgRes.ok) {
                    const msgData = await msgRes.json() as { messages?: BackendMessage[] };
                    const list = msgData.messages || [];

                    if (list.length > baselineCount) {
                        // Extract only the messages generated AFTER our POST
                        const newMessages = list.slice(baselineCount);
                        const latestAssistant = newMessages.filter((m: BackendMessage) => m.role === 'assistant').pop();

                        if (latestAssistant) {
                            const text = typeof latestAssistant.content === 'string'
                                ? latestAssistant.content
                                : latestAssistant.text ?? '';

                            if (text) {
                                return { content: [{ type: 'text', text }] };
                            }
                        }
                    }
                }
            } catch {
                // Ignore transient fetch errors and keep polling
            }
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }

        return {
            content: [
                {
                    type: 'text',
                    text: 'Response is taking longer than expected. It may appear when the Spike completes.',
                },
            ],
        };
    },
};

// Extracted the Thread rendering out so it's clean
function ThalamusThreadInner() {
    return (
        <ThreadPrimitive.Root className="thalamus-thread">
            <ThreadPrimitive.Viewport className="thalamus-viewport">
                <AuiIf condition={(s) => s.thread.isEmpty}>
                    <div className="thalamus-welcome">
                        <p>Thalamus</p>
                        <p className="thalamus-welcome-hint">
                            Send a message to ignite the neural pathway. Responses arrive asynchronously.
                        </p>
                    </div>
                </AuiIf>
                <ThreadPrimitive.Messages>
                    {({ message }) => (
                        <div className={`thalamus-message thalamus-message--${message.role}`}>
                            <MessagePrimitive.Root>
                                {/* Wrapped Parts in your text class so CSS actually applies */}
                                <div className="thalamus-message-text">
                                    <MessagePrimitive.Parts />
                                </div>
                            </MessagePrimitive.Root>
                        </div>
                    )}
                </ThreadPrimitive.Messages>
                <ThreadPrimitive.ViewportFooter className="thalamus-footer">
                    <ThreadPrimitive.ScrollToBottom className="thalamus-scroll-btn" />
                    <ComposerPrimitive.Root className="thalamus-composer">
                        <ComposerPrimitive.Input
                            className="thalamus-input"
                            placeholder="Message the Thalamus…"
                        />
                        <AuiIf condition={(s) => !s.thread.isRunning}>
                            <ComposerPrimitive.Send className="thalamus-send">
                                Send
                            </ComposerPrimitive.Send>
                        </AuiIf>
                        <AuiIf condition={(s) => s.thread.isRunning}>
                            <ComposerPrimitive.Cancel className="thalamus-cancel">
                                Cancel
                            </ComposerPrimitive.Cancel>
                        </AuiIf>
                    </ComposerPrimitive.Root>
                </ThreadPrimitive.ViewportFooter>
            </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
    );
}

// Manages the initial data fetch and injects it safely into the Runtime
function ThalamusRuntimeProvider({ children }: { children: React.ReactNode }) {
    const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(true);

    useEffect(() => {
        let cancelled = false;

        apiFetch(MESSAGES_URL)
            .then(res => res.json())
            .then((data: { messages?: BackendMessage[] }) => {
                if (cancelled) return;
                const list = data.messages || [];

                // Format backend data perfectly for assistant-ui
                const formatted: ThreadMessage[] = list.map((m: BackendMessage, i: number) => {
                    const text = typeof m.content === 'string' ? m.content : (m.text || '');
                    return {
                        id: `history-${i}`,
                        role: (m.role === 'assistant' || m.role === 'system' ? m.role : 'user'),
                        content: [{ type: 'text', text }],
                        createdAt: new Date(),
                        metadata: {}
                    } as unknown as ThreadMessage; // <-- The sledgehammer
                });

                setInitialMessages(formatted);
                setIsSyncing(false);
            })
            .catch(() => {
                if (!cancelled) setIsSyncing(false); // Fail gracefully, start empty
            });

        return () => { cancelled = true; };
    }, []);

    const runtime = useLocalRuntime(thalamusModelAdapter, { initialMessages });

    if (isSyncing) {
        return (
            <div className="thalamus-welcome">
                <p>Syncing neural pathways...</p>
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

export function ThalamusChat({ onClose }: ThalamusChatProps) {
    return (
        <div className="thalamus-chat glass-panel">
            <div className="thalamus-chat-header">
                <h2 className="glass-panel-title">THALAMUS</h2>
                {onClose && (
                    <button
                        type="button"
                        className="bbb-close-btn"
                        onClick={onClose}
                        aria-label="Close chat"
                    >
                        ✕
                    </button>
                )}
            </div>
            <div className="thalamus-chat-body">
                <ThalamusRuntimeProvider>
                    <ThalamusThreadInner />
                </ThalamusRuntimeProvider>
            </div>
        </div>
    );
}
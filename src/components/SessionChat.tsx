/**
 * SessionChat – Isolated chat interface for a specific ReasoningSession.
 * Utilizes the Synaptic Cleft (O² routing matrix) for zero-polling, real-time sync.
 */

import React, {useEffect, useState, useMemo} from 'react';
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
import {apiFetch} from '../api';
import {useDendrite, type Neurotransmitter} from './SynapticCleft.tsx';
import './ThalamusChat.css'; // Reusing the glassmorphic styles

// Assuming a standard REST structure for your session endpoints

const getInteractUrl = (sessionId: string) => `/api/v2/reasoning_sessions/${sessionId}/resume/`;
const getMessagesUrl = (sessionId: string) => `/api/v2/reasoning_sessions/${sessionId}/messages/?volatile=true`;

interface BackendMessage {
    role: string;
    content?: string;
    text?: string;
}

interface SynapseChatEvent extends Event {
    detail: Neurotransmitter;
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

// FACTORY: Creates an adapter locked to a specific Session ID
const createSessionModelAdapter = (sessionId: string): ChatModelAdapter => ({
    async run({messages, abortSignal}) {
        const userText = getLastUserText(messages);
        if (!userText.trim()) {
            return {content: [{type: 'text', text: '[No message to send.]'}]};
        }

        // 1. Post the new user message to the specific session
        const res = await apiFetch(getInteractUrl(sessionId), {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({reply: userText.trim()}),
            signal: abortSignal,
        });

        if (!res.ok) {
            try {
                const errorData = await res.json();
                return {content: [{type: 'text', text: `⚠️ ${errorData.message}`}]};
            } catch {
                return {content: [{type: 'text', text: `⚠️ Network error: ${res.status}`}]};
            }
        }

        // 2. Wait natively for the Synaptic Cleft to deliver this specific session's response
        return new Promise((resolve) => {
            const eventName = `synapse_chat_message_${sessionId}`;

            const handleWsEvent = (e: Event) => {
                const customEvent = e as SynapseChatEvent;
                const v = customEvent.detail.vesicle;

                if (v && v.role === 'assistant') {
                    window.removeEventListener(eventName, handleWsEvent);
                    resolve({content: [{type: 'text', text: v.content}]});
                }
            };

            window.addEventListener(eventName, handleWsEvent);

            abortSignal?.addEventListener('abort', () => {
                window.removeEventListener(eventName, handleWsEvent);
                resolve({content: [{type: 'text', text: '[Cancelled.]'}]});
            });
        });
    },
});

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
                    {({message}) => (
                        <div className={`thalamus-message thalamus-message--${message.role}`}>
                            <MessagePrimitive.Root>
                                <div className="thalamus-message-text">
                                    <MessagePrimitive.Parts/>
                                </div>
                            </MessagePrimitive.Root>
                        </div>
                    )}
                </ThreadPrimitive.Messages>
                <ThreadPrimitive.ViewportFooter className="thalamus-footer">
                    <ThreadPrimitive.ScrollToBottom className="thalamus-scroll-btn"/>
                    <ComposerPrimitive.Root className="thalamus-composer">
                        <ComposerPrimitive.Input
                            className="thalamus-input"
                            placeholder="Message this session…"
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

function SessionRuntimeProvider({sessionId, children}: { sessionId: string; children: React.ReactNode }) {
    const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(true);

    // Sprout a Dendrite to listen to the new Ledger-backed SynapseResponse globally
    const newChatPacket = useDendrite('SynapseResponse', null);

    // Filter cross-talk and bridge the WebSocket packet into a DOM event locked to this Session ID
    useEffect(() => {
        if (newChatPacket && newChatPacket.activity === 'created') {
            const vesicle = newChatPacket.vesicle;

            // THE CRITICAL CHECK: Does this message belong to this specific session?
            if (vesicle && vesicle.session_id === sessionId) {
                const eventName = `synapse_chat_message_${sessionId}`;
                const event = new CustomEvent(eventName, {detail: newChatPacket});
                window.dispatchEvent(event);
            }
        }
    }, [newChatPacket, sessionId]);

    // Initial Hydration
    useEffect(() => {
        let cancelled = false;

        apiFetch(getMessagesUrl(sessionId))
            .then(res => res.json())
            .then((data: { messages?: BackendMessage[] }) => {
                if (cancelled) return;
                const list = data.messages || [];

                const formatted: ThreadMessage[] = list.map((m: BackendMessage, i: number) => {
                    let text = typeof m.content === 'string' ? m.content : (m.text || '');

                    // Render tool-call parts inline as readable text
                    const parts = (m as Record<string, unknown>).parts as Array<Record<string, unknown>> | undefined;
                    if (parts && Array.isArray(parts)) {
                        for (const part of parts) {
                            if (part.type === 'tool-call') {
                                const toolName = part.toolName as string || 'unknown';
                                const args = part.args as Record<string, unknown> || {};
                                const argSummary = Object.entries(args)
                                    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? v.slice(0, 120) : JSON.stringify(v).slice(0, 120)}`)
                                    .join('\n');
                                text += `\n[${toolName}]\n${argSummary}`;
                            }
                        }
                    }

                    return {
                        id: `history-${i}`,
                        role: (m.role === 'assistant' || m.role === 'system' ? m.role : 'user'),
                        content: [{type: 'text', text: text.trim()}],
                        createdAt: new Date(),
                        metadata: {}
                    } as unknown as ThreadMessage;
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
    const runtime = useLocalRuntime(adapter, {initialMessages});

    if (isSyncing) {
        return (
            <div className="thalamus-welcome">
                <p>Syncing session memory...</p>
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

export function SessionChat({sessionId, title = "SESSION OVERLAY", onClose}: SessionChatProps) {
    return (
        <div className="thalamus-chat glass-panel">
            <div className="thalamus-chat-header">
                <h2 className="glass-panel-title">{title}</h2>
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
                <SessionRuntimeProvider sessionId={sessionId}>
                    <SessionThreadInner/>
                </SessionRuntimeProvider>
            </div>
        </div>
    );
}
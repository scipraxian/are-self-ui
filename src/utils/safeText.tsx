import React from 'react';
import DOMPurify from 'dompurify';

// Light HTML detector — used to decide whether to sanitize-and-render
// or treat as plain text. Lower threshold means more aggressive HTML
// detection. We want false negatives over false positives, since plain
// text rendered as plain text is harmless but the inverse leaks markup.
export const looksLikeHtml = (text: string): boolean => {
    if (!text) return false;
    return /<\/?(p|div|span|a|h[1-6]|ul|ol|li|table|tr|td|th|br|img|code|pre|strong|em|b|i)\b[^>]*>/i.test(text);
};

export const sanitizeHtml = (text: string): string => {
    return DOMPurify.sanitize(text, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus'],
    });
};

// Custom Text component override for `MessagePrimitive.Parts`. Renders
// sanitized HTML when the model produced markup, plain text otherwise.
//
// Props shape note: assistant-ui's `TextMessagePartProps` is
// `MessagePartState & TextMessagePart`, so `text` is at the top level
// of the props object — NOT nested under a `part` key. The earlier
// `props.part?.text` shape silently returned undefined → empty string
// → component returned null → blank message bubbles. (The 2026-04-28
// "Thalamus chat popup blank" regression.) Keep `text` flat unless
// assistant-ui ships a breaking change to part-component props.
interface SafeTextProps {
    text?: string;
    className?: string;
}

export const SafeText: React.FC<SafeTextProps> = ({ text, className }) => {
    const value = text ?? '';
    if (!value) return null;
    if (looksLikeHtml(value)) {
        return (
            <div
                className={className ?? 'message-html'}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
            />
        );
    }
    return <>{value}</>;
};

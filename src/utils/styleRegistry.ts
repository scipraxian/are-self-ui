const STYLE_TAG_PREFIX = 'are-self-dynamic-style:';

export function safeCssIdent(input: string): string {
    // Keep it deterministic and reasonably short; CSS identifiers cannot start with a digit.
    const cleaned = input.replace(/[^a-zA-Z0-9_-]/g, '_');
    return /^[0-9]/.test(cleaned) ? `n_${cleaned}` : cleaned;
}

export function ensureDynamicCss(key: string, cssText: string): void {
    const id = `${STYLE_TAG_PREFIX}${safeCssIdent(key)}`;
    let tag = document.getElementById(id) as HTMLStyleElement | null;
    if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
        tag.type = 'text/css';
        document.head.appendChild(tag);
    }
    tag.textContent = `/* ${key} */\n${cssText}\n`;
}


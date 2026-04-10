// Single source of truth for the are-self-docs site URL.
//
// HelpTip components take a `doc` slug like 'ui/hypothalamus' or
// 'brain-regions/hypothalamus#routing' and call docUrl() to build the
// full external URL. Override via VITE_DOCS_BASE_URL in .env.

const DEFAULT_DOCS_BASE_URL = 'https://are-self.com';

export const DOCS_BASE_URL: string =
    (import.meta.env.VITE_DOCS_BASE_URL as string | undefined) ?? DEFAULT_DOCS_BASE_URL;

export const docUrl = (slug: string): string => {
    const trimmed = slug.replace(/^\/+/, '');
    return `${DOCS_BASE_URL.replace(/\/+$/, '')}/${trimmed}`;
};

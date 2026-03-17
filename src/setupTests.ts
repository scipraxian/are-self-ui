import '@testing-library/jest-dom';

if (typeof ResizeObserver === 'undefined') {
    (globalThis as any).ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    } as unknown as typeof ResizeObserver;
}

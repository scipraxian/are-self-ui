import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { BloodBrainBarrier } from './BloodBrainBarrier';
import { GABAProvider } from '../context/GABAProvider';

function AppWithRouter({ initialEntry }: { initialEntry: string }) {
    return (
        <GABAProvider>
            <MemoryRouter initialEntries={[initialEntry]}>
                <Routes>
                    <Route path="/*" element={<BloodBrainBarrier />} />
                </Routes>
            </MemoryRouter>
        </GABAProvider>
    );
}

describe('BloodBrainBarrier CNS', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as Response)));
    });

    it('renders CNS graph in center panel at /cns/edit/:id so it receives pointer events', async () => {
        render(<AppWithRouter initialEntry="/cns/edit/94a67ded-0d4b-4060-b79a-6f895b2373a3" />);

        await waitFor(
            () => {
                const centerMain = document.querySelector('.bbb-panel-center-cns-graph');
                expect(centerMain).toBeInTheDocument();
                const graphWrapper = centerMain?.querySelector('.common-layout-2');
                expect(graphWrapper).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });

    it('renders CNS graph in center panel at /cns/monitor/:id for viewing', async () => {
        render(<AppWithRouter initialEntry="/cns/monitor/94a67ded-0d4b-4060-b79a-6f895b2373a3" />);

        await waitFor(
            () => {
                const centerMain = document.querySelector('.bbb-panel-center-cns-graph');
                expect(centerMain).toBeInTheDocument();
                expect(centerMain?.querySelector('.common-layout-2')).toBeInTheDocument();
            },
            { timeout: 2000 }
        );
    });
});

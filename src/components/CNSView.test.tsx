import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CNSView } from './CNSView';

const mockSpikeTrains = [
    {
        id: 1,
        pathway: 99,
        pathway_name: 'Test Pathway',
        status_name: 'Completed',
        created: '2025-01-01T00:00:00Z',
        modified: '2025-01-01T00:00:00Z',
        spikes: [],
    },
];

describe('CNSView', () => {
    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve(mockSpikeTrains),
                } as Response)
            )
        );
    });

    it('calls onEditPathway with pathway id when Edit NeuralPathway is clicked', async () => {
        const onViewPathway = vi.fn();
        const onEditPathway = vi.fn();

        render(
            <CNSView onViewPathway={onViewPathway} onEditPathway={onEditPathway} />
        );

        await waitFor(
            () => {
                expect(screen.getByText('Test Pathway')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        const editButton = screen.getByRole('button', {
            name: /edit neuralpathway/i,
        });
        editButton.click();

        expect(onEditPathway).toHaveBeenCalledWith('99');
        expect(onViewPathway).not.toHaveBeenCalled();
    });

    it('calls onViewPathway with pathway id when View Graph is clicked', async () => {
        const onViewPathway = vi.fn();
        const onEditPathway = vi.fn();

        render(
            <CNSView onViewPathway={onViewPathway} onEditPathway={onEditPathway} />
        );

        await waitFor(
            () => {
                expect(screen.getByText('Test Pathway')).toBeInTheDocument();
            },
            { timeout: 3000 }
        );

        const viewButton = screen.getByRole('button', { name: /view graph/i });
        viewButton.click();

        expect(onViewPathway).toHaveBeenCalledWith('99');
        expect(onEditPathway).not.toHaveBeenCalled();
    });
});

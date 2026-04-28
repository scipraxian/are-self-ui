/**
 * Genome bundle constants — mirrored from the Python side.
 *
 * Source of truth: `genetic_immutables.NeuralModifier.CANONICAL` and
 * `.INCUBATOR` (manifest-pinned UUIDs). Same convention as
 * `nodeConstants.ts` for canonical effectors — when the backend hard-codes
 * a stable UUID, the frontend mirrors it instead of round-tripping a
 * lookup. Never change these.
 */

export const GENOME = {
    CANONICAL: '8192d7fd-2d20-4109-9c7c-45121e89f1dd',
    INCUBATOR: '1206f5a1-7ffd-4cb2-8c5a-3a9dfb5e5340',
} as const;

export function isCanonical(genomeId: string | null | undefined): boolean {
    return genomeId === GENOME.CANONICAL;
}

export function isIncubator(genomeId: string | null | undefined): boolean {
    return genomeId === GENOME.INCUBATOR;
}

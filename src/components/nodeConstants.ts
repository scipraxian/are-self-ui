/**
 * Canonical effector PKs — mirrored from central_nervous_system.models.Effector.
 * These are fixture-defined and stable.
 */
export const EFFECTOR = {
    BEGIN_PLAY: 1,
    LOGIC_GATE: 5,
    LOGIC_RETRY: 6,
    LOGIC_DELAY: 7,
    FRONTAL_LOBE: 8,
} as const;

/**
 * Maps effector PK → React Flow node type string.
 * Anything not in this map renders as the generic 'neuron' node.
 */
export const EFFECTOR_NODE_TYPE: Record<number, string> = {
    [EFFECTOR.LOGIC_GATE]: 'gateNode',
    [EFFECTOR.LOGIC_RETRY]: 'retryNode',
    [EFFECTOR.LOGIC_DELAY]: 'delayNode',
    [EFFECTOR.FRONTAL_LOBE]: 'frontalLobeNode',
};

/**
 * Visual identity per effector type — used in both editor and monitor nodes.
 */
export const EFFECTOR_STYLE: Record<number, { color: string; label: string }> = {
    [EFFECTOR.LOGIC_GATE]: { color: '#06b6d4', label: 'GATE' },
    [EFFECTOR.LOGIC_RETRY]: { color: '#f59e0b', label: 'RETRY' },
    [EFFECTOR.LOGIC_DELAY]: { color: '#6366f1', label: 'DELAY' },
    [EFFECTOR.FRONTAL_LOBE]: { color: '#a855f7', label: 'FRONTAL' },
};

/**
 * Default NeuronContext values to apply when dropping a new node of this type.
 */
export const EFFECTOR_DEFAULTS: Record<number, Record<string, string>> = {
    [EFFECTOR.LOGIC_GATE]: { logic_mode: 'gate', gate_operator: 'exists' },
    [EFFECTOR.LOGIC_RETRY]: { logic_mode: 'retry', max_retries: '3' },
    [EFFECTOR.LOGIC_DELAY]: { logic_mode: 'wait', delay: '5' },
};

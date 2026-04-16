/**
 * Canonical effector UUIDs — mirrored from central_nervous_system.models.Effector.
 * These are fixture-defined and stable.
 */
export const EFFECTOR = {
    BEGIN_PLAY: 'a74a9b1a-7326-4dff-9013-d640433b3bf7',
    LOGIC_GATE: '3aa7a066-232a-4710-b387-a9033771e8dd',
    LOGIC_RETRY: '644c234f-c810-494b-8339-7829a143e099',
    LOGIC_DELAY: '0094c230-0784-4522-8e87-9c25dcab5a7f',
    FRONTAL_LOBE: '64c0995a-cbd2-47d3-a452-e36ea4d46154',
    DEBUG: '8eb0d85b-35f5-4095-9b10-37a2e6fefbef',
} as const;

/**
 * Maps effector UUID → React Flow node type string.
 * Anything not in this map renders as the generic 'neuron' node.
 */
export const EFFECTOR_NODE_TYPE: Record<string, string> = {
    [EFFECTOR.BEGIN_PLAY]: 'beginPlayNode',
    [EFFECTOR.LOGIC_GATE]: 'gateNode',
    [EFFECTOR.LOGIC_RETRY]: 'retryNode',
    [EFFECTOR.LOGIC_DELAY]: 'delayNode',
    [EFFECTOR.FRONTAL_LOBE]: 'frontalLobeNode',
    [EFFECTOR.DEBUG]: 'debugNode',
};

/**
 * Visual identity per effector type — used in both editor and monitor nodes.
 */
export const EFFECTOR_STYLE: Record<string, { color: string; label: string }> = {
    [EFFECTOR.BEGIN_PLAY]: { color: '#991b1b', label: 'BEGIN' },
    [EFFECTOR.LOGIC_GATE]: { color: '#06b6d4', label: 'GATE' },
    [EFFECTOR.LOGIC_RETRY]: { color: '#f59e0b', label: 'RETRY' },
    [EFFECTOR.LOGIC_DELAY]: { color: '#6366f1', label: 'DELAY' },
    [EFFECTOR.FRONTAL_LOBE]: { color: '#a855f7', label: 'FRONTAL' },
    [EFFECTOR.DEBUG]: { color: '#ef4444', label: 'DEBUG' },
};

/**
 * NeuronContext key constants — shared with backend pathway_logic_node.py.
 * NEVER hardcode these strings elsewhere; import from here.
 */
export const CTX = {
    LOGIC_MODE: 'logic_mode',
    MAX_RETRIES: 'max_retries',
    DELAY: 'delay',
    GATE_KEY: 'gate_key',
    GATE_OPERATOR: 'gate_operator',
    GATE_VALUE: 'gate_value',
} as const;

/**
 * Default NeuronContext values to apply when dropping a new node of this type.
 */
export const EFFECTOR_DEFAULTS: Record<string, Record<string, string>> = {
    [EFFECTOR.LOGIC_GATE]: { [CTX.LOGIC_MODE]: 'gate', [CTX.GATE_OPERATOR]: 'exists' },
    [EFFECTOR.LOGIC_RETRY]: { [CTX.LOGIC_MODE]: 'retry', [CTX.MAX_RETRIES]: '3' },
    [EFFECTOR.LOGIC_DELAY]: { [CTX.LOGIC_MODE]: 'wait', [CTX.DELAY]: '5' },
};

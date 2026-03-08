export interface SpikeData {
    id: string;
    status_id?: number;
    status?: { id: number; name: string };
    status_name?: string;
    effector_name?: string;
    target_name?: string;
    timestamp_str?: string;
    duration?: string;
    delta?: string;
    average_delta?: string | number;
    blackboard?: Record<string, unknown>;
    result_code?: number | null;
}

export interface SpikeTrainData {
    id: string;
    pathway_name: string;
    pathway: string;
    status?: { id: number; name: string };
    is_alive: boolean;
    ended_successfully: boolean;
    ended_badly: boolean;
    modified: string;
    live_children: SpikeData[];
    history: SpikeData[];
    subgraphs: SpikeTrainData[];
}

export interface DashboardSummary {
    server_time: string;
    recent_missions: SpikeTrainData[];
}

// --- CORTEX & REASONING TYPES ---

export interface ToolCallData {
    id: number;
    tool_name: string;
    arguments: string | Record<string, unknown>;
    result_payload: string;
    traceback: string;
    status_name: string;
    is_async: boolean;
}

export interface ReasoningTurnData {
    id: number;
    turn_number: number;
    status_name: string;
    thought_process: string;
    request_payload: { messages?: { role: string; content: string }[] } | string;
    tokens_input: number;
    tokens_output: number;
    inference_time: string;
    delta: string;
    created: string;
    tool_calls: ToolCallData[];
}

export interface ReasoningGoalData {
    id: number;
    status_name: string;
    rendered_goal: string;
    achieved: boolean;
    created: string;
}

export interface TalosEngramData {
    id: string;
    name: string;
    description: string;
    relevance_score: number;
    source_turns: number[];
}

export interface SessionConclusionData {
    id: number;
    status_name: string;
    summary: string;
    reasoning_trace: string;
    outcome_status: string;
    recommended_action: string;
    next_goal_suggestion: string;
}

export interface ReasoningSessionData {
    id: string;
    status_name: string;
    current_level: number;
    current_focus: number;
    max_focus: number;
    total_xp: number;
    created: string;
    goals: ReasoningGoalData[];
    turns: ReasoningTurnData[];
    engrams: TalosEngramData[];
    conclusion?: SessionConclusionData;
}

// 3D Graph specific node injection
export interface GraphNode {
    id: string;
    type: 'turn' | 'tool' | 'goal' | 'engram' | 'conclusion' | 'session';
    label?: string;
    status_name?: string;
    sizeRatio?: number;
    [key: string]: unknown;
}

export interface GraphLink {
    source: string | GraphNode;
    target: string | GraphNode;
    type: string;
}
// --- CNS GRAPH EDITOR TYPES ---

export interface CNSEffector {
    id: number;
    name: string;
    category: string;
    is_book?: boolean;
}

export interface CNSContextRow {
    key: string;
    source: 'default' | 'override' | 'global';
    value: string;
    display_value: string;
    is_readonly: boolean;
}

export interface CNSNeuron {
    id: number | string; // string for 'temp_' nodes before DB sync
    title: string;
    x: number;
    y: number;
    effector_id: number | null;
    is_root: boolean;
    has_override: boolean;
    invoked_pathway_id?: string | null;
    status_id?: number | string; // Used in monitor mode
}

export interface CNSWire {
    from_node_id: number | string;
    to_node_id: number | string;
    status_id: 'flow' | 'success' | 'fail';
}

export interface Spike {
    id: number;
    status: number;
    status_name: string;
    neuron: number;
    effector: number;
    effector_name: string;
    created: string;
    modified: string;
    target_hostname: string | null;
    result_code: number | null;
}

export interface SpikeTrain {
    id: number;
    status: number;
    status_name: string;
    pathway: number;
    pathway_name: string;
    created: string;
    modified: string;
    spikes: Spike[];
}

export interface CNSTag {
    id: number;
    name: string;
}

export interface Effector {
    id: number;
    name: string;
    description: string;
    distribution_mode: string;
}

export interface NeuralPathway {
    id: number;
    name: string;
    description: string;
    is_favorite: boolean;
    tags: CNSTag[];
    ui_json: any; // We'll type this strictly later if you use React Flow
}

export interface Neuron {
    id: number;
    pathway: number;
    effector: number | null;
    effector_name: string | null;
    invoked_pathway: number | null;
    invoked_pathway_name: string | null;
    ui_json: any;
    is_root: boolean;
}

export interface Axon {
    id: number;
    pathway: number;
    source: number;
    target: number;
    type: number;
    type_name: string;
}

export interface PFCAgileItem {
    id: string;
    item_type: 'EPIC' | 'STORY' | 'TASK';
    name: string;
    description: string;
    status: { id: number; name: string };
    complexity?: number;
    priority?: number;
    tags: { id: number; name: string }[];
    owning_disc: { id: number; name: string } | null;
    parent_name?: string;

    // PFCTicketMixin Deep Fields
    perspective?: string;
    assertions?: string;
    outside?: string;
    dod_exceptions?: string;
    dependencies?: string;
    demo_specifics?: string;
}

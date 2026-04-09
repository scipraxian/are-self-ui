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
    status_name?: string;
    is_async: boolean;
}

export interface ReasoningMessageRole {
    id?: number;
    name: string;
    created?: string;
}

export interface ReasoningMessageData {
    id: string;
    role: string | ReasoningMessageRole;
    content: string;
    created: string;
    is_volatile?: boolean;
    [key: string]: unknown;
}

export interface ModelUsageRecord {
    id: number;
    input_tokens: number;
    output_tokens: number;
    query_time: string;
    estimated_cost: string;
    request_payload: Array<{ role: string; content: string }>;
    response_payload: {
        choices?: Array<{
            message: {
                role: string;
                content: string | null;
                tool_calls?: Array<{
                    id: string;
                    type: string;
                    function: { name: string; arguments: string };
                }>;
            };
        }>;
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    ai_model_provider?: {
        ai_model: { name: string };
        provider: { name: string };
    };
}

export interface ReasoningTurnData {
    id: number;
    turn_number: number;
    status_name: string;
    status?: number;
    delta: string;
    created: string;
    tool_calls: ToolCallData[];
    model_usage_record?: ModelUsageRecord;
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
    goals?: ReasoningGoalData[];
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
    id: number | string;
    title: string;
    x: number;
    y: number;
    effector_id: number | null;
    is_root: boolean;
    has_override: boolean;
    invoked_pathway_id?: string | null;
    status_id?: number | string;
}

export interface CNSWire {
    from_node_id: number | string;
    to_node_id: number | string;
    status_id: 'flow' | 'success' | 'fail';
}

/** Position data stored in neuron.ui_json */
export interface NeuronPosition {
    x: number;
    y: number;
}

export interface Spike {
    id: string;
    status: number;
    status_name: string;
    neuron: number;
    effector: number;
    effector_name: string;
    created: string;
    modified: string;
    target_hostname: string | null;
    result_code: number | null;
    delta?: string;
    average_delta?: string | number;
    spike_train?: string;
    pathway?: string;
    invoked_pathway?: string | null;
    child_trains?: string[];
    provenance?: string | null;
    provenance_train?: string | null;
    application_log?: string;
    execution_log?: string;
    blackboard?: Record<string, unknown>;
}

export interface SpikeTrain {
    id: string;
    status: number;
    status_name: string;
    pathway: string;
    pathway_name: string;
    created: string;
    modified: string;
    spikes: Spike[];
    parent_spike?: string | null;
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
    id: string;
    name: string;
    description: string;
    is_favorite: boolean;
    tags: CNSTag[];
    ui_json: string | NeuronPosition | null;
}

export interface Neuron {
    id: number;
    pathway: number;
    effector: number | null;
    effector_name: string | null;
    invoked_pathway: string | null;
    invoked_pathway_name: string | null;
    ui_json: string | NeuronPosition | null;
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

export interface PFCCommentData {
    id: string;
    text: string;
    created: string;
    user?: { id: number; username: string } | null;
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
    previous_owners?: { id: number; name: string }[];
    parent_name?: string;
    parent_id?: string;
    environment?: { id: string; name: string } | null;
    comments?: PFCCommentData[];
    perspective?: string;
    assertions?: string;
    outside?: string;
    dod_exceptions?: string;
    dependencies?: string;
    demo_specifics?: string;
}

// --- PNS (PERIPHERAL NERVOUS SYSTEM) TYPES ---

export interface CeleryTask {
    id: string;
    name: string;
    args: string;
    kwargs: string;
    time_start: number | null;
    worker_pid?: number;
}

export interface CeleryWorker {
    hostname: string;
    active_tasks: CeleryTask[];
    reserved_tasks: CeleryTask[];
    pid: number | null;
    pool: Record<string, unknown>;
    total: Record<string, number>;
}

export interface NorepinephrineEvent {
    receptor_class: string;
    dendrite_id: string;
    molecule: 'Norepinephrine';
    activity: string;
    vesicle: Record<string, unknown>;
    timestamp: string;
}

export interface WorkerLogEntry {
    logger: string;
    level: string;
    message: string;
    funcName: string;
    lineno: number;
    timestamp: string;
}

// --- SPIKE MERGE (Correlated Timeline) TYPES ---

export interface MergeRow {
    timestamp: string;
    full_ts: string;
    columns: Record<string, string>;
}

export interface MergeResponse {
    labels: string[];
    rows: MergeRow[];
    cursors: Record<string, number>;
    any_active: boolean;
}

// --- INFRASTRUCTURE TYPES ---

export interface VitalsData {
    cpu_percent: number;
    cpu_per_core: number[];
    cpu_count: number;
    ram_used_gb: number;
    ram_total_gb: number;
    ram_percent: number;
    disk_used_gb: number;
    disk_total_gb: number;
    disk_percent: number;
    gpu_name: string | null;
    gpu_utilization: number | null;
    gpu_memory_used_mb: number | null;
    gpu_memory_total_mb: number | null;
    gpu_temperature: number | null;
}

export interface InfraServiceStatus {
    connected: boolean;
    version: string | null;
    [key: string]: unknown;
}

export interface InfraStatus {
    postgres: InfraServiceStatus & {
        db_size: string | null;
        active_connections: number | null;
        latency_ms: number | null;
    };
    redis: InfraServiceStatus & {
        uptime_seconds: number | null;
        memory_used: string | null;
        connected_clients: number | null;
    };
}

export interface NerveTerminal {
    id: string;
    hostname: string;
    ip_address: string | null;
    port: number;
    status: { id: number; name: string };
    version: string | null;
    last_seen: string | null;
}

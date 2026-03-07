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

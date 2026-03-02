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
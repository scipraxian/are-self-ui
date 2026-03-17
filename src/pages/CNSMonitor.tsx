import "./CNSMonitor.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api";
import type { SpikeTrain, SpikeTrainData } from "../types";
import { SpikeTrainTrack } from "../components/SpikeTrainTrack";
import { SpikeView } from "./SpikeView";

type MonitorMode = "HUD" | "BIO";

interface CNSMonitorProps {
    pathwayId: string;
    environmentName?: string;
}

export const CNSMonitor = ({
    pathwayId,
    environmentName = "Default Environment",
}: CNSMonitorProps) => {
    const navigate = useNavigate();
    const [mode, setMode] = useState<MonitorMode>("HUD");
    const [recentMissions, setRecentMissions] = useState<SpikeTrainData[]>([]);
    const [spikeTrains, setSpikeTrains] = useState<SpikeTrain[]>([]);
    const [selectedSpikeId, setSelectedSpikeId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const signatureMissions = (missions: SpikeTrainData[]) =>
            (missions || [])
                .map((m) => `${m.id}:${m.is_alive ? 1 : 0}:${m.ended_successfully ? 1 : 0}:${m.ended_badly ? 1 : 0}:${m.status?.id ?? ""}:${m.status?.name ?? ""}`)
                .join("|");

        const signatureSpikeTrains = (trains: SpikeTrain[]) =>
            (trains || [])
                .map((st) => {
                    const spikesSig = (st.spikes || [])
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        .map((s: any) => `${s.id}:${s.status_name ?? ""}:${s.delta ?? ""}:${s.average_delta ?? ""}`)
                        .join(",");
                    return `${st.id}:${st.status_name}:${spikesSig}`;
                })
                .join("|");

        const poll = async () => {
            try {
                // 2D HUD feed (legacy-style summary payload). If unavailable, HUD will gracefully show empty.
                const dashRes = await fetch("/api/v2/dashboard/summary/", { signal: controller.signal });
                if (dashRes.ok) {
                    const dash = (await dashRes.json()) as { recent_missions?: SpikeTrainData[] };
                    if (mounted) {
                        const next = dash.recent_missions || [];
                        setRecentMissions((prev) => (signatureMissions(prev) === signatureMissions(next) ? prev : next));
                    }
                }
            } catch {
                // ignore
            }

            try {
                // 3D feed (and fallback data): last 6 runs for the active NeuralPathway.
                const stRes = await apiFetch("/api/v2/spiketrains/");
                if (!stRes.ok) return;
                const all = (await stRes.json()) as SpikeTrain[];
                const filtered = all
                    .filter((st) => String(st.pathway) === String(pathwayId))
                    .sort((a, b) => (a.created < b.created ? 1 : -1))
                    .slice(0, 6);
                if (mounted) {
                    setSpikeTrains((prev) => (signatureSpikeTrains(prev) === signatureSpikeTrains(filtered) ? prev : filtered));
                }
            } catch {
                // ignore
            }
        };

        poll();
        const id = window.setInterval(poll, 2500);

        return () => {
            mounted = false;
            controller.abort();
            window.clearInterval(id);
        };
    }, [pathwayId]);

    const activeMission = useMemo(() => {
        const matches = (recentMissions || []).filter((m) => String(m.pathway) === String(pathwayId));
        // Prefer alive mission; otherwise newest by id string (backend typically orders newest first).
        const alive = matches.find((m) => m.is_alive);
        return alive || matches[0] || null;
    }, [recentMissions, pathwayId]);

    const headerSubtitle = useMemo(() => {
        const runCount = spikeTrains.length;
        return `${environmentName} • NeuralPathway ${pathwayId} • Last ${Math.min(6, runCount)} SpikeTrain runs`;
    }, [environmentName, pathwayId, spikeTrains.length]);

    const toggleTo = (next: MonitorMode) => setMode(next);

    const handleRerun = async () => {
        try {
            await apiFetch(`/api/v2/neuralpathways/${encodeURIComponent(pathwayId)}/launch/`, { method: "POST" });
        } catch {
            // ignore
        }
    };

    return (
        <div className="cnsmonitor-root">
            <header className="cnsmonitor-header glass-panel">
                <div className="cnsmonitor-header-left">
                    <div className="cnsmonitor-title">CNS EXECUTION MONITOR</div>
                    <div className="cnsmonitor-subtitle">{headerSubtitle}</div>
                </div>

                <div className="cnsmonitor-header-right">
                    <button className="cns-btn" onClick={() => navigate("/cns")}>
                        ← CNS Index
                    </button>
                    <button className="cns-btn" onClick={handleRerun}>
                        Rerun NeuralPathway
                    </button>

                    <div className="cnsmonitor-toggle" role="tablist" aria-label="Monitor mode">
                        <button
                            className={`cnsmonitor-toggle-btn ${mode === "HUD" ? "active" : ""}`}
                            onClick={() => toggleTo("HUD")}
                            role="tab"
                            aria-selected={mode === "HUD"}
                        >
                            HUD
                        </button>
                        <button
                            className={`cnsmonitor-toggle-btn ${mode === "BIO" ? "active" : ""}`}
                            onClick={() => toggleTo("BIO")}
                            role="tab"
                            aria-selected={mode === "BIO"}
                        >
                            BIO
                        </button>
                        <span className={`cnsmonitor-toggle-thumb ${mode === "BIO" ? "bio" : "hud"}`} />
                    </div>
                </div>
            </header>

            <div className="cnsmonitor-body">
                <div className={`cnsmonitor-hud ${mode === "BIO" ? "hidden" : ""}`}>
                    {activeMission ? (
                        <SpikeTrainTrack
                            spikeTrain={activeMission}
                            onViewGraph={(pid) => navigate(`/cns/monitor/${pid}`)}
                            onEditGraph={(pid) => navigate(`/cns/edit/${pid}`)}
                            onRerunTrain={() => handleRerun()}
                            onSpikeClick={(spikeId) => setSelectedSpikeId(spikeId)}
                        />
                    ) : (
                        <div className="glass-panel cnsmonitor-empty">
                            No SpikeTrain telemetry found for this NeuralPathway yet.
                        </div>
                    )}
                </div>

                {selectedSpikeId && (
                    <div className="cnsmonitor-terminal glass-panel">
                        <SpikeView initialSpikeId={selectedSpikeId} />
                    </div>
                )}
            </div>
        </div>
    );
};


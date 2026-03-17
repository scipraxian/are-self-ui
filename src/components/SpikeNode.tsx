import "./SpikeNode.css";
import type { SpikeData } from "../types";

interface SpikeNodeProps {
    spike: SpikeData;
    onClick?: (spikeId: string) => void;
}

const parseSeconds = (value: unknown): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value !== "string") return 0;
    const clean = value.trim().replace(/s$/i, "");
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
};

const getSpikeStatusClass = (spike: SpikeData) => {
    const statusId = spike.status_id || spike.status?.id;
    const statusName = (spike.status_name || spike.status?.name || "").toLowerCase();

    // Legacy ID mapping carried forward from the prior SpikeCard implementation.
    const isQueued = statusId === 1 || statusId === 2 || statusName.includes("pending") || statusName.includes("queued");
    const isActive = statusId === 3 || statusId === 8 || statusName.includes("running") || statusName.includes("active");
    const isSuccess = statusId === 4 || statusName.includes("success") || statusName.includes("completed");
    const isFailed = statusId === 5 || statusId === 6 || statusName.includes("fail") || statusName.includes("error");

    if (isSuccess) return "success";
    if (isFailed) return "failed";
    if (isActive) return "running";
    if (isQueued) return "pending";
    return "unknown";
};

export const SpikeNode = ({ spike, onClick }: SpikeNodeProps) => {
    const statusClass = getSpikeStatusClass(spike);

    const effectorName =
        (spike as unknown as { effector?: { name?: string } }).effector?.name ||
        spike.effector_name ||
        "SPIKE";

    const statusName = spike.status_name || spike.status?.name || "PENDING";

    const currentSec = parseSeconds(spike.delta);
    const avgSec = parseSeconds(spike.average_delta);

    let trendClass = "flat";
    if (avgSec > 0) {
        if (currentSec > avgSec * 1.2) trendClass = "slower";
        else if (currentSec < avgSec * 0.8) trendClass = "faster";
    }

    return (
        <div
            className={`cns-spike_node cns-spike_node--${statusClass}`}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={
                onClick
                    ? () => {
                          onClick(String(spike.id));
                      }
                    : undefined
            }
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onClick(String(spike.id));
                          }
                      }
                    : undefined
            }
        >
            <div className="cns-spike_node-header">
                <div className="cns-spike_node-effector" title={effectorName}>
                    {effectorName}
                </div>
                <div className="cns-spike_node-status">{statusName}</div>
            </div>

            <div className="cns-spike_node-telemetry">
                <div className={`cns-spike_node-delta cns-spike_node-delta--${trendClass}`}>
                    {currentSec.toFixed(1)}s
                </div>
                <div className="cns-spike_node-avg">AVG {avgSec.toFixed(1)}s</div>
            </div>
        </div>
    );
};


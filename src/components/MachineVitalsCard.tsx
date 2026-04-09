import './MachineVitalsCard.css';
import { Activity } from 'lucide-react';
import type { VitalsData } from '../types';

interface Props {
    vitals: VitalsData | null;
    cpuHistory: number[];
    gpuHistory: number[];
}

function formatBytes(gb: number): string {
    if (gb < 1) return `${(gb * 1024).toFixed(0)}MB`;
    return `${gb.toFixed(1)}GB`;
}

function renderMiniChart(values: number[], height: number = 24): React.ReactNode {
    if (values.length === 0) return null;
    const max = 100;
    const width = values.length > 0 ? 4 : 2;
    const barWidth = width - 1;
    const gaps = Math.max(1, values.length - 1);
    const spacing = gaps > 0 ? (100 / gaps) : 0;

    return (
        <svg
            width="100%"
            height={height}
            viewBox={`0 0 100 ${height}`}
            className="pns-vitals-chart"
            preserveAspectRatio="none"
        >
            {values.map((v, i) => (
                <rect
                    key={i}
                    x={i * spacing}
                    y={height - (v / max) * height}
                    width={barWidth}
                    height={(v / max) * height}
                    fill="rgba(56, 189, 248, 0.5)"
                />
            ))}
        </svg>
    );
}

export function MachineVitalsCard({ vitals, cpuHistory, gpuHistory }: Props) {
    if (!vitals) {
        return (
            <div className="pns-vitals-card pns-vitals-card--loading">
                <div className="pns-vitals-header">
                    <Activity size={16} />
                    <span>Homeostasis</span>
                </div>
                <div className="pns-vitals-content">Loading...</div>
            </div>
        );
    }

    const ramPercent = (vitals.ram_used_gb / vitals.ram_total_gb) * 100;
    const diskPercent = (vitals.disk_used_gb / vitals.disk_total_gb) * 100;

    return (
        <div className="pns-vitals-card">
            <div className="pns-vitals-header">
                <Activity size={16} />
                <span>Homeostasis</span>
            </div>

            <div className="pns-vitals-content">
                {/* CPU */}
                <div className="pns-vitals-section">
                    <div className="pns-vitals-label">CPU</div>
                    <div className="pns-vitals-stat">
                        <span className="pns-vitals-value">{vitals.cpu_percent.toFixed(1)}%</span>
                    </div>
                    {renderMiniChart(cpuHistory, 28)}
                </div>

                {/* RAM */}
                <div className="pns-vitals-section">
                    <div className="pns-vitals-label">RAM</div>
                    <div className="pns-vitals-stat">
                        <span className="pns-vitals-value">{ramPercent.toFixed(0)}%</span>
                    </div>
                    <div className="pns-vitals-subtext">
                        {formatBytes(vitals.ram_used_gb)} / {formatBytes(vitals.ram_total_gb)}
                    </div>
                    {renderMiniChart([ramPercent], 8)}
                </div>

                {/* Disk */}
                <div className="pns-vitals-section">
                    <div className="pns-vitals-label">Disk</div>
                    <div className="pns-vitals-stat">
                        <span className="pns-vitals-value">{diskPercent.toFixed(0)}%</span>
                    </div>
                    <div className="pns-vitals-subtext">
                        {formatBytes(vitals.disk_used_gb)} / {formatBytes(vitals.disk_total_gb)}
                    </div>
                    {renderMiniChart([diskPercent], 8)}
                </div>

                {/* GPU */}
                {vitals.gpu_name && vitals.gpu_utilization != null && (
                    <div className="pns-vitals-section">
                        <div className="pns-vitals-label">GPU</div>
                        <div className="pns-vitals-subtext">{vitals.gpu_name}</div>
                        <div className="pns-vitals-stat">
                            <span className="pns-vitals-value">{vitals.gpu_utilization.toFixed(1)}%</span>
                        </div>
                        {vitals.gpu_memory_used_mb != null && vitals.gpu_memory_total_mb != null && (
                            <div className="pns-vitals-subtext">
                                {(vitals.gpu_memory_used_mb / 1024).toFixed(1)}GB / {(vitals.gpu_memory_total_mb / 1024).toFixed(1)}GB
                            </div>
                        )}
                        {vitals.gpu_temperature != null && (
                            <div className="pns-vitals-subtext">{vitals.gpu_temperature.toFixed(0)}°C</div>
                        )}
                        {renderMiniChart(gpuHistory, 28)}
                    </div>
                )}
            </div>
        </div>
    );
}

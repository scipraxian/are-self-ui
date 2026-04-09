import './CeleryBeatCard.css';
import { Heart } from 'lucide-react';

interface ScheduledTask {
    name: string;
    task: string;
    schedule: string;
    total_run_count: number;
    last_run_at: string | null;
}

interface BeatCardProps {
    running: boolean;
    pid: number | null;
    scheduledTasks: ScheduledTask[];
    loading: boolean;
    onToggle: () => void;
}

function shortTask(task: string): string {
    const parts = task.split('.');
    return parts[parts.length - 1];
}

function timeAgo(iso: string | null): string {
    if (!iso) return 'never';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export function CeleryBeatCard({ running, pid, scheduledTasks, loading, onToggle }: BeatCardProps) {
    return (
        <div className={`beat-card ${running ? 'beat-card--active' : 'beat-card--stopped'}`}>
            <div className="beat-card-header">
                <Heart
                    size={16}
                    className={`beat-card-icon ${running ? 'beat-card-icon--pulse' : ''}`}
                />
                <span className="beat-card-title">Heartbeat</span>
                {pid != null && (
                    <span className="beat-card-pid">PID {pid}</span>
                )}
                <button
                    className={`beat-card-toggle ${running ? 'beat-card-toggle--stop' : 'beat-card-toggle--start'}`}
                    onClick={onToggle}
                    disabled={loading}
                >
                    {loading ? '...' : running ? 'Stop' : 'Start'}
                </button>
            </div>

            <div className="beat-card-status">
                <span className={`beat-card-dot ${running ? 'beat-card-dot--on' : ''}`} />
                <span className="beat-card-status-text">
                    {running ? 'Scheduler Active' : 'Scheduler Stopped'}
                </span>
            </div>

            {scheduledTasks.length > 0 && (
                <div className="beat-card-tasks">
                    {scheduledTasks.map(t => (
                        <div key={t.name} className="beat-card-task-row">
                            <div className="beat-card-task-top">
                                <span className="beat-card-task-name">{shortTask(t.task)}</span>
                                <span className="beat-card-task-schedule">{t.schedule}</span>
                            </div>
                            <div className="beat-card-task-bottom">
                                <span className="beat-card-task-runs">{t.total_run_count.toLocaleString()} runs</span>
                                <span className="beat-card-task-last">{timeAgo(t.last_run_at)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useWorkerSet } from '../context/WorkerSetProvider';
import './WorkerSetBar.css';

export const WorkerSetBar = () => {
    const { selectedWorkers, removeWorker, clearWorkers } = useWorkerSet();
    const navigate = useNavigate();

    if (selectedWorkers.length === 0) return null;

    const handleMonitor = () => {
        const params = new URLSearchParams();
        selectedWorkers.forEach((hostname, i) => {
            params.set(`w${i + 1}`, hostname);
        });
        navigate(`/pns/monitor?${params.toString()}`);
    };

    return (
        <div className="workerset-bar">
            <span className="workerset-bar-label">Worker Set:</span>
            {selectedWorkers.map(hostname => (
                <span key={hostname} className="workerset-chip">
                    {hostname}
                    <button
                        className="workerset-chip-remove"
                        onClick={() => removeWorker(hostname)}
                        aria-label={`Remove ${hostname}`}
                    >
                        &times;
                    </button>
                </span>
            ))}
            <button className="workerset-clear-btn" onClick={clearWorkers}>
                Clear
            </button>
            <button
                className="workerset-monitor-btn"
                onClick={handleMonitor}
            >
                MONITOR <Play size={12} />
            </button>
        </div>
    );
};

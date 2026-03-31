import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useSpikeSet } from '../context/SpikeSetProvider';
import './SpikeSetBar.css';

export const SpikeSetBar = () => {
    const { selectedSpikes, removeSpike, clearSpikes } = useSpikeSet();
    const navigate = useNavigate();

    if (selectedSpikes.length === 0) return null;

    const handleCompare = () => {
        const params = new URLSearchParams();
        selectedSpikes.forEach((spike, i) => {
            params.set(`s${i + 1}`, spike.spikeId);
        });
        navigate(`/cns/spikeset?${params.toString()}`);
    };

    return (
        <div className="spikeset-bar">
            <span className="spikeset-bar-label">Spike Set:</span>
            {selectedSpikes.map(spike => (
                <span key={spike.spikeId} className="spikeset-chip">
                    {spike.label}
                    <span className="spikeset-chip-hash">#{spike.trainHash}</span>
                    <button
                        className="spikeset-chip-remove"
                        onClick={() => removeSpike(spike.spikeId)}
                        aria-label={`Remove ${spike.label}`}
                    >
                        &times;
                    </button>
                </span>
            ))}
            <button className="spikeset-clear-btn" onClick={clearSpikes}>
                Clear
            </button>
            <button
                className="spikeset-compare-btn"
                onClick={handleCompare}
                disabled={selectedSpikes.length < 2}
            >
                COMPARE <Play size={12} />
            </button>
        </div>
    );
};

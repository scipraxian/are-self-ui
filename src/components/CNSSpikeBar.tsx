import './CNSSpikeBar.css';
import type { Spike } from '../types';

interface CNSSpikeBarProps {
    spikes: Spike[];
    onSpikeClick: (spikeId: string) => void;
    selectedSpikeId?: string | null;
}

const getSpikeStatus = (spike: Spike): string => {
    const name = (spike.status_name || '').toLowerCase();
    if (name.includes('success') || name.includes('completed')) return 'success';
    if (name.includes('fail') || name.includes('error')) return 'failed';
    if (name.includes('running') || name.includes('active')) return 'running';
    if (name.includes('pending') || name.includes('queued')) return 'pending';
    return 'unknown';
};

const getDuration = (spike: Spike): number => {
    try {
        const ms = new Date(spike.modified).getTime() - new Date(spike.created).getTime();
        if (!Number.isFinite(ms) || ms < 0) return 0;
        return ms / 1000;
    } catch {
        return 0;
    }
};

const abbreviate = (name: string, maxLen: number): string => {
    if (!name) return '';
    if (name.length <= maxLen) return name;
    return name.slice(0, maxLen - 1) + '\u2026';
};

export const CNSSpikeBar = ({ spikes, onSpikeClick }: CNSSpikeBarProps) => {
    const totalDuration = spikes.reduce((sum, s) => sum + getDuration(s), 0) || 1;

    return (
        <div className="cns-spike-bar">
            {spikes.map(spike => {
                const duration = getDuration(spike);
                const proportion = duration / totalDuration;
                const status = getSpikeStatus(spike);
                return (
                    <div
                        key={spike.id}
                        className={`cns-spike-segment cns-spike-segment--${status}`}
                        style={{ flexGrow: proportion, flexBasis: 0 }}
                        onClick={(e) => { e.stopPropagation(); onSpikeClick(String(spike.id)); }}
                        title={`${spike.effector_name} \u00b7 ${status.toUpperCase()} \u00b7 ${duration.toFixed(1)}s${spike.target_hostname ? ` \u00b7 ${spike.target_hostname}` : ''}`}
                    >
                        {proportion > 0.12 ? abbreviate(spike.effector_name || '', 12) : ''}
                    </div>
                );
            })}
        </div>
    );
};

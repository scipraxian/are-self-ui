import './CNSSpikeBar.css';
import { useSpikeSet } from '../context/SpikeSetProvider';
import type { Spike } from '../types';

interface CNSSpikeBarProps {
    spikes: Spike[];
    onSpikeClick: (spikeId: string) => void;
    selectedSpikeId?: string | null;
    trainId?: string;
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

const shortHash = (id: string): string => String(id).slice(0, 6).toUpperCase();

export const CNSSpikeBar = ({ spikes, onSpikeClick, trainId }: CNSSpikeBarProps) => {
    const { addSpike } = useSpikeSet();

    const visibleSpikes = spikes.filter(s =>
        !s.effector_name || s.effector_name.toLowerCase() !== 'begin play'
    );
    const totalDuration = visibleSpikes.reduce((sum, s) => sum + getDuration(s), 0) || 1;

    return (
        <div className="cns-spike-bar">
            {visibleSpikes.map(spike => {
                const duration = getDuration(spike);
                const proportion = duration / totalDuration;
                const status = getSpikeStatus(spike);
                return (
                    <div
                        key={spike.id}
                        className={`cns-spike-segment cns-spike-segment--${status}`}
                        style={{ flexGrow: proportion, flexBasis: 0 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (e.shiftKey) {
                                addSpike({
                                    spikeId: String(spike.id),
                                    label: spike.effector_name || 'Unknown',
                                    trainHash: shortHash(trainId || String(spike.id)),
                                });
                            } else {
                                onSpikeClick(String(spike.id));
                            }
                        }}
                        title={`${spike.effector_name} \u00b7 ${status.toUpperCase()} \u00b7 ${duration.toFixed(1)}s${spike.target_hostname ? ` \u00b7 ${spike.target_hostname}` : ''}\nShift+click to add to Spike Set`}
                    >
                        {proportion > 0.12 ? abbreviate(spike.effector_name || '', 12) : ''}
                    </div>
                );
            })}
        </div>
    );
};

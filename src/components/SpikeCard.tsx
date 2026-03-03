import type { ReactElement } from 'react';
import type { SpikeData } from '../types';

interface SpikeCardProps {
  spike: SpikeData;
}

export function SpikeCard({ spike }: SpikeCardProps): ReactElement {
    const statusId = spike.status_id || spike.status?.id;
    const isQueued = statusId === 1 || statusId === 2;
    const isActive = statusId === 3 || statusId === 8;
    const isSuccess = statusId === 4;
    const isFailed = statusId === 5 || statusId === 6;

    let borderColor = '#333';
    let leftColor = 'transparent';
    let bgColor = '#111';
    let statusTextColor = '#888';

    if (isSuccess) {
        borderColor = 'rgba(74, 222, 128, 0.3)';
        leftColor = '#4ade80';
        bgColor = 'rgba(74, 222, 128, 0.05)';
        statusTextColor = '#4ade80';
    } else if (isFailed) {
        borderColor = 'rgba(239, 68, 68, 0.3)';
        leftColor = '#ef4444';
        bgColor = 'rgba(239, 68, 68, 0.05)';
        statusTextColor = '#ef4444';
    } else if (isActive) {
        borderColor = '#f99f1b';
        leftColor = '#f99f1b';
        bgColor = 'rgba(249, 159, 27, 0.05)';
        statusTextColor = '#f99f1b';
    } else if (isQueued) {
        borderColor = '#444';
        leftColor = '#666';
    }

    const currentSec = spike.delta ? parseFloat(spike.delta) : 0;
    const avgSec = spike.average_delta ? parseFloat(String(spike.average_delta)) : 0;

    let trendColor = '#38bdf8';
    let trendSymbol = '■';
    if (avgSec > 0) {
        if (currentSec > avgSec * 1.2) { trendColor = '#ef4444'; trendSymbol = '▲'; }
        else if (currentSec < avgSec * 0.8) { trendColor = '#4ade80'; trendSymbol = '▼'; }
    }

    const hasBlackboard = spike.blackboard && Object.keys(spike.blackboard).length > 0;

    return (
        <div style={{
            background: bgColor, border: `1px solid ${borderColor}`, borderLeft: `6px solid ${leftColor}`,
            borderRadius: '6px', padding: '8px 10px', width: '170px', height: '80px', flexShrink: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.2s'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: isQueued ? '#888' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {spike.effector_name?.toUpperCase() || 'NODE'}
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: statusTextColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {spike.status_name || spike.status?.name || 'PENDING'}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.65rem' }}>
                <span style={{ color: '#666' }}>{spike.timestamp_str || '--:--'}</span>
                <span style={{ color: isActive ? '#f99f1b' : '#666' }}>{spike.target_name || 'LOCAL'}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.6rem', fontFamily: 'JetBrains Mono, monospace' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ color: trendColor }}>{trendSymbol} {currentSec.toFixed(1)}s</span>
                    <span style={{ color: '#666' }}>AVG: {avgSec.toFixed(1)}s</span>
                </div>
                {hasBlackboard && (
                    <span style={{ color: '#38bdf8', fontWeight: 900 }}>[BB]</span>
                )}
            </div>
        </div>
  );
}
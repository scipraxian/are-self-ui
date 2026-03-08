import "./Swimlane.css";
import {useNavigate} from 'react-router-dom';
import {SpikeCard} from './SpikeCard';
import {Eye, Edit, RotateCw} from 'lucide-react';
import type {SpikeTrainData} from "../types";


interface SwimlaneProps {
    mission: SpikeTrainData;
}

export const Swimlane = ({mission}: SwimlaneProps) => {
    const navigate = useNavigate();

    // Safely fallback to empty arrays if undefined
    const history = mission.history || [];
    const liveChildren = mission.live_children || [];
    const allSpikes = [...history, ...liveChildren];

    let laneBg = 'rgba(255, 255, 255, 0.02)';
    let borderColor = '#333';
    let statusColor = '#64748b';

    if (mission.is_alive) {
        laneBg = 'rgba(249, 159, 27, 0.05)';
        borderColor = '#f99f1b';
        statusColor = '#f99f1b';
    } else if (mission.ended_successfully) {
        statusColor = '#4ade80';
    } else if (mission.ended_badly) {
        laneBg = 'rgba(239, 68, 68, 0.1)';
        borderColor = '#ef4444';
        statusColor = '#ef4444';
    }

    return (
        <div style={{
            display: 'flex',
            background: laneBg,
            border: `1px solid ${borderColor}`,
            borderRadius: '6px',
            minHeight: '90px',
            padding: '8px',
            gap: '12px',
            marginBottom: '8px'
        }}>

            <div className="swimlane-ui-206">
                <div className="swimlane-ui-205">
                    {mission.pathway_name}
                </div>
                <div style={{
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    color: statusColor,
                    textTransform: 'uppercase',
                    marginTop: '4px'
                }}>
                    <span className="swimlane-ui-204">#{mission.id.substring(0, 8)}</span>
                    {mission.status?.name || 'UNKNOWN'}
                </div>
            </div>

            <div style={{
                flex: '0 0 120px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: `1px solid ${mission.is_alive ? 'rgba(139, 92, 246, 0.5)' : 'rgba(56, 189, 248, 0.3)'}`,
                borderLeft: `3px solid ${mission.is_alive ? 'rgba(139, 92, 246, 0.9)' : 'rgba(56, 189, 248, 0.8)'}`,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
            }}>
                <button className="swimlane-ui-203" onClick={() => navigate(`/monitor/${mission.id}`)}>
                    <Eye size={16}/>
                </button>
                <button className="swimlane-ui-202">
                    <Edit size={16}/>
                </button>
                {!mission.is_alive && (
                    <button className="swimlane-ui-201">
                        <RotateCw size={16}/>
                    </button>
                )}
            </div>

            <div className="swimlane-ui-200">
                {allSpikes.map((spike) => (
                    <SpikeCard key={spike.id} spike={spike}/>
                ))}
            </div>

        </div>
    );
};
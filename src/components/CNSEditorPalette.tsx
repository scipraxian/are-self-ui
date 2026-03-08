import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

interface CNSEditorPaletteProps {
    pathwayId: string;
    onBack?: () => void;
}

interface LibraryItem {
    id: number | string;
    name: string;
    category: string;
    is_book?: boolean;
}

export const CNSEditorPalette = ({ pathwayId, onBack }: CNSEditorPaletteProps) => {
    const [items, setItems] = useState<LibraryItem[]>([]);

    useEffect(() => {
        if (!pathwayId) return;
        apiFetch(`/central_nervous_system/graph/${pathwayId}/library`)
            .then(res => res.json())
            .then(data => setItems(data.library || []))
            .catch(console.error);
    }, [pathwayId]);

    const spells = items.filter(i => i.category === 'Spells');
    const subGraphs = items.filter(i => i.category === 'Sub-Graphs');

    const renderItem = (item: LibraryItem) => (
        <div key={`${item.category}-${item.id}`}
            draggable
            onDragStart={(e) => {
                const isSubGraph = item.category === 'Sub-Graphs';
                e.dataTransfer.setData('application/reactflow', item.id.toString());
                e.dataTransfer.setData('application/reactflow-type', isSubGraph ? 'subgraph' : 'effector');
                e.dataTransfer.effectAllowed = 'move';
            }}
            className="cns-effector-drag-item" style={{
                padding: '10px', backgroundColor: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(71, 85, 105, 0.5)', borderRadius: '6px', cursor: 'grab', color: '#cbd5e1', fontSize: '0.8rem', transition: 'background-color 0.2s'
            }}>
            {item.name}
        </div>
    );

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="glass-panel-title" style={{ margin: 0 }}>ACTION PALETTE</h2>
                {onBack && (
                    <button onClick={onBack} className="bbb-close-btn" style={{ position: 'relative', top: 0, right: 0 }}>
                        ✕
                    </button>
                )}
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px' }}>
                <div>
                    <h3 className="glass-panel-title" style={{ letterSpacing: '1px', color: '#a855f7', fontSize: '0.8rem', marginBottom: '8px' }}>SPELLS</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {spells.map(renderItem)}
                    </div>
                </div>

                <div>
                    <h3 className="glass-panel-title" style={{ letterSpacing: '1px', color: '#3b82f6', fontSize: '0.8rem', marginBottom: '8px' }}>SUB-GRAPHS</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subGraphs.map(renderItem)}
                    </div>
                </div>
            </div>
        </div>
    );
};

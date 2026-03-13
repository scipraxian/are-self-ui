import "./CNSEditorPalette.css";
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
            className="cns-effector-drag-item cnseditorpalette-ui-18">
            {item.name}
        </div>
    );

    return (
        <div className="cnseditorpalette-ui-17">
            <div className="common-layout-3">
                <h2 className="glass-panel-title common-layout-4">ACTION PALETTE</h2>
                {onBack && (
                    <button onClick={onBack} className="bbb-close-btn common-layout-5">
                        ✕
                    </button>
                )}
            </div>
            <div className="cnseditorpalette-ui-16">
                <div>
                    <h3 className="glass-panel-title cnseditorpalette-ui-15">SPELLS</h3>
                    <div className="common-layout-6">
                        {spells.map(renderItem)}
                    </div>
                </div>

                <div>
                    <h3 className="glass-panel-title cnseditorpalette-ui-14">SUB-GRAPHS</h3>
                    <div className="common-layout-6">
                        {subGraphs.map(renderItem)}
                    </div>
                </div>
            </div>
        </div>
    );
};

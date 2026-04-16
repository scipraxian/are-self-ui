import "./CNSEditorPalette.css";
import { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import { EFFECTOR, EFFECTOR_STYLE } from './nodeConstants';

interface CNSEditorPaletteProps {
    pathwayId: string;
    onBack?: () => void;
}

interface LibraryItem {
    id: string;
    name: string;
    category: string;
    is_book?: boolean;
}

/** Effector UUIDs that belong to the Logic group. */
const LOGIC_EFFECTOR_IDS: ReadonlySet<string> = new Set([
    EFFECTOR.LOGIC_GATE,
    EFFECTOR.LOGIC_RETRY,
    EFFECTOR.LOGIC_DELAY,
]);

/** Effector UUIDs that belong to the Reasoning group. */
const REASONING_EFFECTOR_IDS: ReadonlySet<string> = new Set([
    EFFECTOR.FRONTAL_LOBE,
]);

/** System effectors that should be hidden from the palette (users don't drag Begin Play). */
const HIDDEN_EFFECTOR_IDS: ReadonlySet<string> = new Set([
    EFFECTOR.BEGIN_PLAY,
]);

export const CNSEditorPalette = ({ pathwayId, onBack }: CNSEditorPaletteProps) => {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!pathwayId) return;
        apiFetch(`/central_nervous_system/graph/${pathwayId}/library`)
            .then(res => res.json())
            .then(data => setItems(data.library || []))
            .catch(console.error);
    }, [pathwayId]);

    const query = search.toLowerCase();
    const matchesSearch = (item: LibraryItem) => !query || item.name.toLowerCase().includes(query);

    const effectors = items.filter(i => i.category === 'Spells' && !HIDDEN_EFFECTOR_IDS.has(i.id) && matchesSearch(i));
    const subGraphs = items.filter(i => i.category === 'Sub-Graphs' && matchesSearch(i));

    const logicNodes = effectors.filter(i => LOGIC_EFFECTOR_IDS.has(i.id));
    const reasoningNodes = effectors.filter(i => REASONING_EFFECTOR_IDS.has(i.id));
    const otherNodes = effectors.filter(i =>
        !LOGIC_EFFECTOR_IDS.has(i.id) && !REASONING_EFFECTOR_IDS.has(i.id)
    );

    const renderItem = (item: LibraryItem) => {
        const style = EFFECTOR_STYLE[item.id];
        const accentColor = style?.color;

        return (
            <div key={`${item.category}-${item.id}`}
                draggable
                onDragStart={(e) => {
                    const isSubGraph = item.category === 'Sub-Graphs';
                    e.dataTransfer.setData('application/reactflow', item.id);
                    e.dataTransfer.setData('application/reactflow-type', isSubGraph ? 'subgraph' : 'effector');
                    e.dataTransfer.effectAllowed = 'move';
                }}
                className="cns-palette-drag-item"
                style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 3 } : undefined}
            >
                {accentColor && <span className="cns-palette-drag-dot" style={{ background: accentColor }} />}
                {item.name}
            </div>
        );
    };

    return (
        <div className="cns-palette-root">
            <div className="common-layout-3">
                <h2 className="glass-panel-title common-layout-4">EFFECTORS</h2>
                {onBack && (
                    <button onClick={onBack} className="bbb-close-btn common-layout-5">
                        ✕
                    </button>
                )}
            </div>
            <input
                className="cns-palette-search"
                type="text"
                placeholder="Search effectors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            <div className="cns-palette-scroll">
                {logicNodes.length > 0 && (
                    <div>
                        <h3 className="glass-panel-title cns-palette-section-title--teal">Logic</h3>
                        <div className="common-layout-6">
                            {logicNodes.map(renderItem)}
                        </div>
                    </div>
                )}

                {reasoningNodes.length > 0 && (
                    <div>
                        <h3 className="glass-panel-title cns-palette-section-title--purple">Reasoning</h3>
                        <div className="common-layout-6">
                            {reasoningNodes.map(renderItem)}
                        </div>
                    </div>
                )}

                {otherNodes.length > 0 && (
                    <div>
                        <h3 className="glass-panel-title cns-palette-section-title--gray">Effectors</h3>
                        <div className="common-layout-6">
                            {otherNodes.map(renderItem)}
                        </div>
                    </div>
                )}

                {subGraphs.length > 0 && (
                    <div>
                        <h3 className="glass-panel-title cns-palette-section-title--blue">Pathways</h3>
                        <div className="common-layout-6">
                            {subGraphs.map(renderItem)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

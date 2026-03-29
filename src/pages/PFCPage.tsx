import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { PrefrontalCortex } from '../components/PrefrontalCortex';
import { PFCInspector } from '../components/PFCInspector';
import { PFCNavTree } from '../components/PFCNavTree';
import type { PFCAgileItem } from '../types';

export function PFCPage() {
    const navigate = useNavigate();
    const [selectedPfcItem, setSelectedPfcItem] = useState<PFCAgileItem | null>(null);
    const [isInspectorExpanded, setIsInspectorExpanded] = useState(false);
    const [createModalType, setCreateModalType] = useState<'EPIC' | 'STORY' | 'TASK' | null>(null);
    const [filterEpicId, setFilterEpicId] = useState<string | null>(null);
    const [items, setItems] = useState<PFCAgileItem[]>([]);

    const handleItemsChange = useCallback((newItems: PFCAgileItem[]) => {
        setItems(newItems);
    }, []);

    return (
        <ThreePanel
            left={
                <PFCNavTree
                    items={items}
                    selectedItemId={selectedPfcItem?.id}
                    filterEpicId={filterEpicId}
                    onItemSelect={setSelectedPfcItem}
                    onFilterChange={setFilterEpicId}
                    onCreateRequest={setCreateModalType}
                />
            }
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/')}>
                        ✕
                    </button>
                    <PrefrontalCortex
                        onItemSelect={setSelectedPfcItem}
                        selectedItemId={selectedPfcItem?.id}
                        onItemsChange={handleItemsChange}
                        filterEpicId={filterEpicId}
                        createModalType={createModalType}
                        onCreateModalChange={setCreateModalType}
                    />
                </div>
            }
            right={
                selectedPfcItem ? (
                    <PFCInspector
                        item={selectedPfcItem}
                        onUpdate={() => window.dispatchEvent(new Event('pfc-refresh'))}
                        onDelete={() => setSelectedPfcItem(null)}
                        isExpanded={isInspectorExpanded}
                        onToggleExpand={() => setIsInspectorExpanded(prev => !prev)}
                    />
                ) : (
                    <>
                        <h2 className="glass-panel-title">TICKET INSPECTOR</h2>
                        <div className="layout-placeholder font-mono text-sm">
                            Select an Agile Ticket to view or edit its details.
                        </div>
                    </>
                )
            }
            rightClassName={isInspectorExpanded ? 'three-panel-right--expanded' : undefined}
        />
    );
}

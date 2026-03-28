import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThreePanel } from '../components/ThreePanel';
import { PrefrontalCortex } from '../components/PrefrontalCortex';
import { PFCInspector } from '../components/PFCInspector';
import type { PFCAgileItem } from '../types';

export function PFCStub() {
    const navigate = useNavigate();
    const [selectedPfcItem, setSelectedPfcItem] = useState<PFCAgileItem | null>(null);

    return (
        <ThreePanel
            center={
                <div className="glass-panel three-panel-center-stage">
                    <button className="panel-close-btn" onClick={() => navigate('/')}>
                        ✕
                    </button>
                    <PrefrontalCortex
                        onItemSelect={setSelectedPfcItem}
                        selectedItemId={selectedPfcItem?.id}
                    />
                </div>
            }
            right={
                selectedPfcItem ? (
                    <PFCInspector
                        item={selectedPfcItem}
                        onUpdate={() => window.dispatchEvent(new Event('pfc-refresh'))}
                        onDelete={() => setSelectedPfcItem(null)}
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
        />
    );
}

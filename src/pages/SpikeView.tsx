import 'flexlayout-react/style/light.css';
import { useCallback, useMemo, useState } from 'react';
import { Layout, Model, Actions, TabNode } from 'flexlayout-react';
import { SpikeStream } from '../components/SpikeStream';

interface SpikeViewProps {
    initialSpikeId?: string;
}

const createInitialModel = (initialSpikeId?: string) => {
    const tabs: unknown[] = [];

    if (initialSpikeId) {
        tabs.push({
            id: initialSpikeId,
            type: 'tab',
            component: 'SpikeStream',
            name: initialSpikeId,
        });
    }

    const json = {
        global: {
            tabEnableFloat: true,
        },
        layout: {
            type: 'row',
            weight: 100,
            children: [
                {
                    type: 'tabset',
                    weight: 100,
                    children: tabs.length > 0 ? tabs : [
                        {
                            id: 'placeholder',
                            type: 'tab',
                            component: 'SpikeStream',
                            name: 'No Spike Selected',
                        },
                    ],
                },
            ],
        },
    };

    return Model.fromJson(json);
};

export const SpikeView = ({ initialSpikeId }: SpikeViewProps) => {
    const [model, setModel] = useState<Model>(() => createInitialModel(initialSpikeId));
    const [nextIdCounter, setNextIdCounter] = useState(1);

    const factory = useCallback((node: TabNode) => {
        const component = node.getComponent();
        if (component === 'SpikeStream') {
            const spikeId = node.getId() || node.getName();
            if (!spikeId || spikeId === 'placeholder') {
                return (
                    <div style={{ padding: '16px', color: '#e5e7eb', backgroundColor: '#020617' }}>
                        Select a Spike to begin streaming logs.
                    </div>
                );
            }
            return <SpikeStream spikeId={spikeId} />;
        }

        return null;
    }, []);

    const openSpike = useCallback(
        (spikeId: string) => {
            if (!spikeId) return;

            const targetNode = model.getFirstTabSet();
            if (!targetNode) return;

            const action = Actions.addNode(
                {
                    id: spikeId,
                    type: 'tab',
                    component: 'SpikeStream',
                    name: spikeId,
                },
                targetNode.getId(),
                Actions.getTabSetInsertPos(targetNode, 'flexlayout_tab'),
            );

            const newModel = model.doAction(action);
            setModel(newModel as Model);
        },
        [model],
    );

    const quickSpikeId = useMemo(() => `ad-hoc-${nextIdCounter}`, [nextIdCounter]);

    const handleOpenQuickSpike = () => {
        openSpike(quickSpikeId);
        setNextIdCounter((prev) => prev + 1);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
            <div style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>
                    SPIKE TELEMETRY MATRIX
                </div>
                <button
                    type="button"
                    onClick={handleOpenQuickSpike}
                    style={{
                        fontSize: '0.75rem',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        border: '1px solid rgba(148, 163, 184, 0.6)',
                        background: 'rgba(15, 23, 42, 0.6)',
                        color: '#e5e7eb',
                        cursor: 'pointer',
                    }}
                >
                    + Open Spike Tab
                </button>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
                <Layout model={model} factory={factory} />
            </div>
        </div>
    );
};


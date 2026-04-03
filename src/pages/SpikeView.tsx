import 'flexlayout-react/style/light.css';
import './SpikeView.css';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Actions, DockLocation, Layout, Model, TabNode } from 'flexlayout-react';
import { SpikeStream } from '../components/SpikeStream';

interface SpikeViewProps {
    initialSpikeId?: string;
}

const createInitialModel = (initialSpikeId?: string) => {
    const tabs: any[] = [];

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

    return Model.fromJson(json as any);
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
                    <div className="spikeview-placeholder">
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
                DockLocation.CENTER,
                -1,
            );

            const newModel = model.doAction(action) as unknown as Model;
            setModel(newModel);
        },
        [model],
    );

    // If a new spike is selected externally (e.g. from CNSMonitor), open it as a tab.
    useEffect(() => {
        if (initialSpikeId) {
            openSpike(initialSpikeId);
        }
    }, [initialSpikeId, openSpike]);

    const quickSpikeId = useMemo(() => `ad-hoc-${nextIdCounter}`, [nextIdCounter]);

    const handleOpenQuickSpike = () => {
        openSpike(quickSpikeId);
        setNextIdCounter((prev) => prev + 1);
    };

    return (
        <div className="spikeview-root">
            <div className="spikeview-toolbar">
                <div className="spikeview-title">
                    <img src="/Are-SelfLogo-transparent.png" alt="" style={{ height: '18px', marginRight: '8px', verticalAlign: 'middle' }} />
                    SPIKE TELEMETRY MATRIX
                </div>
                <button
                    type="button"
                    onClick={handleOpenQuickSpike}
                    className="spikeview-open-btn"
                >
                    + Open Spike Tab
                </button>
            </div>
            <div className="spikeview-layout">
                <Layout model={model} factory={factory} />
            </div>
        </div>
    );
};


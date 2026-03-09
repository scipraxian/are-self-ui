import { useState } from 'react';
import { Settings, MessageSquare, Terminal } from 'lucide-react';
import { BackgroundCanvas } from './BackgroundCanvas';
import { IdentityRoster } from './IdentityRoster';
import { TemporalMatrix } from './TemporalMatrix';
import { PrefrontalCortex } from './PrefrontalCortex';
import { IdentitySheet } from './IdentitySheet';
import { ReasoningGraph3D } from './ReasoningGraph3D';
import { ReasoningSidebar, ReasoningInspector } from './ReasoningPanels';
import { CNSSidebar } from './CNSSidebar';
import { CNSEditor } from './CNSEditor';
import { CNSEditorPalette } from './CNSEditorPalette';
import { CNSInspector } from './CNSInspector';
import { apiFetch } from '../api';
import './BloodBrainBarrier.css';
import { CNSView } from "./CNSView.tsx";
import { PFCInspector } from './PFCInspector';
import type { GraphNode, PFCAgileItem } from '../types';

export const BloodBrainBarrier = () => {
    // Add 'cns' to the viewport state
    const [activeViewport, setActiveViewport] = useState<'iteration' | 'identity' | 'pfc' | 'reasoning' | 'cns' | null>(null);
    const [selectedEntity, setSelectedEntity] = useState<{ id: number | string, type: 'base' | 'disc' } | null>(null);

    // Frontal Lobe State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [cortexStats, setCortexStats] = useState<{ level: number, focus: string, xp: number, status: string, latestThought: string } | null>(null);

    // PFC State
    const [selectedPfcItem, setSelectedPfcItem] = useState<PFCAgileItem | null>(null);

    // CNS State
    const [activePathwayId, setActivePathwayId] = useState<string | null>(null);

    // Matrix View State
    const [matrixHasSelection, setMatrixHasSelection] = useState<boolean>(false);

    const handleLobeClick = (path: string) => {
        // Clear all inspectors when changing views
        setSelectedNode(null);
        setSelectedEntity(null);
        setSelectedPfcItem(null);

        if (path === 'temporal') setActiveViewport('iteration');
        else if (path === 'pfc') setActiveViewport('pfc');
        else if (path === 'frontal') setActiveViewport('reasoning');
        else if (path === 'cns') setActiveViewport('cns');
        else setActiveViewport(null);
    };

    const handleIdentitySelect = (id: number | string, type: 'base' | 'disc') => {
        setSelectedEntity({ id, type });
        setActiveViewport('identity');
    };

    const isReasoningGraphActive = activeViewport === 'reasoning' && activeSessionId !== null;
    const isCNSEditorActive = activeViewport === 'cns' && activePathwayId !== null;

    return (
        <div className="bbb-wrapper">
            {/* --- DYNAMIC BACKGROUND LAYER --- */}
            <div className="bbb-layer-3d">
                {isReasoningGraphActive ? (
                    <ReasoningGraph3D
                        sessionId={activeSessionId}
                        onNodeSelect={setSelectedNode}
                        onStatsUpdate={setCortexStats}
                    />
                ) : isCNSEditorActive ? (
                    <CNSEditor
                        pathwayId={activePathwayId as string}
                        onDrillDown={setActivePathwayId}
                        onNodeSelect={setSelectedNode}
                    />
                ) : (
                    <BackgroundCanvas onLobeClick={handleLobeClick} />
                )}
            </div>

            <div className="bbb-layer-ui">
                <header className="glass-panel bbb-header">
                    <div className="bbb-header-brand">
                        <Settings size={18} className="bbb-header-icon" />
                        <h1 className="font-display heading-tracking text-base bbb-header-title">ARE-SELF</h1>
                    </div>
                </header>

                <div className="bbb-main-content">
                    {/* LEFT PANEL */}
                    <aside className="glass-panel bbb-panel-side">
                        {activeViewport === 'reasoning' ? (
                            <ReasoningSidebar
                                activeSessionId={activeSessionId}
                                onSelectSession={setActiveSessionId}
                                onExit={() => { setActiveSessionId(null); setActiveViewport(null); }}
                            />
                        ) : activeViewport === 'cns' ? (
                            isCNSEditorActive ? (
                                <CNSEditorPalette
                                    pathwayId={activePathwayId as string}
                                    onBack={() => setActivePathwayId(null)}
                                />
                            ) : (
                                <CNSSidebar
                                    activePathwayId={activePathwayId}
                                    onSelectPathway={setActivePathwayId}
                                    onExit={() => { setActivePathwayId(null); setActiveViewport(null); }}
                                />
                            )
                        ) : (
                            <>
                                {!(activeViewport === 'iteration' && !matrixHasSelection) && (
                                    <>
                                        <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                                        <IdentityRoster onSelectIdentity={handleIdentitySelect} />
                                    </>
                                )}
                                <div id="bbb-iteration-roster-portal" style={{ display: activeViewport === 'iteration' && !matrixHasSelection ? 'flex' : 'none', flexDirection: 'column', height: '100%', overflow: 'hidden', width: '100%' }} />
                            </>
                        )}
                    </aside>

                    {/* NORMAL CENTER STAGE */}
                    <main className={activeViewport && !isReasoningGraphActive && !isCNSEditorActive ? "bbb-panel-center-active" : "bbb-panel-center-wrapper"}>
                        {activeViewport && !isReasoningGraphActive && !isCNSEditorActive && activeViewport !== 'reasoning' && activeViewport !== 'cns' && (
                            <div className="glass-panel bbb-panel-center-active bloodbrainbarrier-ui-12">
                                <button className="bbb-close-btn" onClick={() => setActiveViewport(null)}>✕</button>
                                {activeViewport === 'iteration' && <TemporalMatrix onSelectionChange={setMatrixHasSelection} />}
                                {activeViewport === 'pfc' && (
                                    <PrefrontalCortex
                                        onItemSelect={setSelectedPfcItem}
                                        selectedItemId={selectedPfcItem?.id}
                                    />
                                )}
                                {activeViewport === 'identity' && selectedEntity ? (
                                    <IdentitySheet id={selectedEntity.id} type={selectedEntity.type} />
                                ) : activeViewport === 'identity' && !selectedEntity ? (
                                    <div className="bbb-placeholder font-mono text-sm">Select an identity from the roster to view synaptic data.</div>
                                ) : null}
                            </div>
                        )}

                        {activeViewport === 'reasoning' && !activeSessionId && (
                            <div className="glass-panel bbb-panel-center-active bloodbrainbarrier-ui-11">
                                <button className="bbb-close-btn" onClick={() => setActiveViewport(null)}>✕</button>
                                <div className="bbb-placeholder font-mono text-sm">Select a Cognitive Thread from the left panel to engage the Cortex.</div>
                            </div>
                        )}

                        {activeViewport === 'cns' && !activePathwayId && (
                            <div className="glass-panel bbb-panel-center-active bloodbrainbarrier-ui-10">
                                <div className="bloodbrainbarrier-ui-9">
                                    <button className="bbb-close-btn" onClick={() => setActiveViewport(null)}>✕</button>
                                </div>
                                <CNSView onOpenPathway={(pathwayId) => {
                                    setActivePathwayId(pathwayId);
                                }} />
                            </div>
                        )}
                    </main>

                    {/* NORMAL RIGHT PANEL */}
                    <aside className="glass-panel bbb-panel-right">
                        {isReasoningGraphActive ? (
                            <ReasoningInspector node={selectedNode} />
                        ) : isCNSEditorActive ? (
                            <CNSInspector
                                node={selectedNode}
                                pathwayId={activePathwayId as string}
                                onDelete={(id) => {
                                    apiFetch(`/api/v2/neurons/${id}/`, { method: 'DELETE' })
                                        .then(() => {
                                            const event = new CustomEvent('cns-node-deleted', { detail: id });
                                            window.dispatchEvent(event);
                                        }).catch(console.error);
                                }}
                                onContextChange={async (nodeId, key, value) => {
                                    try {
                                        const searchRes = await apiFetch(`/api/v1/node-contexts/?neuron=${nodeId}&key=${key}`);
                                        const searchData = await searchRes.json();
                                        const existing = searchData.results && searchData.results.length > 0 ? searchData.results[0] : null;

                                        if (!value) {
                                            if (existing) {
                                                await apiFetch(`/api/v1/node-contexts/${existing.id}/`, { method: 'DELETE' });
                                            }
                                        } else {
                                            if (existing) {
                                                await apiFetch(`/api/v1/node-contexts/${existing.id}/`, {
                                                    method: 'PATCH',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ value })
                                                });
                                            } else {
                                                await apiFetch(`/api/v1/node-contexts/`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ neuron: nodeId, key: key, value: value })
                                                });
                                            }
                                        }
                                    } catch (err) {
                                        console.error("Failed to sync context override via REST:", err);
                                    }
                                }}
                            />
                        ) : activeViewport === 'pfc' ? (
                            selectedPfcItem ? (
                                <PFCInspector
                                    item={selectedPfcItem}
                                    onUpdate={() => {
                                        // The board auto-polls, but we can leave this here
                                    }}
                                    onDelete={() => setSelectedPfcItem(null)}
                                />
                            ) : (
                                <div className="bloodbrainbarrier-ui-8">
                                    <h2 className="glass-panel-title">TICKET INSPECTOR</h2>
                                    <div className="common-layout-1">Select an Agile Ticket to view or edit its details.</div>
                                </div>
                            )
                        ) : (
                            <>
                                <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                                <div className="bbb-placeholder font-mono text-sm">[Contextual Node Details]</div>
                            </>
                        )}
                    </aside>
                </div>

                <footer className="glass-panel bbb-footer">
                    <div className="font-mono text-xs bbb-footer-ticker bloodbrainbarrier-ui-7">
                        <Terminal className="bloodbrainbarrier-ui-6" size={14} />
                        {isReasoningGraphActive && cortexStats ? (
                            <div className="bloodbrainbarrier-ui-5">
                                <span className="bloodbrainbarrier-ui-4">LVL {cortexStats.level}</span>
                                <span className="bloodbrainbarrier-ui-3">FOCUS {cortexStats.focus}</span>
                                <span className="bloodbrainbarrier-ui-2">{cortexStats.xp} XP</span>
                                <span className="bloodbrainbarrier-ui-1">
                                    "{cortexStats.latestThought}"
                                </span>
                            </div>
                        ) : (
                            <span className="bbb-footer-ticker-text">"Awaiting neural synchronization..."</span>
                        )}
                    </div>
                    <div className="bbb-footer-chat">
                        <MessageSquare size={18} />
                    </div>
                </footer>
            </div>
        </div>
    );
};
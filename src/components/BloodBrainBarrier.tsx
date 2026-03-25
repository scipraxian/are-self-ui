import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Terminal } from 'lucide-react';
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
import { CNSMonitor } from '../pages/CNSMonitor';
import { SpikeView } from '../pages/SpikeView';
import { apiFetch } from '../api';
import './BloodBrainBarrier.css';
import { CNSView } from './CNSView';
import { PFCInspector } from './PFCInspector';
import { HeartbeatControlPanel } from './HeartbeatControlPanel';
import type { GraphNode, PFCAgileItem } from '../types';
import { HamburgerMenu } from './HamburgerMenu';
import { useGABA } from '../context/GABAProvider';
import { ThalamusChat } from './ThalamusChat.tsx';
import { SessionChat } from './SessionChat'; // <-- NEW IMPORT

export const BloodBrainBarrier = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { registerEscapeHandler } = useGABA();

    // Add 'cns' to the viewport state
    const [activeViewport, setActiveViewport] = useState<
        'iteration' | 'identity' | 'pfc' | 'reasoning' | 'cns' | 'pns' | null
    >(null);
    const [selectedEntity, setSelectedEntity] = useState<{
        id: number | string;
        type: 'base' | 'disc';
    } | null>(null);

    // Frontal Lobe State
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [isSessionChatOpen, setIsSessionChatOpen] = useState(false); // <-- NEW STATE
    const [cortexStats, setCortexStats] = useState<{
        level: number;
        focus: string;
        xp: number;
        status: string;
        latestThought: string;
    } | null>(null);

    // PFC State
    const [selectedPfcItem, setSelectedPfcItem] = useState<PFCAgileItem | null>(null);

    // CNS State
    const [activePathwayId, setActivePathwayId] = useState<string | null>(null);
    const [selectedSpikeId, setSelectedSpikeId] = useState<string | null>(null);
    const [selectedCNSEnvironmentId, setSelectedCNSEnvironmentId] = useState<string>('');

    // Matrix View State
    const [, setMatrixHasSelection] = useState<boolean>(false);

    // Thalamus chat panel (slide-out from lower-right chat bubble)
    const [chatPanelOpen, setChatPanelOpen] = useState(false);

    // Keep viewport (and CNS edit/view mode) in sync with URL path (deep-linkable)
    useEffect(() => {
        const path = location.pathname;

        // Clear inspectors and overlays when navigating between lobes
        setSelectedNode(null);
        setSelectedPfcItem(null);
        setSelectedSpikeId(null);
        setIsSessionChatOpen(false); // Make sure chat closes if we leave the lobe

        if (path === '/' || path === '') {
            setActiveViewport(null);
            setActivePathwayId(null);
            return;
        }

        if (path.startsWith('/temporal')) {
            setActiveViewport('iteration');
            setActivePathwayId(null);
        } else if (path.startsWith('/pfc')) {
            setActiveViewport('pfc');
            setActivePathwayId(null);
        } else if (path.startsWith('/frontal')) {
            setActiveViewport('reasoning');
            setActivePathwayId(null);
        } else if (path.startsWith('/cns')) {
            setActiveViewport('cns');
            // Support explicit CNS edit vs monitor routes:
            // /cns/edit/:id -> edit mode
            // /cns/monitor/:id -> monitor/view mode
            const parts = path.split('/').filter(Boolean); // e.g. ['cns', 'edit', '123']
            if (parts.length >= 3 && (parts[1] === 'edit' || parts[1] === 'monitor')) {
                setActivePathwayId(parts[2]);
            } else {
                setActivePathwayId(null);
            }
        } else if (path.startsWith('/pns')) {
            setActiveViewport('pns');
            setActivePathwayId(null);
        } else {
            setActiveViewport(null);
            setActivePathwayId(null);
        }
    }, [location.pathname]);

    const handleLobeClick = (path: string) => {
        // Route-driven navigation: spheres push URLs, effect sets viewport
        navigate(`/${path}`);
    };

    const handleIdentitySelect = (id: number | string, type: 'base' | 'disc') => {
        setSelectedEntity({ id, type });
        setActiveViewport('identity');
    };

    const handleCloseToRoot = () => {
        navigate('/');
    };

    const isReasoningGraphActive = activeViewport === 'reasoning' && activeSessionId !== null;
    const isCNSEditorActive = activeViewport === 'cns' && activePathwayId !== null;

    // CNS view vs edit routes driven from URL
    const path = location.pathname;
    const isCNSMonitorRoute = path.startsWith('/cns/monitor/');
    const isCNSEditRoute = path.startsWith('/cns/edit/');

    // Global ESC: when in CNS, ESC should collapse panels or return to CNS index
    useEffect(() => {
        if (activeViewport !== 'cns') {
            return;
        }

        const unregister = registerEscapeHandler(() => {
            if (activePathwayId) {
                // From an active pathway (edit or monitor) back to CNS index
                setActivePathwayId(null);
                navigate('/cns');
            } else {
                // From CNS index back to Mission Control
                handleCloseToRoot();
            }
        });

        return unregister;
    }, [activeViewport, activePathwayId, navigate, registerEscapeHandler]);

    return (
        <div className="bbb-wrapper">
            {/* --- DYNAMIC BACKGROUND LAYER --- */}
            <div className="bbb-layer-3d">
                {!isReasoningGraphActive && !isCNSEditorActive ? (
                    <BackgroundCanvas onLobeClick={handleLobeClick} />
                ) : null}
            </div>

            <div className="bbb-layer-ui">
                {/* Floating global navigation only (no fixed top bar) */}
                <HamburgerMenu />

                {activeViewport && (
                    <div className="bbb-main-content">
                        {/* LEFT PANEL */}
                        <aside className="glass-panel bbb-panel-side">
                            {activeViewport === 'reasoning' ? (
                                <ReasoningSidebar
                                    activeSessionId={activeSessionId}
                                    onSelectSession={setActiveSessionId}
                                    onExit={handleCloseToRoot}
                                    onToggleChat={() => setIsSessionChatOpen((prev) => !prev)} // <-- NEW PROP PASSED
                                />
                            ) : activeViewport === 'cns' ? (
                                isCNSEditRoute && isCNSEditorActive ? (
                                    <CNSEditorPalette
                                        pathwayId={activePathwayId as string}
                                        onBack={() => {
                                            setActivePathwayId(null);
                                            navigate('/cns');
                                        }}
                                    />
                                ) : (
                                    <CNSSidebar
                                        activePathwayId={activePathwayId}
                                        onSelectPathway={(id) => {
                                            setActivePathwayId(id);
                                            navigate(`/cns/monitor/${id}`);
                                        }}
                                        onExit={handleCloseToRoot}
                                        selectedEnvironmentId={selectedCNSEnvironmentId}
                                        onEnvironmentChange={setSelectedCNSEnvironmentId}
                                    />
                                )
                            ) : (
                                <>
                                    {activeViewport !== 'iteration' && (
                                        <>
                                            <h2 className="glass-panel-title">IDENTITY ROSTER</h2>
                                            <IdentityRoster onSelectIdentity={handleIdentitySelect} />
                                        </>
                                    )}
                                    <div
                                        id="bbb-iteration-roster-portal"
                                        className={`bbb-iteration-roster-portal ${activeViewport === 'iteration' ? "bbb-iteration-roster-portal--active" : ""}`}
                                    />
                                </>
                            )}
                        </aside>

                        {/* NORMAL CENTER STAGE */}
                        <main
                            className={
                                isCNSEditorActive
                                    ? 'bbb-panel-center-wrapper bbb-panel-center-cns-graph'
                                    : isReasoningGraphActive
                                        ? 'bbb-panel-center-wrapper bbb-panel-center-reasoning-graph'
                                        : activeViewport && !isReasoningGraphActive && !isCNSEditorActive
                                            ? 'bbb-panel-center-active'
                                            : 'bbb-panel-center-wrapper'
                            }
                        >
                            {isReasoningGraphActive && (
                                <ReasoningGraph3D
                                    sessionId={activeSessionId as string}
                                    onNodeSelect={setSelectedNode}
                                    onStatsUpdate={setCortexStats}
                                />
                            )}

                            {/* --- NEW OVERLAY BLOCK FOR SESSION CHAT --- */}
                            {isReasoningGraphActive && isSessionChatOpen && (
                                <div className="bbb-session-chat-overlay">
                                    <div className="bbb-session-chat-container">
                                        <SessionChat
                                            sessionId={activeSessionId as string}
                                            title="SESSION OVERRIDE"
                                            onClose={() => setIsSessionChatOpen(false)}
                                        />
                                    </div>
                                </div>
                            )}

                            {isCNSEditorActive && (
                                isCNSMonitorRoute ? (
                                    <CNSMonitor
                                        pathwayId={activePathwayId as string}
                                        environmentName={selectedCNSEnvironmentId ? `Env ${selectedCNSEnvironmentId}` : "Default Environment"}
                                    />
                                ) : (
                                    <CNSEditor
                                        pathwayId={activePathwayId as string}
                                        onDrillDown={setActivePathwayId}
                                        onNodeSelect={setSelectedNode}
                                        isMonitorMode={false}
                                    />
                                )
                            )}
                            {activeViewport &&
                                !isReasoningGraphActive &&
                                !isCNSEditorActive &&
                                activeViewport !== 'reasoning' &&
                                activeViewport !== 'cns' && (
                                    <div className="glass-panel bbb-panel-center-active bloodbrainbarrier-ui-12">
                                        <button className="bbb-close-btn" onClick={handleCloseToRoot}>
                                            ✕
                                        </button>
                                        {activeViewport === 'iteration' && (
                                            <TemporalMatrix onSelectionChange={setMatrixHasSelection} />
                                        )}
                                        {activeViewport === 'pfc' && (
                                            <PrefrontalCortex
                                                onItemSelect={setSelectedPfcItem}
                                                selectedItemId={selectedPfcItem?.id}
                                            />
                                        )}
                                        {activeViewport === 'identity' && selectedEntity ? (
                                            <IdentitySheet
                                                id={selectedEntity.id}
                                                type={selectedEntity.type}
                                            />
                                        ) : activeViewport === 'identity' && !selectedEntity ? (
                                            <div className="bbb-placeholder font-mono text-sm">
                                                Select an identity from the roster to view synaptic data.
                                            </div>
                                        ) : null}
                                        {activeViewport === 'pns' && <HeartbeatControlPanel />}
                                    </div>
                                )}

                            {activeViewport === 'reasoning' && !activeSessionId && (
                                <div className="glass-panel bbb-panel-center-active bloodbrainbarrier-ui-11">
                                    <button className="bbb-close-btn" onClick={handleCloseToRoot}>
                                        ✕
                                    </button>
                                    <div className="bbb-placeholder font-mono text-sm">
                                        Select a Cognitive Thread from the left panel to engage the
                                        Cortex.
                                    </div>
                                </div>
                            )}

                            {activeViewport === 'cns' && !activePathwayId && (
                                <div className="glass-panel bbb-panel-center-active bloodbrainbarrier-ui-10">
                                    <div className="bloodbrainbarrier-ui-9">
                                        <button className="bbb-close-btn" onClick={handleCloseToRoot}>
                                            ✕
                                        </button>
                                    </div>
                                    <CNSView
                                        onViewPathway={(pathwayId) => {
                                            setActivePathwayId(pathwayId);
                                            navigate(`/cns/monitor/${pathwayId}`);
                                        }}
                                        onEditPathway={(pathwayId) => {
                                            setActivePathwayId(pathwayId);
                                            navigate(`/cns/edit/${pathwayId}`);
                                        }}
                                        selectedEnvironmentId={selectedCNSEnvironmentId}
                                    />
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
                                                const event = new CustomEvent('cns-node-deleted', {
                                                    detail: id,
                                                });
                                                window.dispatchEvent(event);
                                            })
                                            .catch(console.error);
                                    }}
                                    onContextChange={async (nodeId, key, value) => {
                                        try {
                                            const searchRes = await apiFetch(
                                                `/api/v1/node-contexts/?neuron=${nodeId}&key=${key}`,
                                            );
                                            const searchData = await searchRes.json();
                                            const existing =
                                                searchData.results && searchData.results.length > 0
                                                    ? searchData.results[0]
                                                    : null;

                                            if (!value) {
                                                if (existing) {
                                                    await apiFetch(
                                                        `/api/v1/node-contexts/${existing.id}/`,
                                                        { method: 'DELETE' },
                                                    );
                                                }
                                            } else if (existing) {
                                                await apiFetch(
                                                    `/api/v1/node-contexts/${existing.id}/`,
                                                    {
                                                        method: 'PATCH',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                        },
                                                        body: JSON.stringify({ value }),
                                                    },
                                                );
                                            } else {
                                                await apiFetch(`/api/v1/node-contexts/`, {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({
                                                        neuron: nodeId,
                                                        key: key,
                                                        value: value,
                                                    }),
                                                });
                                            }
                                        } catch (err) {
                                            console.error(
                                                'Failed to sync context override via REST:',
                                                err,
                                            );
                                        }
                                    }}
                                />
                            ) : activeViewport === 'pfc' ? (
                                selectedPfcItem ? (
                                    <PFCInspector
                                        item={selectedPfcItem}
                                        onUpdate={() => {
                                            window.dispatchEvent(new Event('pfc-refresh'));
                                        }}
                                        onDelete={() => setSelectedPfcItem(null)}
                                    />
                                ) : (
                                    <div className="bloodbrainbarrier-ui-8">
                                        <h2 className="glass-panel-title">TICKET INSPECTOR</h2>
                                        <div className="common-layout-1">
                                            Select an Agile Ticket to view or edit its details.
                                        </div>
                                    </div>
                                )
                            ) : (
                                <>
                                    <h2 className="glass-panel-title">CORTICAL TELEMETRY</h2>
                                    <div className="bbb-placeholder font-mono text-sm">
                                        [Contextual Node Details]
                                    </div>
                                </>
                            )}
                        </aside>
                    </div>
                )}

                <footer className="glass-panel bbb-footer">
                    <div className="font-mono text-xs bbb-footer-ticker bloodbrainbarrier-ui-7">
                        <Terminal className="bloodbrainbarrier-ui-6" size={14} />
                        {isReasoningGraphActive && cortexStats ? (
                            <div className="bloodbrainbarrier-ui-5">
                                <span className="bloodbrainbarrier-ui-4">
                                    LVL {cortexStats.level}
                                </span>
                                <span className="bloodbrainbarrier-ui-3">
                                    FOCUS {cortexStats.focus}
                                </span>
                                <span className="bloodbrainbarrier-ui-2">{cortexStats.xp} XP</span>
                                <span className="bloodbrainbarrier-ui-1">
                                    "{cortexStats.latestThought}"
                                </span>
                            </div>
                        ) : (
                            <span className="bbb-footer-ticker-text">
                                "Awaiting neural synchronization..."
                            </span>
                        )}
                    </div>
                    <div
                        className="bbb-footer-chat"
                        onClick={() => setChatPanelOpen((open) => !open)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setChatPanelOpen((open) => !open)}
                        aria-label={chatPanelOpen ? 'Close Thalamus chat' : 'Open Thalamus chat'}
                    >
                        <MessageSquare size={18} />
                    </div>
                </footer>

                {/* Thalamus chat slide-out panel */}
                <div
                    className={`bbb-chat-panel-wrap ${chatPanelOpen ? 'bbb-chat-panel-wrap--open' : ''}`}
                    aria-hidden={!chatPanelOpen}
                >
                    <div className="bbb-chat-panel-inner">
                        <ThalamusChat onClose={() => setChatPanelOpen(false)} />
                    </div>
                </div>
            </div>
        </div>
    );
};
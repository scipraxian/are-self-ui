import { ThemeProvider } from '@lobehub/ui';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GABAProvider } from './context/GABAProvider';
import { BreadcrumbProvider } from './context/BreadcrumbProvider';
import { EnvironmentProvider } from './context/EnvironmentProvider';
import { SpikeSetProvider } from './context/SpikeSetProvider';
import { WorkerSetProvider } from './context/WorkerSetProvider';
import { SynapticCleftProvider } from './components/SynapticCleft';
import { LayoutShell } from './components/LayoutShell';
import { BrainView } from './pages/BrainView';
import { FrontalIndex } from './pages/FrontalIndex';
import { FrontalSession } from './pages/FrontalSession';
import { CNSPage } from './pages/CNSPage';
import { CNSEditPage } from './pages/CNSEditPage';
import { CNSMonitorPage } from './pages/CNSMonitorPage';
import { CNSSpikeSet } from './pages/CNSSpikeSet';
import { TemporalStub } from './pages/TemporalStub';
import { PFCPage } from './pages/PFCPage';
import { PFCDetailPage } from './pages/PFCDetailPage';
import { IdentityStub } from './pages/IdentityStub';
import { IdentityDetailStub } from './pages/IdentityDetailStub';
import { PNSPage } from './pages/PNSPage';
import { PNSMonitorPage } from './pages/PNSMonitorPage';
import { CNSTrainTimeline } from './pages/CNSTrainTimeline';
import { CNSSpikeForensics } from './pages/CNSSpikeForensics';
import { EnvironmentEditor } from './pages/EnvironmentEditor';
import { HippocampusPage } from './pages/HippocampusPage';
import { HypothalamusPage } from './pages/HypothalamusPage';
import { PFCEditPage } from './pages/PFCEditPage';
import { EffectorEditorPage } from './pages/EffectorEditorPage';

function App() {
    return (
        <SynapticCleftProvider>
            <ThemeProvider themeMode="dark">
                <BrowserRouter>
                    <EnvironmentProvider>
                    <BreadcrumbProvider>
                    <SpikeSetProvider>
                    <WorkerSetProvider>
                    <GABAProvider>
                        <Routes>
                            <Route element={<LayoutShell />}>
                                <Route index element={<BrainView />} />
                                <Route path="frontal">
                                    <Route index element={<FrontalIndex />} />
                                    <Route path=":sessionId" element={<FrontalSession />} />
                                </Route>
                                <Route path="cns">
                                    <Route index element={<CNSPage />} />
                                    <Route path="pathway/:pathwayId" element={<CNSTrainTimeline />} />
                                    <Route path="pathway/:pathwayId/edit" element={<CNSEditPage />} />
                                    <Route path="spiketrain/:spiketrainId" element={<CNSMonitorPage />} />
                                    <Route path="spike/:spikeId" element={<CNSSpikeForensics />} />
                                    <Route path="spikeset" element={<CNSSpikeSet />} />
                                    <Route path="effector" element={<EffectorEditorPage />} />
                                    <Route path="effector/:effectorId/edit" element={<EffectorEditorPage />} />
                                </Route>
                                <Route path="temporal" element={<TemporalStub />} />
                                <Route path="pfc">
                                    <Route index element={<PFCPage />} />
                                    <Route path="backlog" element={<PFCPage />} />
                                    <Route path="epic/:epicId" element={<PFCDetailPage />} />
                                    <Route path="epic/:epicId/edit" element={<PFCEditPage />} />
                                    <Route path="story/:storyId" element={<PFCDetailPage />} />
                                    <Route path="story/:storyId/edit" element={<PFCEditPage />} />
                                    <Route path="task/:taskId" element={<PFCDetailPage />} />
                                    <Route path="task/:taskId/edit" element={<PFCEditPage />} />
                                </Route>
                                <Route path="identity" element={<IdentityStub />} />
                                <Route path="identity/:discId" element={<IdentityDetailStub />} />
                                <Route path="environments" element={<EnvironmentEditor />} />
                                <Route path="hippocampus" element={<HippocampusPage />} />
                                <Route path="hypothalamus" element={<HypothalamusPage />} />
                                <Route path="pns" element={<PNSPage />} />
                                <Route path="pns/monitor" element={<PNSMonitorPage />} />
                            </Route>
                        </Routes>
                    </GABAProvider>
                    </WorkerSetProvider>
                    </SpikeSetProvider>
                    </BreadcrumbProvider>
                    </EnvironmentProvider>
                </BrowserRouter>
            </ThemeProvider>
        </SynapticCleftProvider>
    );
}

export default App;

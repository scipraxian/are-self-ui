import { ThemeProvider } from '@lobehub/ui';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GABAProvider } from './context/GABAProvider';
import { BreadcrumbProvider } from './context/BreadcrumbProvider';
import { EnvironmentProvider } from './context/EnvironmentProvider';
import { SpikeSetProvider } from './context/SpikeSetProvider';
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
import { IdentityStub } from './pages/IdentityStub';
import { IdentityDetailStub } from './pages/IdentityDetailStub';
import { PNSStub } from './pages/PNSStub';
import { CNSTrainTimeline } from './pages/CNSTrainTimeline';
import { CNSSpikeForensics } from './pages/CNSSpikeForensics';
import { EnvironmentEditor } from './pages/EnvironmentEditor';

function App() {
    return (
        <SynapticCleftProvider>
            <ThemeProvider themeMode="dark">
                <BrowserRouter>
                    <EnvironmentProvider>
                    <BreadcrumbProvider>
                    <SpikeSetProvider>
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
                                </Route>
                                <Route path="temporal" element={<TemporalStub />} />
                                <Route path="pfc" element={<PFCPage />} />
                                <Route path="identity" element={<IdentityStub />} />
                                <Route path="identity/:discId" element={<IdentityDetailStub />} />
                                <Route path="environments" element={<EnvironmentEditor />} />
                                <Route path="pns" element={<PNSStub />} />
                            </Route>
                        </Routes>
                    </GABAProvider>
                    </SpikeSetProvider>
                    </BreadcrumbProvider>
                    </EnvironmentProvider>
                </BrowserRouter>
            </ThemeProvider>
        </SynapticCleftProvider>
    );
}

export default App;

import { ThemeProvider } from '@lobehub/ui';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GABAProvider } from './context/GABAProvider';
import { SynapticCleftProvider } from './components/SynapticCleft';
import { LayoutShell } from './components/LayoutShell';
import { BrainView } from './pages/BrainView';
import { FrontalIndex } from './pages/FrontalIndex';
import { FrontalSession } from './pages/FrontalSession';
import { CNSPage } from './pages/CNSPage';
import { CNSEditStub } from './pages/CNSEditStub';
import { CNSMonitorStub } from './pages/CNSMonitorStub';
import { TemporalStub } from './pages/TemporalStub';
import { PFCPage } from './pages/PFCPage';
import { IdentityStub } from './pages/IdentityStub';
import { IdentityDetailStub } from './pages/IdentityDetailStub';
import { PNSStub } from './pages/PNSStub';

function App() {
    return (
        <SynapticCleftProvider>
            <ThemeProvider themeMode="dark">
                <BrowserRouter>
                    <GABAProvider>
                        <Routes>
                            <Route element={<LayoutShell />}>
                                <Route index element={<BrainView />} />
                                <Route path="frontal">
                                    <Route index element={<FrontalIndex />} />
                                    <Route path=":sessionId" element={<FrontalSession />} />
                                </Route>
                                <Route path="cns" element={<CNSPage />} />
                                <Route path="cns/edit/:pathwayId" element={<CNSEditStub />} />
                                <Route path="cns/monitor/:pathwayId" element={<CNSMonitorStub />} />
                                <Route path="temporal" element={<TemporalStub />} />
                                <Route path="pfc" element={<PFCPage />} />
                                <Route path="identity" element={<IdentityStub />} />
                                <Route path="identity/:discId" element={<IdentityDetailStub />} />
                                <Route path="pns" element={<PNSStub />} />
                            </Route>
                        </Routes>
                    </GABAProvider>
                </BrowserRouter>
            </ThemeProvider>
        </SynapticCleftProvider>
    );
}

export default App;

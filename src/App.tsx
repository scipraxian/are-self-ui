import type { ReactElement } from 'react';
import { ThemeProvider } from '@lobehub/ui';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import { BrainSplash } from './components/BrainSplash';
import { Dashboard } from './pages/Dashboard';
import { LiveMonitor } from './pages/LiveMonitor';

export function App(): ReactElement {
    return (
        <ThemeProvider themeMode="dark">
            <Router>
                <Routes>
                    {/* 1. The Front Door: Your 3D Brain */}
                    <Route path="/" element={<BrainSplash />} />

                    {/* 2. Mission Control: The Swimlanes */}
                    <Route path="/dashboard" element={<Dashboard />} />

                    {/* 3. The War Room: The 3D LCARS Monitor */}
                    <Route path="/monitor/:spikeTrainId" element={<LiveMonitor />} />
                </Routes>
            </Router>
        </ThemeProvider>
    );
}
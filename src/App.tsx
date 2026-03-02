import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@lobehub/ui';
import { BrainSplash } from './components/BrainSplash';
import {CNSView} from "./components/CNSView.tsx";

const LobePlaceholder = ({ title }: { title: string }) => (
    <div style={{
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#050505'
    }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>{title}</h1>
        <p style={{ color: '#94a3b8', marginTop: '1rem', fontStyle: 'italic' }}>
            Neural pathways currently forming...
        </p>
        <a href="/" style={{ marginTop: '2rem', color: '#38bdf8', textDecoration: 'none' }}>
            ← Return to Brainstem
        </a>
    </div>
);

export default function App() {
    return (
        <ThemeProvider themeMode="dark">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<BrainSplash />} />
                    <Route path="/lobe/frontal" element={<LobePlaceholder title="Frontal Lobe (Reasoning & Strategy)" />} />
                    <Route path="/lobe/parietal" element={<LobePlaceholder title="Parietal Lobe (Tools & Sensory Input)" />} />
                    <Route path="/lobe/temporal" element={<LobePlaceholder title="Temporal Lobe (Time & Shifts)" />} />
                    <Route path="/lobe/occipital" element={<LobePlaceholder title="Occipital Lobe (Vision & UE5)" />} />
                    <Route path="/lobe/hippocampus" element={<LobePlaceholder title="Hippocampus (Long-Term Memory)" />} />
                    <Route path="/lobe/pfc" element={<LobePlaceholder title="Prefrontal Cortex (Agile Strategy)" />} />
                    <Route path="/lobe/cns" element={<CNSView />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}
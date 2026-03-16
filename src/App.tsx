import { ThemeProvider } from '@lobehub/ui';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { BloodBrainBarrier } from './components/BloodBrainBarrier';
import { GABAProvider } from './context/GABAProvider';

function App() {
    return (
        <ThemeProvider themeMode="dark">
            <BrowserRouter>
                <GABAProvider>
                    <Routes>
                        <Route path="/*" element={<BloodBrainBarrier />} />
                    </Routes>
                </GABAProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
import {ThemeProvider} from '@lobehub/ui';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {BloodBrainBarrier} from './components/BloodBrainBarrier';
import {GABAProvider} from './context/GABAProvider';
import {SynapticCleftProvider} from "./components/SynapticCleft.tsx";

function App() {
    return (
        <SynapticCleftProvider>
            <ThemeProvider themeMode="dark">
                <BrowserRouter>
                    <GABAProvider>
                        <Routes>
                            <Route path="/*" element={<BloodBrainBarrier/>}/>
                        </Routes>
                    </GABAProvider>
                </BrowserRouter>
            </ThemeProvider>
        </SynapticCleftProvider>
    );
}

export default App;
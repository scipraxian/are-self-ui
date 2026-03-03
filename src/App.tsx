import { ThemeProvider } from '@lobehub/ui';
import { BloodBrainBarrier } from './components/BloodBrainBarrier';

function App() {
    return (
        <ThemeProvider themeMode="dark">
            <BloodBrainBarrier />
        </ThemeProvider>
    );
}

export default App;
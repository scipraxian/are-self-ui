import { ThemeProvider } from '@lobehub/ui';
import { BloodBrainBarrier } from './components/BloodBrainBarrier';

export default function App() {
    return (
        <ThemeProvider themeMode="dark">
            <BloodBrainBarrier />
        </ThemeProvider>
    );
}

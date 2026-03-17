import { BackgroundCanvas } from '../components/BackgroundCanvas';
import { useNavigate } from 'react-router-dom';
import '../components/BrainSplash.css';

export const MainSplashPage = () => {
    const navigate = useNavigate();

    const handleLobeClick = (path: string) => {
        navigate(`/${path}`);
    };

    return (
        <div className="bbb-main-viewport">
            <section className="brainsplash-copy">
                <h2 className="font-display heading-tracking text-base">
                    Neural Systems Command Surface
                </h2>
                <p className="font-mono text-xs">
                    Route into individual cortical systems via the floating cortex or the hamburger
                    menu. Every lobe is now addressable via a deep-linkable URL.
                </p>
            </section>
            <div className="brainsplash-viewport">
                <BackgroundCanvas onLobeClick={handleLobeClick} />
            </div>
        </div>
    );
};


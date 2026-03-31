import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { ThalamusChat } from './ThalamusChat';
import './ThalamusBubble.css';

export function ThalamusBubble() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="thalamus-bubble-container">
            {isOpen && (
                <div className="thalamus-bubble-panel glass-panel">
                    <ThalamusChat onClose={() => setIsOpen(false)} />
                </div>
            )}
            <button
                className={`thalamus-bubble-btn ${isOpen ? 'thalamus-bubble-btn--open' : ''}`}
                onClick={() => setIsOpen(prev => !prev)}
                title={isOpen ? 'Close Thalamus' : 'Open Thalamus'}
            >
                {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
            </button>
        </div>
    );
}

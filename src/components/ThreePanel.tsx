import type { ReactNode } from 'react';
import './ThreePanel.css';

interface ThreePanelProps {
    left?: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
    centerClassName?: string;
}

export function ThreePanel({ left, center, right, centerClassName }: ThreePanelProps) {
    const centerClasses = ['three-panel-center', centerClassName].filter(Boolean).join(' ');

    return (
        <div className="three-panel-layout">
            <aside className="glass-panel three-panel-left">
                {left}
            </aside>
            <main className={centerClasses}>
                {center}
            </main>
            <aside className="glass-panel three-panel-right">
                {right}
            </aside>
        </div>
    );
}

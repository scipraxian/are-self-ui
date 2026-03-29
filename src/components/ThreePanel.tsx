import type { ReactNode } from 'react';
import './ThreePanel.css';

interface ThreePanelProps {
    left?: ReactNode;
    center?: ReactNode;
    right?: ReactNode;
    centerClassName?: string;
    rightClassName?: string;
}

export function ThreePanel({ left, center, right, centerClassName, rightClassName }: ThreePanelProps) {
    const centerClasses = ['three-panel-center', centerClassName].filter(Boolean).join(' ');
    const rightClasses = ['glass-panel three-panel-right', rightClassName].filter(Boolean).join(' ');

    return (
        <div className="three-panel-layout">
            <aside className="glass-panel three-panel-left">
                {left}
            </aside>
            <main className={centerClasses}>
                {center}
            </main>
            <aside className={rightClasses}>
                {right}
            </aside>
        </div>
    );
}

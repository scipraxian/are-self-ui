import { useState, useEffect } from 'react';

// Formats milliseconds into a clean MM:SS string
export const formatDuration = (ms: number) => {
    if (ms < 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const useDuration = (createdIso: string, modifiedIso: string, statusName: string) => {
    const [elapsedMs, setElapsedMs] = useState(0);
    const isActive = ['Running', 'Pending', 'Stopping'].includes(statusName);

    useEffect(() => {
        const createdTime = new Date(createdIso).getTime();

        const tick = () => {
            const completionTime = isActive ? Date.now() : new Date(modifiedIso).getTime();
            setElapsedMs(Math.max(0, completionTime - createdTime));
        };

        tick(); // Immediate calculation

        if (isActive) {
            // Tick every second if the process is active
            const interval = setInterval(tick, 1000);
            return () => clearInterval(interval);
        }
    }, [isActive, createdIso, modifiedIso]);

    return { elapsedMs, formattedDuration: formatDuration(elapsedMs), isActive };
};
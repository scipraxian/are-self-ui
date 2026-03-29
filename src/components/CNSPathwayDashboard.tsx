import './CNSPathwayDashboard.css';
import { useMemo } from 'react';
import { CNSPathwayCard } from './CNSPathwayCard';
import type { NeuralPathway, SpikeTrain } from '../types';

interface CNSPathwayDashboardProps {
    pathways: NeuralPathway[];
    trains: SpikeTrain[];
    searchQuery: string;
    isLoading: boolean;
}

export const CNSPathwayDashboard = ({ pathways, trains, searchQuery, isLoading }: CNSPathwayDashboardProps) => {
    const trainsByPathway = useMemo(() => {
        const map = new Map<number, SpikeTrain[]>();
        for (const train of trains) {
            const list = map.get(train.pathway) || [];
            list.push(train);
            map.set(train.pathway, list);
        }
        return map;
    }, [trains]);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        let list = pathways;
        if (q) {
            list = list.filter(p => p.name.toLowerCase().includes(q));
        }
        // Starred first, then alphabetical
        return [...list].sort((a, b) => {
            if (a.is_favorite && !b.is_favorite) return -1;
            if (!a.is_favorite && b.is_favorite) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [pathways, searchQuery]);

    if (isLoading) {
        return (
            <div className="cns-dashboard">
                <div className="cns-dashboard-loading">Loading pathways...</div>
            </div>
        );
    }

    if (filtered.length === 0) {
        return (
            <div className="cns-dashboard">
                <div className="cns-dashboard-empty">
                    {searchQuery ? 'No pathways match your search.' : 'No neural pathways found.'}
                </div>
            </div>
        );
    }

    return (
        <div className="cns-dashboard">
            <div className="cns-dashboard-grid">
                {filtered.map(pathway => (
                    <CNSPathwayCard
                        key={pathway.id}
                        pathway={pathway}
                        trains={trainsByPathway.get(pathway.id) || []}
                    />
                ))}
            </div>
        </div>
    );
};

import { useEffect, useState } from 'react';
import {NeuralGraph3D, type NeuralLink, type NeuralNode} from './NeuralGraph3D';

export const CNSView = () => {
    const [graphData, setGraphData] = useState<{ nodes: NeuralNode[]; links: NeuralLink[] }>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch the structural data from your new Django V2 endpoint
        fetch('http://localhost:8000/api/v2/pathways-3d/')
            .then((res) => {
                if (!res.ok) throw new Error('Failed to fetch pathway data');
                return res.json();
            })
            .then((data) => {
                // Since it's a list view, let's just grab the first pathway for testing
                if (data.results && data.results.length > 0) {
                    setGraphData({
                        nodes: data.results[0].nodes,
                        links: data.results[0].links
                    });
                } else if (Array.isArray(data) && data.length > 0) {
                    // Handle non-paginated DRF response
                    setGraphData({
                        nodes: data[0].nodes,
                        links: data[0].links
                    });
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>
            {/* Simple Header */}
            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, color: '#e2e8f0' }}>
                <h1 style={{ margin: 0, fontFamily: 'Inter' }}>CNS Pathway Viewer</h1>
                <a href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>← Back to Brain</a>
            </div>

            {loading && <div style={{ color: 'white', position: 'absolute', top: '50%', left: '50%' }}>Loading Neural Links...</div>}
            {error && <div style={{ color: '#ef4444', position: 'absolute', top: '50%', left: '50%' }}>{error}</div>}

            {!loading && !error && (
                <NeuralGraph3D
                    graphData={graphData}
                    onNodeSelect={(node) => console.log('Selected Node:', node)}
                />
            )}
        </div>
    );
};
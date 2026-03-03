import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';

import { CommandCenterLayout } from './CommandCenterLayout';
import { NeuralGraph3D, type NeuralLink, type NeuralNode } from './NeuralGraph3D';

export function CNSView(): ReactElement {
  const [graphData, setGraphData] = useState<{ nodes: NeuralNode[]; links: NeuralLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load(): Promise<void> {
      try {
        const res = await fetch('http://localhost:8000/api/v2/pathways-3d/');
        if (!res.ok) throw new Error('Failed to fetch pathway data');
        const data = (await res.json()) as { results?: Array<{ nodes: NeuralNode[]; links: NeuralLink[] }> } | Array<{ nodes: NeuralNode[]; links: NeuralLink[] }>;
        if (!isMounted) return;
        if (data && typeof data === 'object' && 'results' in data && data.results && data.results.length > 0) {
          setGraphData({ nodes: data.results[0].nodes, links: data.results[0].links });
        } else if (Array.isArray(data) && data.length > 0) {
          setGraphData({ nodes: data[0].nodes, links: data[0].links });
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, []);

  return (
    <CommandCenterLayout
      leftPanel={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px', borderLeft: '3px solid #facc15' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>Active Task</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>Fix Multiplayer RPC Sync</div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: '8px' }}>
              Verify player transforms align within 0.1s tolerance across connected clients.
            </div>
          </div>
          <button style={{
            background: '#3b82f6', color: '#fff', border: 'none', padding: '10px',
            borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto',
          }}>
            TICK ENGINE (Advance Turn)
          </button>
        </div>
      }
      rightPanel={
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span>NODE: <strong style={{ color: '#f8fafc' }}>mcp_grep</strong></span>
            <span>STATUS: <strong style={{ color: '#4ade80' }}>SUCCESS</strong></span>
          </div>

          <div style={{ flex: 1, background: '#000', borderRadius: '8px', padding: '12px', border: '1px solid #334155', fontFamily: 'monospace', fontSize: '0.75rem', color: '#a855f7', overflowY: 'auto' }}>
            <div style={{ color: '#64748b', marginBottom: '8px' }}>// LLM INTERNAL MONOLOGUE</div>
            <div>THOUGHT: I need to locate where the RPC calls are failing. I will grep the Source directory for 'ServerUpdateTransform'.</div>
            <div style={{ color: '#3b82f6', marginTop: '12px' }}>&gt; Executing mcp_grep...</div>
            <div style={{ color: '#4ade80', marginTop: '4px' }}>Matches found in PlayerController.cpp (Line 412)</div>
          </div>
        </div>
      }
    >
      {loading && <div style={{ color: 'white', position: 'absolute', top: '50%', left: '50%' }}>Loading Neural Links...</div>}
      {error && <div style={{ color: '#ef4444', position: 'absolute', top: '50%', left: '50%' }}>{error}</div>}

      {!loading && !error && (
        <NeuralGraph3D
          graphData={graphData}
          onNodeSelect={(node) => console.log('Selected Node:', node)}
        />
      )}
    </CommandCenterLayout>
  );
}
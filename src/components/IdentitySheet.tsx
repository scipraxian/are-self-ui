import { useEffect, useState } from 'react';
import { Cpu, Loader2, Database, Wrench, Zap, Activity } from 'lucide-react';
import './IdentitySheet.css';

interface OutlierData {
    id: string | number;
    name: string;
}

interface BaseIdentityData {
    id: string;
    name: string;
    system_prompt_template: string;
    rendered: string;
    enabled_tools: OutlierData[];
    addons: OutlierData[];
    tags: OutlierData[];
    identity_type?: OutlierData | null;
}

interface IdentityDiscData {
    id: string;
    name: string;
    level: number;
    xp: number;
    available: boolean;
    successes: number;
    failures: number;
    timeouts: number;
    last_message_to_self: string;
    rendered: string;
    identity: BaseIdentityData;
}

interface IdentitySheetProps {
    id: number | string;
    type: 'base' | 'disc';
}

export const IdentitySheet = ({ id, type }: IdentitySheetProps) => {
    const [data, setData] = useState<BaseIdentityData | IdentityDiscData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const loadData = async () => {
            if (isMounted) setIsLoading(true);

            try {
                const endpoint = type === 'disc'
                    ? `/api/v2/identity-discs/${id}/`
                    : `/api/v2/identities/${id}/`;

                const res = await fetch(endpoint);
                const json = await res.json();

                if (isMounted) {
                    setData(json);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Neural fetch failed:", err);
                if (isMounted) setIsLoading(false);
            }
        };

        loadData();

        return () => { isMounted = false; };
    }, [id, type]);

    if (isLoading || !data) {
        return (
            <div className="identity-sheet-container">
                <div className="sheet-body sheet-loading">
                    <Loader2 className="animate-spin text-muted" size={24} />
                    <span className="font-mono text-sm text-muted">Decrypting Engram...</span>
                </div>
            </div>
        );
    }

    // Safely extract the base template data using your exact schema structure
    const baseData: BaseIdentityData = type === 'disc'
        ? (data as IdentityDiscData).identity
        : (data as BaseIdentityData);

    const isDisc = type === 'disc';
    const discData = isDisc ? (data as IdentityDiscData) : null;

    return (
        <div className="identity-sheet-container scroll-hidden">
            <div className="sheet-header">
                <div className="sheet-title-group">
                    <h2 className="font-display sheet-title">
                        {data.name}
                    </h2>
                    <span className="font-mono sheet-subtitle">
                        Neural ID: {data.id} | Type: {type.toUpperCase()}
                        {baseData?.identity_type ? ` [${baseData.identity_type.name}]` : ''}
                    </span>
                </div>
                <button className="btn-action">
                    <Cpu size={14} fill="currentColor" />
                    EDIT SYNAPSES
                </button>
            </div>

            {/* RTS Disc Telemetry */}
            {isDisc && discData && (
                <div className="disc-specific-panel">
                    <h3 className="sheet-section-title common-layout-28">
                        <Activity size={14} /> Active Disc Telemetry
                    </h3>
                    <div className="sheet-metrics-grid">
                        <div className="metric-card">
                            <span className="metric-label">Experience Level</span>
                            <span className="metric-value">Lvl {discData.level} ({discData.xp} XP)</span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-label">Status</span>
                            <span className={`metric-value ${discData.available ? 'status-text-online' : 'roster-offline'}`}>
                                {discData.available ? 'Online & Ready' : 'Deployed / Offline'}
                            </span>
                        </div>
                        <div className="metric-card">
                            <span className="metric-label">Combat Record</span>
                            <span className="metric-value font-mono text-sm">
                                <span className="stat-positive">{discData.successes}W</span> - <span className="stat-negative">{discData.failures}L</span> - <span className="stat-warning">{discData.timeouts}T</span>
                            </span>
                        </div>
                    </div>

                    {discData.last_message_to_self && (
                        <div className="sheet-section identitysheet-ui-83">
                            <span className="metric-label">Last Internal Monologue</span>
                            <div className="memory-box">"{discData.last_message_to_self}"</div>
                        </div>
                    )}
                </div>
            )}

            <div className="sheet-section">
                <h3 className="sheet-section-title">System Prompt Formulation</h3>
                <div className="prompt-box scroll-hidden">
                    {baseData?.system_prompt_template || "No system prompt configured."}
                </div>
            </div>

            <div className="sheet-section">
                <h3 className="sheet-section-title">Compiled Neural Prompt (Turn 1)</h3>
                <div className="prompt-box scroll-hidden">
                    {/* Prefer the Disc's compiled prompt, fallback to the Base Template's compiled prompt */}
                    {(isDisc && discData?.rendered)
                        ? discData.rendered
                        : (baseData?.rendered || "No prompt compiled.")}
                </div>
            </div>

            <div className="sheet-section">
                <h3 className="sheet-section-title common-layout-15">
                    <Wrench size={14} /> Enabled Tools
                </h3>
                <div className="badge-container">
                    {baseData?.enabled_tools?.length > 0 ? (
                        baseData.enabled_tools.map(tool => (
                            <span key={`tool-${tool.id}`} className="badge badge-tool">{tool.name}</span>
                        ))
                    ) : (
                        <span className="font-mono text-xs text-muted">No tools configured.</span>
                    )}
                </div>
            </div>

            <div className="sheet-section">
                <h3 className="sheet-section-title common-layout-15">
                    <Zap size={14} /> Neural Addons
                </h3>
                <div className="badge-container">
                    {baseData?.addons?.length > 0 ? (
                        baseData.addons.map(addon => (
                            <span key={`addon-${addon.id}`} className="badge badge-addon">{addon.name}</span>
                        ))
                    ) : (
                        <span className="font-mono text-xs text-muted">No addons active.</span>
                    )}
                </div>
            </div>

            <div className="sheet-section">
                <h3 className="sheet-section-title common-layout-15">
                    <Database size={14} /> Taxonomy Tags
                </h3>
                <div className="badge-container">
                    {baseData?.tags?.length > 0 ? (
                        baseData.tags.map(tag => (
                            <span key={`tag-${tag.id}`} className="badge badge-tag">{tag.name}</span>
                        ))
                    ) : (
                        <span className="font-mono text-xs text-muted">Uncategorized.</span>
                    )}
                </div>
            </div>

        </div>
    );
};
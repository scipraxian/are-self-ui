import { useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Brain } from 'lucide-react';
import { apiFetch } from '../api';
import { useNeuronContext } from './useNeuronContext';
import './CustomNeuronNodes.css';

const COLOR = '#a855f7';

interface IdentityDisc {
    id: string;
    name: string;
}

interface FrontalLobeNodeData {
    label: string;
    neuronId: string;
    readonly?: boolean;
}

export const FrontalLobeNeuronNode = ({ data, id }: { data: FrontalLobeNodeData; id: string }) => {
    const nId = data.neuronId || id;
    const { context, loaded, updateContext } = useNeuronContext(nId);
    const ro = !!data.readonly;
    const [discs, setDiscs] = useState<IdentityDisc[]>([]);

    // Local-state textarea so React doesn't fight the user's caret.
    // updateContext refetches NeuronContext on every PATCH, which would
    // otherwise re-mount the controlled value mid-keystroke and reset
    // the cursor. We mirror the canonical context.prompt into local
    // state on mount / when the underlying value changes from elsewhere
    // (someone editing the same node in Django admin), and commit the
    // local edit on blur.
    const [promptDraft, setPromptDraft] = useState('');
    const promptVal = context.prompt || context.PROMPT || '';

    // Re-sync local draft if the canonical value changes for reasons
    // other than this user typing — e.g., a fresh fetch hands back a
    // newer value. We don't sync if the user has unsaved local edits.
    useEffect(() => {
        setPromptDraft(promptVal);
        // Intentional: only re-pull when the upstream value flips, not
        // when the local draft does.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [promptVal]);

    // Fetch available identity discs for the selector
    useEffect(() => {
        let cancelled = false;
        apiFetch('/api/v2/identity-discs/')
            .then(res => res.json())
            .then(json => {
                if (cancelled) return;
                const list = json.results || json;
                setDiscs(Array.isArray(list) ? list : []);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);

    const discVal = context.identity_disc || '';

    const handlePromptBlur = () => {
        if (promptDraft === promptVal) return;
        updateContext('prompt', promptDraft);
    };

    return (
        <div className={`custom-node custom-node--frontal-lobe${ro ? ' custom-node--readonly' : ''}`}>
            <div className="custom-node-header" style={{ background: COLOR }}>
                <div className="custom-node-header-left">
                    <Brain size={16} className="custom-node-header-icon" color="#fff" />
                    <span className="custom-node-header-title">{data.label || 'Frontal Lobe'}</span>
                </div>
                <span className="custom-node-header-id">#{id}</span>
            </div>

            <div className="custom-node-body">
                {loaded ? (
                    <>
                        <div className="custom-node-field">
                            <span className="custom-node-field-label">DISC</span>
                            <select
                                className="nodrag custom-node-field-select"
                                value={discVal}
                                onChange={e => updateContext('identity_disc', e.target.value)}
                            >
                                <option value="">— select disc —</option>
                                {discs.map(d => (
                                    <option key={d.id} value={String(d.id)}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="custom-node-field" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                            <span className="custom-node-field-label">PROMPT</span>
                            <textarea
                                className="nodrag custom-node-field-textarea"
                                value={promptDraft}
                                placeholder="reasoning prompt..."
                                onChange={e => setPromptDraft(e.target.value)}
                                onBlur={handlePromptBlur}
                            />
                        </div>
                    </>
                ) : (
                    <span className="custom-node-field-label">Loading...</span>
                )}

                <div className="custom-node-ports">
                    <div>
                        <div className="custom-node-port-row">
                            <Handle className="custom-node-handle custom-node-handle--in" type="target" position={Position.Left} id="in" />
                            <span className="custom-node-port-label custom-node-port-label--input">IN</span>
                        </div>
                    </div>
                    <div className="custom-node-outputs">
                        <div className="custom-node-port-row">
                            <span className="custom-node-port-label custom-node-port-label--success">PASS</span>
                            <Handle className="custom-node-handle custom-node-handle--success" type="source" position={Position.Right} id="success" />
                        </div>
                        <div className="custom-node-port-row">
                            <span className="custom-node-port-label custom-node-port-label--fail">FAIL</span>
                            <Handle className="custom-node-handle custom-node-handle--fail" type="source" position={Position.Right} id="failure" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

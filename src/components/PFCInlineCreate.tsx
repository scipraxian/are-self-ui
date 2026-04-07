import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import './PFCInlineCreate.css';

interface PFCInlineCreateProps {
    itemType: 'EPIC' | 'STORY' | 'TASK';
    parentId?: string;
    statusId?: number;
    onSubmit: (name: string, parentId?: string, statusId?: number) => Promise<void>;
    compact?: boolean;
}

export function PFCInlineCreate({ itemType, parentId, statusId, onSubmit, compact }: PFCInlineCreateProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!name.trim() || isSaving) return;
        setIsSaving(true);
        try {
            await onSubmit(name.trim(), parentId, statusId);
            setName('');
            setIsOpen(false);
        } catch (err) {
            console.error(`Failed to create ${itemType}`, err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') { setIsOpen(false); setName(''); }
    };

    const typeClass = itemType.toLowerCase();

    if (!isOpen) {
        return (
            <button
                className={`pfc-inline-create-trigger pfc-inline-create-trigger--${typeClass} ${compact ? 'pfc-inline-create-trigger--compact' : ''}`}
                onClick={() => setIsOpen(true)}
            >
                <Plus size={12} /> {itemType}
            </button>
        );
    }

    return (
        <div className={`pfc-inline-create-form pfc-inline-create-form--${typeClass}`}>
            <input
                ref={inputRef}
                className="pfc-inline-create-input"
                placeholder={`New ${itemType.toLowerCase()} name...`}
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (!name.trim()) { setIsOpen(false); } }}
                disabled={isSaving}
            />
            <button
                className={`pfc-inline-create-submit pfc-inline-create-submit--${typeClass}`}
                onClick={handleSubmit}
                disabled={!name.trim() || isSaving}
            >
                {isSaving ? '...' : 'Add'}
            </button>
        </div>
    );
}

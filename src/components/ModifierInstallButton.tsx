import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

import { apiFetch } from '../api';
import './ModifierInstallButton.css';

export function ModifierInstallButton() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [messageKind, setMessageKind] = useState<'info' | 'error'>('info');

    const openPicker = () => {
        if (isBusy) return;
        setMessage(null);
        fileInputRef.current?.click();
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        setIsBusy(true);
        setMessage(`Uploading ${file.name}…`);
        setMessageKind('info');

        try {
            const form = new FormData();
            form.append('archive', file);
            const res = await apiFetch('/api/v2/neural-modifiers/install/', {
                method: 'POST',
                body: form,
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                const detail = (payload as { detail?: string }).detail
                    ?? `Install failed (${res.status}).`;
                setMessage(detail);
                setMessageKind('error');
                return;
            }
            const bundleName = (payload as { name?: string; slug?: string }).name
                ?? (payload as { slug?: string }).slug
                ?? 'bundle';
            setMessage(`Installed ${bundleName}.`);
            setMessageKind('info');
        } catch (err) {
            setMessage(err instanceof Error ? err.message : 'Install failed.');
            setMessageKind('error');
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="modifier-install-button-root">
            <button
                type="button"
                className="modifier-install-button"
                onClick={openPicker}
                disabled={isBusy}
            >
                <Upload size={14} />
                <span>{isBusy ? 'Installing…' : 'Install bundle'}</span>
            </button>
            <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="modifier-install-input"
                onChange={handleFile}
            />
            {message && (
                <div
                    role={messageKind === 'error' ? 'alert' : 'status'}
                    className={`modifier-install-message modifier-install-message--${messageKind}`}
                >
                    {message}
                </div>
            )}
        </div>
    );
}

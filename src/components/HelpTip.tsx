import { HelpCircle } from 'lucide-react';
import type { KeyboardEvent, MouseEvent } from 'react';
import { docUrl } from '../config/docs';
import './HelpTip.css';

export type HelpTipPlacement = 'top' | 'right' | 'bottom' | 'left';

interface HelpTipProps {
    // Short tooltip text shown on hover/focus.
    tip: string;
    // Doc slug relative to /docs/, e.g. 'ui/hypothalamus' or
    // 'brain-regions/hypothalamus#routing'. Passed to docUrl().
    doc: string;
    // Tooltip position. Defaults to 'top'.
    placement?: HelpTipPlacement;
    // Optional accessible label override. Defaults to the tip string.
    label?: string;
}

export const HelpTip = ({ tip, doc, placement = 'top', label }: HelpTipProps) => {
    const url = docUrl(doc);
    const aria = label ?? `${tip} (opens documentation in a new tab)`;

    const openDocs = () => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        openDocs();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openDocs();
        }
    };

    return (
        <button
            type="button"
            className={`help-tip help-tip--${placement}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={aria}
            data-help-tip={tip}
        >
            <HelpCircle size={14} className="help-tip-icon" aria-hidden="true" />
        </button>
    );
};

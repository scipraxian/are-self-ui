import { type CSSProperties } from 'react';
import { User } from 'lucide-react';

import { avatarMediaUrl } from '../avatarApi';
import { AVATAR_DISPLAY, type Avatar } from '../types';
import { KandinskyAbstract } from './KandinskyAbstract';
import './AvatarTile.css';

interface AvatarTileProps {
    avatar: Avatar | null | undefined;
    /**
     * 768-d unit vector. When provided, an always-on Kandinsky abstract
     * is rendered as a corner overlay (or as the full tile when the
     * avatar is null/GENERATED). Discs always pass this; Identity
     * blueprints pass null and never get the overlay.
     */
    compositeVector?: number[] | null;
    /** Square edge in CSS pixels. Defaults to 32. */
    size?: number;
    className?: string;
    title?: string;
    /** Click handler — turns the tile into a button. */
    onClick?: () => void;
}

const OVERLAY_FRACTION = 0.4;

export function AvatarTile({
    avatar,
    compositeVector,
    size = 32,
    className,
    title,
    onClick,
}: AvatarTileProps) {
    const display = avatar?.display?.id;
    const overlaySize = Math.max(12, Math.round(size * OVERLAY_FRACTION));

    const wrapperClass = [
        'avatar-tile',
        onClick ? 'avatar-tile--interactive' : '',
        className ?? '',
    ].filter(Boolean).join(' ');

    const wrapperStyle: CSSProperties = {
        width: size,
        height: size,
    };

    const inner = (() => {
        // No avatar → full Kandinsky if disc, neutral placeholder otherwise.
        if (!avatar) {
            if (compositeVector && compositeVector.length > 0) {
                return <KandinskyAbstract vector={compositeVector} size={size} />;
            }
            return (
                <div className="avatar-tile-placeholder" aria-hidden="true">
                    <User size={Math.max(12, Math.round(size * 0.5))} />
                </div>
            );
        }

        if (display === AVATAR_DISPLAY.GENERATED) {
            // GENERATED is itself a Kandinsky from the disc's vector. If
            // the caller didn't provide one (e.g. blueprint context),
            // fall back to a flat tinted placeholder so we never look
            // broken.
            if (compositeVector && compositeVector.length > 0) {
                return <KandinskyAbstract vector={compositeVector} size={size} />;
            }
            return (
                <div className="avatar-tile-placeholder avatar-tile-placeholder--generated" aria-hidden="true">
                    <User size={Math.max(12, Math.round(size * 0.5))} />
                </div>
            );
        }

        if (display === AVATAR_DISPLAY.FILE) {
            const src = avatarMediaUrl(avatar);
            if (!src) {
                return (
                    <div className="avatar-tile-placeholder avatar-tile-placeholder--file-missing" aria-hidden="true">
                        <User size={Math.max(12, Math.round(size * 0.5))} />
                    </div>
                );
            }
            return (
                <img
                    src={src}
                    alt={avatar.original_filename ?? avatar.name}
                    className="avatar-tile-img"
                    loading="lazy"
                />
            );
        }

        if (display === AVATAR_DISPLAY.URL) {
            if (!avatar.url) {
                return (
                    <div className="avatar-tile-placeholder" aria-hidden="true">
                        <User size={Math.max(12, Math.round(size * 0.5))} />
                    </div>
                );
            }
            return (
                <img
                    src={avatar.url}
                    alt={avatar.name}
                    className="avatar-tile-img"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            );
        }

        if (display === AVATAR_DISPLAY.EMOJI) {
            const tintStyle: CSSProperties = avatar.tint_color
                ? { backgroundColor: avatar.tint_color }
                : {};
            return (
                <div
                    className="avatar-tile-emoji"
                    style={{
                        ...tintStyle,
                        fontSize: Math.round(size * 0.6),
                        lineHeight: `${size}px`,
                    }}
                    aria-hidden="true"
                >
                    {avatar.emoji ?? '?'}
                </div>
            );
        }

        return (
            <div className="avatar-tile-placeholder" aria-hidden="true">
                <User size={Math.max(12, Math.round(size * 0.5))} />
            </div>
        );
    })();

    // Always-on Kandinsky overlay for discs (compositeVector is non-null
    // and non-empty), but skip it when the tile body IS the Kandinsky —
    // no point duplicating itself in a corner.
    const showOverlay = !!compositeVector
        && compositeVector.length > 0
        && display !== undefined
        && display !== AVATAR_DISPLAY.GENERATED;

    const body = (
        <>
            {inner}
            {showOverlay && (
                <div
                    className="avatar-tile-overlay"
                    style={{ width: overlaySize, height: overlaySize }}
                    title="Composite vector — shifts as engrams accumulate"
                >
                    <KandinskyAbstract
                        vector={compositeVector}
                        size={overlaySize}
                        opacity={0.95}
                    />
                </div>
            )}
        </>
    );

    if (onClick) {
        return (
            <button
                type="button"
                className={wrapperClass}
                style={wrapperStyle}
                title={title}
                onClick={onClick}
            >
                {body}
            </button>
        );
    }

    return (
        <div className={wrapperClass} style={wrapperStyle} title={title} aria-label={avatar?.name ?? title}>
            {body}
        </div>
    );
}

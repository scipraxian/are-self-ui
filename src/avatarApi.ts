import { apiFetch } from './api';
import { AVATAR_DISPLAY, type Avatar, type AvatarDisplay, type AvatarDisplayId } from './types';

const AVATARS = '/api/v2/avatars/';
const AVATAR_DISPLAY_TYPES = '/api/v2/avatar-display-types/';

function unwrap<T>(payload: unknown): T[] {
    if (Array.isArray(payload)) return payload as T[];
    const results = (payload as { results?: T[] }).results;
    return Array.isArray(results) ? results : [];
}

export async function listAvatars(opts?: { genome?: string }): Promise<Avatar[]> {
    const qs = opts?.genome ? `?genome=${encodeURIComponent(opts.genome)}` : '';
    const res = await apiFetch(`${AVATARS}${qs}`);
    if (!res.ok) return [];
    return unwrap<Avatar>(await res.json());
}

export async function getAvatar(id: string): Promise<Avatar | null> {
    const res = await apiFetch(`${AVATARS}${encodeURIComponent(id)}/`);
    if (!res.ok) return null;
    return res.json();
}

export interface AvatarCreateInput {
    name: string;
    description?: string;
    display: AvatarDisplayId;
    url?: string;
    emoji?: string;
    tint_color?: string;
    genome?: string;
    /** Only honored when display=FILE. Triggers a multipart POST. */
    image?: File;
}

/**
 * Create an Avatar. The backend accepts JSON for GENERATED/URL/EMOJI rows
 * and multipart for FILE rows that ship bytes. Use this helper instead
 * of hand-rolling FormData — it picks the right content type for you.
 */
export async function createAvatar(input: AvatarCreateInput): Promise<Avatar> {
    if (input.display === AVATAR_DISPLAY.FILE && input.image) {
        const fd = new FormData();
        fd.set('name', input.name);
        if (input.description !== undefined) fd.set('description', input.description);
        fd.set('display_id', String(input.display));
        if (input.genome) fd.set('genome', input.genome);
        fd.set('image', input.image);
        const res = await apiFetch(AVATARS, { method: 'POST', body: fd });
        if (!res.ok) throw new AvatarApiError(res.status, await res.json().catch(() => ({})));
        return res.json();
    }

    const body: Record<string, unknown> = {
        name: input.name,
        display_id: input.display,
    };
    if (input.description !== undefined) body.description = input.description;
    if (input.url !== undefined) body.url = input.url;
    if (input.emoji !== undefined) body.emoji = input.emoji;
    if (input.tint_color !== undefined) body.tint_color = input.tint_color;
    if (input.genome !== undefined) body.genome = input.genome;

    const res = await apiFetch(AVATARS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new AvatarApiError(res.status, await res.json().catch(() => ({})));
    return res.json();
}

export interface AvatarPatchInput {
    name?: string;
    description?: string;
    display?: AvatarDisplayId;
    url?: string;
    emoji?: string;
    tint_color?: string;
    /** Re-upload bytes (must be a FILE-display row to take effect). */
    image?: File;
}

export async function patchAvatar(id: string, input: AvatarPatchInput): Promise<Avatar> {
    if (input.image) {
        const fd = new FormData();
        if (input.name !== undefined) fd.set('name', input.name);
        if (input.description !== undefined) fd.set('description', input.description);
        if (input.display !== undefined) fd.set('display_id', String(input.display));
        if (input.url !== undefined) fd.set('url', input.url);
        if (input.emoji !== undefined) fd.set('emoji', input.emoji);
        if (input.tint_color !== undefined) fd.set('tint_color', input.tint_color);
        fd.set('image', input.image);
        const res = await apiFetch(`${AVATARS}${encodeURIComponent(id)}/`, {
            method: 'PATCH',
            body: fd,
        });
        if (!res.ok) throw new AvatarApiError(res.status, await res.json().catch(() => ({})));
        return res.json();
    }

    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.display !== undefined) body.display_id = input.display;
    if (input.url !== undefined) body.url = input.url;
    if (input.emoji !== undefined) body.emoji = input.emoji;
    if (input.tint_color !== undefined) body.tint_color = input.tint_color;

    const res = await apiFetch(`${AVATARS}${encodeURIComponent(id)}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new AvatarApiError(res.status, await res.json().catch(() => ({})));
    return res.json();
}

/**
 * Promote an avatar to a different bundle. Backend physically moves
 * stored bytes for FILE-display rows and returns
 * `restart_imminent: true` because workers need to reload. Caller
 * should pipe the response through `maybeFlagRestart`.
 */
export async function patchAvatarGenome(
    id: string,
    genomeId: string,
): Promise<Avatar & { restart_imminent?: boolean }> {
    const res = await apiFetch(`${AVATARS}${encodeURIComponent(id)}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ genome: genomeId }),
    });
    if (!res.ok) throw new AvatarApiError(res.status, await res.json().catch(() => ({})));
    return res.json();
}

export async function deleteAvatar(id: string): Promise<void> {
    const res = await apiFetch(`${AVATARS}${encodeURIComponent(id)}/`, {
        method: 'DELETE',
    });
    if (!res.ok && res.status !== 204) {
        throw new AvatarApiError(res.status, await res.json().catch(() => ({})));
    }
}

export async function listAvatarDisplayTypes(): Promise<AvatarDisplay[]> {
    const res = await apiFetch(AVATAR_DISPLAY_TYPES);
    if (!res.ok) return [];
    return unwrap<AvatarDisplay>(await res.json());
}

export function avatarMediaUrl(avatar: Pick<Avatar, 'genome_slug' | 'stored_filename'>): string | null {
    if (!avatar.genome_slug || !avatar.stored_filename) return null;
    return `/api/v2/genomes/${encodeURIComponent(avatar.genome_slug)}/media/${encodeURIComponent(avatar.stored_filename)}`;
}

export class AvatarApiError extends Error {
    status: number;
    detail: string;
    payload: Record<string, unknown>;

    constructor(status: number, payload: Record<string, unknown>) {
        const detail = typeof payload.detail === 'string'
            ? payload.detail
            : `Avatar API error (${status})`;
        super(detail);
        this.name = 'AvatarApiError';
        this.status = status;
        this.detail = detail;
        this.payload = payload;
    }
}

// The backend tags human messages in swarm_message_queue with a `<<h>>\n`
// prefix so the river_of_six addon can distinguish them from addon-injected
// user messages (prompt_addon, etc.). See `river_of_six_addon.py` and
// `frontal_lobe.py` in the API repo.
//
// The tag is a backend routing marker, not display content. Strip it before
// rendering any chat message to the user.

export const HUMAN_TAG = '<<h>>';

/**
 * Remove the human-message tag prefix from a raw message string.
 *
 * Strips a single leading `<<h>>` plus an optional following newline, which
 * is exactly how `_build_turn_payload` injects it. Internal occurrences of
 * the literal `<<h>>` (unlikely, but possible in user-authored text) are
 * left alone.
 */
export function stripHumanTag(text: string): string {
    if (!text) return text;
    if (text.startsWith(HUMAN_TAG + '\n')) {
        return text.slice(HUMAN_TAG.length + 1);
    }
    if (text.startsWith(HUMAN_TAG)) {
        return text.slice(HUMAN_TAG.length);
    }
    return text;
}

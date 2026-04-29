import { describe, it, expect } from 'vitest';
import { HUMAN_TAG, stripHumanTag } from './humanTag';

describe('stripHumanTag', () => {
    it('strips a leading <<h>>\\n prefix', () => {
        expect(stripHumanTag(`${HUMAN_TAG}\nHello`)).toBe('Hello');
    });

    it('strips a leading <<h>> with no newline', () => {
        expect(stripHumanTag(`${HUMAN_TAG}Hello`)).toBe('Hello');
    });

    it('leaves text without the tag untouched', () => {
        expect(stripHumanTag('No tag here')).toBe('No tag here');
    });

    it('leaves internal <<h>> occurrences alone', () => {
        expect(stripHumanTag(`prefix ${HUMAN_TAG} body`)).toBe(`prefix ${HUMAN_TAG} body`);
    });

    it('handles empty / falsy input', () => {
        expect(stripHumanTag('')).toBe('');
    });
});

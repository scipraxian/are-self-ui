import { describe, it, expect } from 'vitest';
import {
    SIZE_MIN,
    SIZE_MAX,
    digestElapsedMs,
    elapsedToRatio,
    isInFlight,
    parseDelta,
} from './reasoningGraphHelpers';
import type { ReasoningTurnDigest } from '../types';

const baseDigest = (overrides: Partial<ReasoningTurnDigest> = {}): ReasoningTurnDigest => ({
    turn_id: 't1',
    session_id: 's1',
    turn_number: 1,
    status_name: 'Completed',
    model_name: 'qwen2.5:14b',
    tokens_in: 100,
    tokens_out: 200,
    excerpt: '',
    tool_calls_summary: [],
    engram_ids: [],
    created: null,
    modified: null,
    ...overrides,
});

describe('parseDelta', () => {
    it('returns 0 for null/undefined/empty', () => {
        expect(parseDelta(null)).toBe(0);
        expect(parseDelta(undefined)).toBe(0);
        expect(parseDelta('')).toBe(0);
    });

    it('parses HH:MM:SS.frac', () => {
        expect(parseDelta('0:00:01.500')).toBe(1500);
        expect(parseDelta('0:00:23.456789')).toBeCloseTo(23456.789);
        expect(parseDelta('1:00:00')).toBe(3600000);
        expect(parseDelta('0:30:00')).toBe(1800000);
    });

    it('parses [D ]HH:MM:SS', () => {
        expect(parseDelta('1 00:00:00')).toBe(86400000);
        expect(parseDelta('2 01:00:00')).toBe(86400000 * 2 + 3600000);
    });

    it('treats numeric strings as seconds', () => {
        expect(parseDelta('2.5')).toBe(2500);
    });

    it('returns 0 for unparseable strings', () => {
        expect(parseDelta('not a duration')).toBe(0);
    });
});

describe('digestElapsedMs', () => {
    it('uses delta when present', () => {
        expect(digestElapsedMs(baseDigest({ delta: '0:00:02.500' }))).toBe(2500);
    });

    it('falls back to created/modified differential', () => {
        const start = '2026-04-28T12:00:00.000Z';
        const end = '2026-04-28T12:00:01.000Z';
        expect(digestElapsedMs(baseDigest({ created: start, modified: end }))).toBe(1000);
    });

    it('returns 0 with no signal', () => {
        expect(digestElapsedMs(baseDigest())).toBe(0);
    });
});

describe('isInFlight', () => {
    it('matches the in-flight set exactly', () => {
        expect(isInFlight('Active')).toBe(true);
        expect(isInFlight('Pending')).toBe(true);
        expect(isInFlight('Paused')).toBe(true);
        expect(isInFlight('Attention Required')).toBe(true);
    });

    it('rejects terminal states', () => {
        expect(isInFlight('Completed')).toBe(false);
        expect(isInFlight('Error')).toBe(false);
        expect(isInFlight('Stopped')).toBe(false);
        expect(isInFlight('Maxed Out')).toBe(false);
    });

    it('rejects empty / unknown', () => {
        expect(isInFlight(undefined)).toBe(false);
        expect(isInFlight(null)).toBe(false);
        expect(isInFlight('')).toBe(false);
        expect(isInFlight('Bogus')).toBe(false);
    });
});

describe('elapsedToRatio', () => {
    it('returns 1 when mean is 0', () => {
        expect(elapsedToRatio(1234, 0)).toBe(1);
    });

    it('clamps below SIZE_MIN', () => {
        const r = elapsedToRatio(10, 1000);
        expect(r).toBe(SIZE_MIN);
    });

    it('clamps above SIZE_MAX', () => {
        const r = elapsedToRatio(100000, 1000);
        expect(r).toBe(SIZE_MAX);
    });

    it('passes through within range', () => {
        const r = elapsedToRatio(2000, 1000);
        expect(r).toBeCloseTo(2.0);
    });
});

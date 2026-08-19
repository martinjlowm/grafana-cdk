import { describe, expect, it } from 'bun:test';

import {
  type RelativeTime,
  type RelativeTimeString,
  TimeRange,
  absoluteTime,
  isRelativeTime,
  parseRelativeTime,
  resolveTimeBoundary,
} from '#@/time-range.js';

describe('relative markup', () => {
  it.each<[string, RelativeTime]>([
    ['now', { amount: 0, unit: undefined, snapTo: undefined }],
    ['now-6h', { amount: -6, unit: 'h', snapTo: undefined }],
    ['now+2d', { amount: 2, unit: 'd', snapTo: undefined }],
    ['now/d', { amount: 0, unit: undefined, snapTo: 'd' }],
    ['now-1M/M', { amount: -1, unit: 'M', snapTo: 'M' }],
    ['now-5d/d', { amount: -5, unit: 'd', snapTo: 'd' }],
  ])('parses %s', (value, expected) => {
    expect(parseRelativeTime(value)).toEqual(expected);
  });

  it.each([
    // The mistakes the template literal type cannot catch on a computed string.
    'now-6H',
    'now-6hh',
    'now - 6h',
    '6h',
    'now-6',
    'now/D',
    'yesterday',
    '',
  ])('rejects %p', (value) => {
    expect(isRelativeTime(value)).toBe(false);
    expect(parseRelativeTime(value)).toBeUndefined();
  });
});

describe('resolution', () => {
  const now = new Date('2026-03-17T14:32:45.123Z');

  it('subtracts fixed units', () => {
    expect(resolveTimeBoundary('now-6h', now, 'from').toISOString()).toBe('2026-03-17T08:32:45.123Z');
  });

  it('uses calendar arithmetic for months, not 30 days', () => {
    // 2026-03-17 minus one month is February, not 30 days earlier (which would
    // land on 2026-02-15).
    expect(resolveTimeBoundary('now-1M', now, 'from').toISOString()).toBe('2026-02-17T14:32:45.123Z');
  });

  it('snaps a `from` to the start of the unit', () => {
    expect(resolveTimeBoundary('now/d', now, 'from').toISOString()).toBe('2026-03-17T00:00:00.000Z');
  });

  it('snaps a `to` to the end of the unit', () => {
    expect(resolveTimeBoundary('now/d', now, 'to').toISOString()).toBe('2026-03-17T23:59:59.999Z');
  });

  it('resolves the whole of last month from a single marker on both ends', () => {
    // `{from: 'now-1M/M', to: 'now-1M/M'}` is Grafana's own "previous month"
    // preset: identical markup, opposite snapping.
    expect(resolveTimeBoundary('now-1M/M', now, 'from').toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(resolveTimeBoundary('now-1M/M', now, 'to').toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  it('snaps weeks to Monday', () => {
    // 2026-03-17 is a Tuesday.
    expect(resolveTimeBoundary('now/w', now, 'from').toISOString()).toBe('2026-03-16T00:00:00.000Z');
  });

  it('accepts absolute instants', () => {
    expect(resolveTimeBoundary(absoluteTime('2020-07-10T08:00:00Z'), now, 'from').toISOString()).toBe(
      '2020-07-10T08:00:00.000Z',
    );
    expect(resolveTimeBoundary(new Date(0), now, 'from').getTime()).toBe(0);
    expect(resolveTimeBoundary(1_600_000_000_000, now, 'from').getTime()).toBe(1_600_000_000_000);
  });

  it('rejects a string that is neither relative markup nor an instant', () => {
    expect(() => resolveTimeBoundary('last tuesday' as RelativeTimeString, now, 'from')).toThrow(
      /Not a valid time boundary/,
    );
  });
});

describe('absoluteTime', () => {
  it('normalises to UTC ISO 8601', () => {
    // `String(...)` sheds the nominal brand so the expectation can be a literal.
    expect(String(absoluteTime('2020-07-10T10:00:00+02:00'))).toBe('2020-07-10T08:00:00.000Z');
    expect(String(absoluteTime(new Date(0)))).toBe('1970-01-01T00:00:00.000Z');
  });

  it('rejects a value that is not an instant', () => {
    expect(() => absoluteTime('yesterday')).toThrow(TypeError);
  });
});

describe('TimeRange', () => {
  it('keeps relative markup verbatim', () => {
    expect(TimeRange.of({ from: 'now-30m', to: 'now' }).toJSON()).toEqual({ from: 'now-30m', to: 'now' });
  });

  it('renders Dates as ISO instants', () => {
    const range = TimeRange.of({ from: new Date('2020-07-10T08:00:00Z'), to: new Date('2020-07-10T14:00:00Z') });

    expect(range.toJSON()).toEqual({ from: '2020-07-10T08:00:00.000Z', to: '2020-07-10T14:00:00.000Z' });
  });

  it('accepts a mixed relative/absolute range', () => {
    expect(TimeRange.of({ from: absoluteTime('2020-01-01T00:00:00Z'), to: 'now' }).toJSON()).toEqual({
      from: '2020-01-01T00:00:00.000Z',
      to: 'now',
    });
  });

  it('accepts last month, where both ends carry the same markup', () => {
    expect(TimeRange.lastMonth().toJSON()).toEqual({ from: 'now-1M/M', to: 'now-1M/M' });
  });

  it('rejects a range that ends before it starts', () => {
    expect(() => TimeRange.of({ from: 'now', to: 'now-6h' })).toThrow(RangeError);
    expect(() =>
      TimeRange.of({ from: new Date('2020-07-10T14:00:00Z'), to: new Date('2020-07-10T08:00:00Z') }),
    ).toThrow(RangeError);
  });
});

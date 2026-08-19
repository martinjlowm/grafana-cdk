# How to set time ranges

Grafana puts two different things in the same string-typed field: its own
relative markup, and an absolute ISO 8601 instant. This package types both.

## Relative markup

`now`, optionally offset, optionally snapped:

```typescript
time: { from: 'now-24h', to: 'now' }
time: { from: 'now/d',   to: 'now' }      // today so far
time: { from: 'now-7d/d', to: 'now-1d/d' } // the last seven complete days
```

The grammar is `now`, then an optional `(+|-)<amount><unit>`, then an optional
`/<unit>`. Units are `s m h d w M y` — note that `m` is minutes and `M` is
months.

This is a template literal type, so `now-6H`, `now-6hh`, `now - 6h` and `6h` are
all compile errors on a literal. For a string computed at runtime, use
`isRelativeTime()`; every constructor in this package runs it anyway.

## Snapping, and why `now-1M/M` on both ends is a range

A snapped `from` resolves to the *start* of its unit and a snapped `to` to the
*end*. So Grafana's "previous month" preset is the same markup on both sides:

```typescript
time: { from: 'now-1M/M', to: 'now-1M/M' }
```

which resolves to `2026-02-01T00:00:00.000Z` → `2026-02-28T23:59:59.999Z`. If
the two ends resolved identically the range would be zero-width, which is why
the validation models the edges rather than just parsing the string.

Month and year arithmetic is calendar arithmetic, not 30-day multiples: from
17 March, `now-1M` is 17 February. Weeks snap to Monday.

## Absolute instants

Pass a `Date`, epoch milliseconds, or `absoluteTime('…')` for a string. The
brand on `absoluteTime`'s return type is what keeps
`RelativeTimeString | AbsoluteTimeString` from collapsing to `string` and losing
every check above.

```typescript
time: {
  from: new Date('2026-03-17T08:00:00Z'),
  to: absoluteTime('2026-03-17T14:00:00Z'),
}
```

The two forms mix freely: `{from: absoluteTime('2020-01-01T00:00:00Z'), to: 'now'}`
is a valid range.

## Per-panel overrides

`timeFrom` and `timeShift` accept relative markup *or* a bare interval, because
Grafana accepts both:

```typescript
new StatPanel(dashboard, 'yesterday', { gridPos: { w: 6, h: 4 }, timeShift: '24h' })
```

## Checking a range before it ships

A range whose end precedes its start throws at construction — including the
absolute case, and including relative markers once resolved. To inspect one:

```typescript
TimeRange.of({ from: 'now-1M/M', to: 'now-1M/M' }).resolve(new Date('2026-03-17T14:32:45Z'));
// {from: 2026-02-01T00:00:00.000Z, to: 2026-02-28T23:59:59.999Z}
```

## All together

```typescript
import { App, Dashboard, StatPanel, TimeRange, absoluteTime } from '@martinjlowm/grafana-cdk';

const app = new App();

// Relative markup, checked at compile time.
const rolling = new Dashboard(app, 'rolling', {
  title: 'Rolling',
  uid: 'rolling-0001',
  time: { from: 'now-24h', to: 'now' },
});

// Snapped: `now-1M/M` on both ends is Grafana's "previous month" — the two ends
// snap in opposite directions, so this is a whole month, not an instant.
const lastMonth = new Dashboard(app, 'last-month', {
  title: 'Last month',
  uid: 'lastmonth-01',
  time: { from: 'now-1M/M', to: 'now-1M/M' },
});

// Absolute: Date, epoch milliseconds, or absoluteTime('…') for an ISO string.
const incident = new Dashboard(app, 'incident', {
  title: 'Incident review',
  uid: 'incident-001',
  time: {
    from: new Date('2026-03-17T08:00:00Z'),
    to: absoluteTime('2026-03-17T14:00:00Z'),
  },
});

// Per-panel overrides accept relative markup or a bare interval.
incident.addPanel(
  new StatPanel(incident, 'yesterday', {
    title: 'Same window yesterday',
    gridPos: { w: 6, h: 4 },
    timeShift: '24h',
  }),
);

// Ranges resolve, so you can check them before they reach Grafana.
export const resolved = TimeRange.of({ from: 'now-1M/M', to: 'now-1M/M' }).resolve(new Date('2026-03-17T14:32:45Z'));
// {from: 2026-02-01T00:00:00.000Z, to: 2026-02-28T23:59:59.999Z}

export const dashboards = [rolling, lastMonth, incident];
```

## Intervals

`refresh`, `interval` and `timepicker.refresh_intervals` take an interval
string, not a time boundary: `30s`, `5m`, `1h`. `isDuration()` and
`durationToMilliseconds()` are available for the same reasons as their
relative-time counterparts.

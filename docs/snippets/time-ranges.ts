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

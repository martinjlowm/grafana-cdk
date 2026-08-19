# How to lay out panels on the grid

Grafana lays panels out on a fixed 24-column grid; a row is 30 pixels tall.

## Let the dashboard place panels

Omit `x` and `y`. Panels flow left to right in the order they are added, and
wrap when the next one will not fit in the remaining columns. A new line starts
below the *tallest* panel on the previous one.

```typescript
dashboard.addPanel(new StatPanel(dashboard, 'requests', { gridPos: { w: 8, h: 4 } }));
dashboard.addPanel(new StatPanel(dashboard, 'errors', { gridPos: { w: 8, h: 4 } }));
dashboard.addPanel(new StatPanel(dashboard, 'latency', { gridPos: { w: 8, h: 4 } }));
```

## Pin a panel

Give both `x` and `y`. A pinned panel is left exactly where you put it and does
not move the flow cursor, so panels around it keep their reading order.

```typescript
dashboard.addPanel(new StatPanel(dashboard, 'pinned', { gridPos: { x: 0, y: 14, w: 4, h: 4 } }));
```

Pinned and flowed panels share one coordinate space, so the overlap check sees
both. Mixing them is fine; forgetting that you did is what the check is for.

## Break a dashboard into sections

A `RowPanel` is a full-width header. Because it spans all 24 columns, whatever
follows necessarily starts a new line.

```typescript
dashboard.addPanel(new RowPanel(dashboard, 'detail-row', { title: 'Detail' }));
```

Rows have no `gridPos` prop — they are always full width and one row tall, and
Grafana ignores anything else.

Add `collapsed: true` and a `panels` array to ship the row closed. A collapsed
row carries its panels inline; an expanded one leaves them in the dashboard's
own list. The construct emits whichever form matches, so you do not have to
remember which.

## All together

```typescript
import { App, Dashboard, RowPanel, StatPanel, TimeSeriesPanel } from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'layout', { title: 'Layout', uid: 'layout-0001' });

// Flowed: no x/y, so these three fill the first line left to right.
for (const [index, name] of ['Requests', 'Errors', 'Latency'].entries()) {
  dashboard.addPanel(new StatPanel(dashboard, `stat-${index}`, { title: name, gridPos: { w: 8, h: 4 } }));
}

// A row is always full width, so whatever follows starts a new line.
dashboard.addPanel(new RowPanel(dashboard, 'detail-row', { title: 'Detail' }));

dashboard.addPanel(new TimeSeriesPanel(dashboard, 'trend', { title: 'Trend', gridPos: { w: 24, h: 8 } }));

// Pinned: kept exactly here, and checked against the flowed panels for overlap.
dashboard.addPanel(new StatPanel(dashboard, 'pinned', { title: 'Pinned', gridPos: { x: 0, y: 14, w: 4, h: 4 } }));

export const positions = dashboard.toJSON().panels?.map((panel) => panel.gridPos);
// [{x: 0, y: 0, w: 8, h: 4}, {x: 8, y: 0, …}, {x: 16, y: 0, …},
//  {x: 0, y: 4, w: 24, h: 1},          <- the row
//  {x: 0, y: 5, w: 24, h: 8},          <- the time series
//  {x: 0, y: 14, w: 4, h: 4}]          <- the pinned stat
```

## What gets rejected

`App.synth()` — and `App.validate()`, if you want the errors without writing
anything — reports:

| Problem | Message |
| --- | --- |
| `x` outside 0–23, `y` below 0 | `gridPos.x must be between 0 and 23, got …` |
| `w` outside 1–24, `h` below 1 | `gridPos.w must be between 1 and 24, got …` |
| Non-integer coordinates | `gridPos.w must be an integer, got …` |
| A panel running off the right edge | `gridPos.x + gridPos.w must not exceed 24 columns, got 20 + 8 = 28` |
| Two panels covering the same cells | `panels [a] and [b] overlap: {x: 0, …} intersects {x: 6, …}` |

Panels that merely touch — one ending at column 12 and the next starting there —
are not overlapping.

## Panel ids

Grafana requires panel ids to be unique within a dashboard. Leave `id` off and
the dashboard assigns one, starting above the highest id you set explicitly, so
automatic and manual ids never collide. Two panels pinned to the same id are
reported.

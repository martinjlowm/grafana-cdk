# How to lay out panels on the grid

Grafana lays panels out on a fixed 24-column grid; a row is 30 pixels tall.

There are three ways to place a panel, in increasing order of control: let the
dashboard flow it, allocate it from a `Grid`, or pin `x` and `y` yourself.

## Let the dashboard place panels

Omit `x` and `y`. Panels flow left to right in the order they are added, and
wrap when the next one will not fit in the remaining columns. A new line starts
below the *tallest* panel on the previous one.

```typescript
dashboard.addPanel(new StatPanel(dashboard, 'requests', { gridPos: { w: 8, h: 4 } }));
dashboard.addPanel(new StatPanel(dashboard, 'errors', { gridPos: { w: 8, h: 4 } }));
dashboard.addPanel(new StatPanel(dashboard, 'latency', { gridPos: { w: 8, h: 4 } }));
```

## Allocate space with a `Grid`

Flow handles a dashboard that reads top to bottom in equal blocks. It cannot say
"this chart takes two thirds of the row and these stats share the rest" — for
that, describe the split and let a `Grid` hand back the areas.

```typescript
const grid = new Grid();

const [a, b, c] = grid.row(4, 3);                                // three equal columns
const { chart, side } = grid.row(10, { chart: 'two-thirds', side: 'third' });
const [inventory, notes] = grid.row(8, [16, 'auto']);            // 16 columns, then the rest
```

Each call takes the next band of rows and returns the areas it was split into,
so the source reads top to bottom the way the dashboard does. A `GridArea`
already satisfies `gridPos`:

```typescript
dashboard.addPanel(new TimeSeriesPanel(dashboard, 'trend', { title: 'Trend', gridPos: chart }));
```

### Spans

| Span | Means |
| --- | --- |
| `8` | Exactly 8 columns. |
| `'half'`, `'third'`, `'two-thirds'`, `'quarter'`, `'three-quarters'`, `'full'` | A share of what the row offers. |
| `'2/3'`, `'1/5'` | The same, as an arbitrary fraction. |
| `'auto'` | An equal share of whatever the other spans left over. |

Passing a count instead of an array — `grid.row(4, 3)` — is shorthand for three
`'auto'` cells.

Fractions rarely divide 24 evenly, so the widths are apportioned by largest
remainder: `['1/5', '1/5', '1/5', '1/5', '1/5']` becomes `5, 5, 5, 5, 4` rather
than five 5s (an overflow) or five 4s (a four-column hole). Spans that do not
fill the row simply leave the rest empty; spans that overflow it throw.

### Subdividing

Areas divide further, so a column can be stacked without recomputing anything:

```typescript
const [byRegion, byVersion] = side.rows(['half', 'half']);
const [left, right] = byRegion.columns(2);
```

`rows()` takes the same spans as `columns()`, measured against the area's height.

### Section headers and gaps

`grid.header()` reserves the single row a `RowPanel` occupies and returns its
`y`; `grid.skip(rows)` leaves a gap; `grid.seek(y)` rewinds the cursor to lay a
region out again. `grid.y` is where the next allocation will start.

```typescript
dashboard.addPanel(new RowPanel(dashboard, 'detail-row', { title: 'Detail', y: grid.header() }));
```

### A grid over part of the dashboard

`new Grid({ x, columns, y })` plans a region rather than the whole width — useful
for filling space some other layout already allocated.

```typescript
const sidebar = new Grid({ x: 16, columns: 8, y: 5 });
```

Grid areas carry concrete coordinates, so panels placed from one are pinned.
Mixing a grid with flowed panels on the same dashboard is allowed, and the
overlap check is what keeps the two honest.

### A whole dashboard from one grid

```typescript
$embed: ../snippets/grid.ts$
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

## Flow, pinning and rows together

```typescript
$embed: ../snippets/layout.ts$
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

A `Grid` rejects its own mistakes eagerly, at the call that made them, since a
bad split is a programming error rather than a dashboard-level constraint: spans
totalling more than the available space, a split too fine to give every cell a
column, a malformed span, or a grid that starts past column 24.

## Panel ids

Grafana requires panel ids to be unique within a dashboard. Leave `id` off and
the dashboard assigns one, starting above the highest id you set explicitly, so
automatic and manual ids never collide. Two panels pinned to the same id are
reported.

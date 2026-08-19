# Tutorial: build your first dashboard

By the end of this page you will have written a dashboard in TypeScript,
synthesized it to JSON, and imported it into Grafana. It takes about ten
minutes. You do not need to know the Grafana dashboard schema — that is what
this package is for.

We will build an API latency dashboard with two panels: a stat showing the
current p99, and a time series showing how it moved.

## Before you start

You need Node 24 or newer and a package manager. Everything below is plain
TypeScript run as a script, so any runner works — `bun`, `tsx`, or `tsc` then
`node`.

## 1. Install the package

```bash
$embed: ./snippets/install-package.sh$
```

## 2. Create the app and a dashboard

An `App` is the root of the tree and the thing that writes files. A `Dashboard`
hangs off it.

```typescript
import { App, Dashboard } from '@martinjlowm/grafana-cdk';

const app = new App({ outdir: 'dashboards' });

const dashboard = new Dashboard(app, 'api-latency', {
  title: 'API latency',
  uid: 'api-latency-1',
  time: { from: 'now-6h', to: 'now' },
  refresh: '5m',
});
```

Three things are already being checked. `uid` must be 8–40 characters, because
Grafana rejects anything else. `time` must be Grafana relative markup or a real
instant — `now-6h` compiles, `now-6H` does not. And `refresh` must be an
interval, so `5m` compiles and `5 minutes` does not.

## 3. Add a data source and some queries

Queries are created *from* their data source rather than constructed
independently. That is deliberate: a Grafana panel repeats its data source
reference on the panel and again on every query, and creating them this way
means those copies cannot disagree.

```typescript
import { CloudWatchDataSource } from '@martinjlowm/grafana-cdk';

const cloudwatch = new CloudWatchDataSource(app, '<datasource-uid>');

const edge = cloudwatch.createTarget('edge-latency', {
  refId: 'A',
  namespace: 'AWS/ApiGateway',
  metricName: 'Latency',
  dimensions: { ApiName: 'prod-gateway' },
  statistic: 'p99',
  period: '5m',
});
```

`<datasource-uid>` is the uid of a data source already provisioned in your
Grafana instance — this package describes dashboards, not data sources.

## 4. Combine queries with an expression

Grafana's server-side expressions are a data source of their own, addressing
other queries by their `refId`. Rather than writing `$A` by hand, ask the target
for its reference:

```typescript
import { ExpressionDataSource } from '@martinjlowm/grafana-cdk';

const expression = new ExpressionDataSource(app);
const worst = expression.createTarget('worst', {
  refId: 'C',
  expression: `max(${edge.asRef()}, ${regional.asRef()})`,
});
```

## 5. Add the panels

Each bundled Grafana visualisation has its own construct, so the plugin's
options are checked. `gridPos` omits `x` and `y`: the dashboard flows panels
left to right in the order you add them, wrapping at the 24-column grid edge.

```typescript
dashboard.addPanel(
  new StatPanel(dashboard, 'current-p99', {
    title: 'Current p99',
    datasource: cloudwatch,
    gridPos: { w: 6, h: 4 },
    targets: [edge, regional, worst],
    options: {
      colorMode: BigValueColorMode.Value,
      reduceOptions: { calcs: ['lastNotNull'], values: false },
    },
    fieldConfig: {
      unit: 'ms',
      thresholds: thresholds({ steps: [{ color: 'red', value: 5000 }] }),
    },
  }),
);
```

`thresholds()` adds the base step Grafana requires — the schema says the first
entry must have `value: null` — so you only list the steps you care about.

## 6. Synthesize

```typescript
app.synth();
```

This validates the whole tree first: grid bounds, panels that overlap, duplicate
query `refId`s, duplicate panel ids, duplicate variable names. If anything
fails, nothing is written — you never get a half-emitted directory that the next
deploy picks up.

## The whole thing

```typescript
$embed: ./snippets/tutorial-dashboard.ts$
```

Run it, and `dashboards/api-latency-1.json` appears. Files are named by `uid`
rather than title, because titles are neither unique nor free of `/`.

## 7. Import it

In Grafana, **Dashboards → New → Import**, and paste the file. Or, more usefully,
commit the synthesized JSON and have your provisioning pipeline push it.

## Where to go next

- [Lay out panels on the grid](how-to/lay-out-panels.md) once you have more than
  a handful.
- [Add template variables](how-to/add-template-variables.md) to make one
  dashboard serve every environment.
- [Design notes](explanation.md) if you want to know why any of the above is
  shaped the way it is.

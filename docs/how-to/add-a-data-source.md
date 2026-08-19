# How to add a data source this package does not ship

This package ships constructs for Grafana's built-in data source, server-side
expressions, Amazon CloudWatch and Amazon Athena. Every other plugin defines its
own query shape, and Grafana types `Panel.targets` as
`Array<Record<string, unknown>>` — so a new data source means writing the shape
down once.

It takes two classes.

## 1. The target

Subclass `DataSourceTarget`. `base()` supplies `refId`, `datasource` and `hide`;
everything after it is the plugin's own shape.

```typescript
export class PrometheusTarget extends DataSourceTarget {
  public readonly expr: string;

  constructor(scope: PrometheusDataSource, id: string, props: PrometheusTargetProps) {
    super(scope, id, { hide: props.hide, refId: props.refId });
    this.expr = props.expr;
  }

  public override toJSON(): Record<string, unknown> {
    return { ...this.base(), expr: this.expr };
  }
}
```

Put the plugin's own preconditions in the constructor. An empty PromQL
expression, an Athena `resultReuseMaxAgeInMinutes` above 10080, a CloudWatch
metric-math id that does not start with a lowercase letter — each is a query the
backend rejects, and a panel that renders empty with no explanation.

## 2. The data source

Subclass `DataSource` with the plugin type id, and add a `createTarget` factory.

```typescript
export class PrometheusDataSource extends DataSource {
  constructor(scope: Construct, uid: string, id = 'prometheus-data-source') {
    super(scope, id, { type: 'prometheus', uid });
  }

  public createTarget(id: string, props: PrometheusTargetProps): PrometheusTarget {
    return new PrometheusTarget(this, id, props);
  }
}
```

The factory is the point of the exercise. A Grafana panel repeats its data
source reference on the panel and again on every query; creating targets through
the data source means those copies are all `asRef()` of the same object and
cannot drift apart.

The default `id` argument lets one dashboard hold several instances of the same
plugin without construct-id collisions.

## All together

```typescript
import {
  App,
  Dashboard,
  DataSource,
  DataSourceTarget,
  type DataSourceTargetProps,
  TimeSeriesPanel,
} from '@martinjlowm/grafana-cdk';
import type { Construct } from 'constructs';

// A query against the plugin. `base()` supplies refId, datasource and hide;
// everything after it is the plugin's own shape.
export interface PrometheusTargetProps extends DataSourceTargetProps {
  expr: string;
  legendFormat?: string;
  range?: boolean;
  instant?: boolean;
}

export class PrometheusTarget extends DataSourceTarget {
  public readonly expr: string;
  public readonly legendFormat?: string;
  public readonly range: boolean;
  public readonly instant: boolean;

  constructor(scope: PrometheusDataSource, id: string, props: PrometheusTargetProps) {
    super(scope, id, { hide: props.hide, refId: props.refId });

    if (!props.expr.trim()) {
      throw new SyntaxError(`Prometheus target '${id}' has no expression.`);
    }

    this.expr = props.expr;
    this.legendFormat = props.legendFormat;
    this.range = props.range ?? true;
    this.instant = props.instant ?? false;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...this.base(),
      expr: this.expr,
      range: this.range,
      instant: this.instant,
      ...(this.legendFormat === undefined ? {} : { legendFormat: this.legendFormat }),
    };
  }
}

// The data source itself: a plugin type id, an instance uid, and a factory that
// binds the target to it so the two references cannot drift apart.
export class PrometheusDataSource extends DataSource {
  constructor(scope: Construct, uid: string, id = 'prometheus-data-source') {
    super(scope, id, { type: 'prometheus', uid });
  }

  public createTarget(id: string, props: PrometheusTargetProps): PrometheusTarget {
    return new PrometheusTarget(this, id, props);
  }
}

const app = new App();
const dashboard = new Dashboard(app, 'prometheus', { title: 'Prometheus', uid: 'prometheus-1' });
const prometheus = new PrometheusDataSource(app, '<datasource-uid>');

dashboard.addPanel(
  new TimeSeriesPanel(dashboard, 'request-rate', {
    title: 'Request rate',
    datasource: prometheus,
    gridPos: { w: 12, h: 8 },
    targets: [
      prometheus.createTarget('rate', {
        refId: 'A',
        expr: 'sum(rate(http_requests_total[5m])) by (status)',
        legendFormat: '{{status}}',
      }),
    ],
  }),
);
```

## Typed panel options for an unbundled visualisation

Panel plugins are the same story. `Panel` is generic over the plugin's `options`
and its `fieldConfig.custom`, so a plugin gets a typed construct in three lines:

```typescript
export class MyPluginPanel extends Panel<MyPluginOptions, MyPluginFieldConfig> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<MyPluginOptions, MyPluginFieldConfig>) {
    super(scope, id, { ...props, type: 'my-org-my-plugin-panel' });
  }
}
```

Or skip it and use `Panel` directly with `type` and an untyped `options` — the
base class stays open for exactly that.

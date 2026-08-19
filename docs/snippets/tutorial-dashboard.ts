import {
  App,
  BigValueColorMode,
  CloudWatchDataSource,
  Dashboard,
  ExpressionDataSource,
  StatPanel,
  TimeSeriesPanel,
  thresholds,
} from '@martinjlowm/grafana-cdk';

const app = new App({ outdir: 'dashboards' });

const dashboard = new Dashboard(app, 'api-latency', {
  title: 'API latency',
  uid: 'api-latency-1',
  time: { from: 'now-6h', to: 'now' },
  refresh: '5m',
});

const cloudwatch = new CloudWatchDataSource(app, '<datasource-uid>');

const edge = cloudwatch.createTarget('edge-latency', {
  refId: 'A',
  namespace: 'AWS/ApiGateway',
  metricName: 'Latency',
  dimensions: { ApiName: 'prod-gateway' },
  statistic: 'p99',
  period: '5m',
});

const regional = cloudwatch.createTarget('regional-latency', {
  refId: 'B',
  namespace: 'AWS/ApiGateway',
  metricName: 'Latency',
  dimensions: { ApiName: 'prod-gateway-regional' },
  statistic: 'p99',
  period: '5m',
});

const expression = new ExpressionDataSource(app);
const worst = expression.createTarget('worst', {
  refId: 'C',
  // `asRef()` produces the `$A` / `$B` an expression addresses a query by.
  expression: `max(${edge.asRef()}, ${regional.asRef()})`,
});

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

dashboard.addPanel(
  new TimeSeriesPanel(dashboard, 'p99-over-time', {
    title: 'p99 over time',
    datasource: cloudwatch,
    gridPos: { w: 18, h: 4 },
    targets: [edge, regional],
    fieldConfig: { unit: 'ms', custom: { lineWidth: 2, fillOpacity: 10 } },
  }),
);

app.synth();

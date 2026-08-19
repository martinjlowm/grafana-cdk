import { App, CloudWatchDataSource, Dashboard, StatPanel, thresholds } from '@martinjlowm/grafana-cdk';

const app = new App({ outdir: 'dashboards' });

const dashboard = new Dashboard(app, 'api-latency', {
  title: 'API latency',
  uid: 'api-latency-1',
  time: { from: 'now-6h', to: 'now' },
});

const cloudwatch = new CloudWatchDataSource(app, '<datasource-uid>');

dashboard.addPanel(
  new StatPanel(dashboard, 'current-p99', {
    title: 'Current p99',
    datasource: cloudwatch,
    // No x/y: the dashboard flows panels in the order they are added.
    gridPos: { w: 6, h: 4 },
    targets: [
      cloudwatch.createTarget('latency', {
        refId: 'A',
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensions: { ApiName: 'prod-gateway' },
        statistic: 'p99',
        period: '5m',
      }),
    ],
    fieldConfig: { unit: 'ms', thresholds: thresholds({ steps: [{ color: 'red', value: 5000 }] }) },
  }),
);

// Validates the whole tree, then writes dashboards/api-latency-1.json.
app.synth();

import { expect, it } from 'bun:test';

import {
  App,
  BigValueColorMode,
  BigValueGraphMode,
  BigValueJustifyMode,
  BigValueTextMode,
  CloudWatchDataSource,
  Dashboard,
  ExpressionDataSource,
  StatPanel,
  VizOrientation,
  thresholds,
} from '#@/index.ts';

/**
 * The original end-to-end case: two CloudWatch metric queries combined by a
 * server-side expression and reduced to a single stat.
 */
it('renders scorecards', () => {
  const app = new App();
  const dashboard = new Dashboard(app, 'scorecards', {
    time: { from: 'now-1M/M', to: 'now-1M/M' },
    title: 'Scorecards',
    uid: 'ddtckkwkmuccgf',
  });

  const cloudwatch = new CloudWatchDataSource(app, 'ddocearsutibke');

  const gatewayLatency = cloudwatch.createTarget('gateway-latency', {
    dimensions: { ApiName: 'prod-ms-graphql-gateway' },
    metricName: 'Latency',
    namespace: 'AWS/ApiGateway',
    period: 86400,
    queryMode: 'Metrics',
    refId: 'A',
    statistic: 'p99',
  });

  const regionalGatewayLatency = cloudwatch.createTarget('regional-gateway-latency', {
    dimensions: { ApiName: 'prod-ms-graphql-gateway-regional' },
    metricName: 'Latency',
    namespace: 'AWS/ApiGateway',
    period: 86400,
    queryMode: 'Metrics',
    refId: 'B',
    statistic: 'p99',
  });

  const expression = new ExpressionDataSource(app);
  const combined = expression.createTarget('add', {
    expression: `${gatewayLatency.asRef()} + ${regionalGatewayLatency.asRef()}`,
    refId: 'C',
  });

  dashboard.addPanel(
    new StatPanel(dashboard, 'p99-api-latency', {
      title: 'API Latency P99',
      datasource: cloudwatch,
      gridPos: { h: 4, w: 4 },
      fieldConfig: {
        unit: 'ms',
        decimals: 1,
        thresholds: thresholds({ steps: [{ color: 'red', value: 5000 }] }),
      },
      options: {
        colorMode: BigValueColorMode.Value,
        graphMode: BigValueGraphMode.Area,
        justifyMode: BigValueJustifyMode.Auto,
        orientation: VizOrientation.Auto,
        reduceOptions: { calcs: [], fields: '/^Value \\(mean\\)$/', values: false },
        showPercentChange: false,
        textMode: BigValueTextMode.Auto,
        wideLayout: true,
      },
      pluginVersion: '10.4.1',
      targets: [gatewayLatency, regionalGatewayLatency, combined],
    }),
  );

  expect(dashboard.toJSONString()).toMatchSnapshot();
});

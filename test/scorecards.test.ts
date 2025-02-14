import { App, CloudWatchDataSource, Dashboard, ExpressionDataSource, Panel } from '#@/index.js';

it('renders scorecards', () => {
  const app = new App();
  const dashboard = new Dashboard(app, 'scorecards', {
    time: {
      from: 'now-1M/M',
      to: 'now-1M/M',
    },
    title: 'Scorecards',
    uid: 'ddtckkwkmuccgf',
  });

  const cloudwatch = new CloudWatchDataSource(app, 'ddocearsutibke');
  const gatewayLatencyTarget = cloudwatch.createTarget('gateway-latency', {
    dimensions: {
      ApiName: 'prod-ms-graphql-gateway',
    },
    expression: '',
    metricName: 'Latency',
    namespace: 'AWS/ApiGateway',
    period: 86400,
    queryMode: 'Metrics',
    refId: 'A',
    statistic: 'p99',
  });

  const regionalGatewayLatencyTarget = cloudwatch.createTarget('regional-gateway-latency', {
    dimensions: {
      ApiName: 'prod-ms-graphql-gateway-regional',
    },
    expression: '',
    metricName: 'Latency',
    namespace: 'AWS/ApiGateway',
    period: 86400,
    queryMode: 'Metrics',
    refId: 'B',
    statistic: 'p99',
  });

  const expression = new ExpressionDataSource(app);
  const expressionTarget = expression.createTarget('add', {
    expression: `${gatewayLatencyTarget.asRef()} + ${regionalGatewayLatencyTarget.asRef()}`,
    refId: 'C',
  });

  // options
  // targets -> datasource filters?
  dashboard.addPanel(
    new Panel(app, 'p99-api-latency', {
      title: 'API Latency P99',
      type: 'stat',
      datasource: cloudwatch,
      fieldConfig: {
        unit: 'ms',
      },
      gridPos: { h: 4, w: 4 },
      options: {
        colorMode: 'value',
        graphMode: 'area',
        justifyMode: 'auto',
        orientation: 'auto',
        reduceOptions: {
          calcs: [],
          fields: '/^Value \\(mean\\)$/',
          values: false,
        },
        showPercentChange: false,
        textMode: 'auto',
        wideLayout: true,
      },
      pluginVersion: '10.4.1',
      targets: [gatewayLatencyTarget, regionalGatewayLatencyTarget, expressionTarget],
    }),
  );

  expect(dashboard.toJSON()).toMatchSnapshot();
});

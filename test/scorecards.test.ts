import { App, CloudWatchDataSource, Dashboard, FieldColorModeId, Panel, ThresholdsMode } from '#@/index.js';

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

  dashboard.addPanel(
    new Panel(app, 'p99-api-latency', {
      title: 'API Latency P99',
      type: 'stat',
      datasource: cloudwatch,
      fieldConfig: {
        defaults: {
          color: {
            mode: FieldColorModeId.Thresholds,
          },
          decimals: 1,
          mappings: [],
          thresholds: {
            mode: ThresholdsMode.Absolute,
            steps: [
              {
                color: 'green',
                value: null,
              },
              {
                color: 'red',
                value: 5000,
              },
            ],
          },
          unit: 'ms',
        },
        overrides: [],
      },
      gridPos: {
        h: 4,
        w: 4,
        x: 0,
        y: 0,
      },
      id: 15,
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
      targets: [
        {
          accountId: 'all',
          datasource: cloudwatch,
          dimensions: {
            ApiName: 'prod-ms-graphql-gateway',
          },
          expression: '',
          id: '',
          label: '',
          logGroups: [],
          matchExact: true,
          metricEditorMode: 0,
          metricName: 'Latency',
          metricQueryType: 0,
          namespace: 'AWS/ApiGateway',
          period: '86400',
          queryMode: 'Metrics',
          refId: 'A',
          region: 'default',
          sqlExpression: '',
          statistic: 'p99',
        },
        {
          accountId: 'all',
          datasource: {
            type: 'cloudwatch',
            uid: 'ddocearsutibke',
          },
          dimensions: {
            ApiName: 'prod-ms-graphql-gateway-regional',
          },
          expression: '',
          hide: false,
          id: '',
          label: '',
          logGroups: [],
          matchExact: true,
          metricEditorMode: 0,
          metricName: 'Latency',
          metricQueryType: 0,
          namespace: 'AWS/ApiGateway',
          period: '86400',
          queryMode: 'Metrics',
          refId: 'B',
          region: 'default',
          sqlExpression: '',
          statistic: 'p99',
        },
        {
          datasource: {
            name: 'Expression',
            type: '__expr__',
            uid: '__expr__',
          },
          expression: '$A + $B',
          hide: false,
          refId: 'C',
          type: 'math',
        },
      ],
    }),
  );

  expect(dashboard.toJSON()).toMatchSnapshot();
});

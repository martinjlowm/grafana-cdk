import { App, CloudWatchDataSource, Dashboard, Panel } from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'scorecards', {
  time: {
    from: 'now-1M/M',
    to: 'now-1M/M',
  },
  title: 'Scorecards',
  uid: 'ddtckkwkmuccgf',
});

const cloudwatch = new CloudWatchDataSource(app, '<identifier>');

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

app.synth();

import {
  App,
  AthenaDataSource,
  ConstantVariable,
  CustomVariable,
  Dashboard,
  IntervalVariable,
  QueryVariable,
  TablePanel,
  VariableRefresh,
} from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'variables', { title: 'Variables', uid: 'variables-01' });
const athena = new AthenaDataSource(app, '<datasource-uid>');

// Values come from a query. Defaults to refreshing on dashboard load, because a
// query variable with no refresh and no saved options silently disappears.
const region = new QueryVariable(dashboard, 'region', {
  label: 'Region',
  datasource: athena,
  query: 'SELECT DISTINCT region FROM analytics.devices ORDER BY 1',
  includeAll: true,
  multi: true,
  refresh: VariableRefresh.onTimeRangeChanged,
});

// A fixed list. The comma-separated `query` string Grafana also stores is kept
// in step with the options array for you.
const environment = new CustomVariable(dashboard, 'environment', {
  values: ['prod', { text: 'Staging', value: 'stg' }],
});

// A hidden constant — Grafana forces these hidden, so there is no `hide` prop.
const account = new ConstantVariable(dashboard, 'account', { value: '123456789012' });

const bucket = new IntervalVariable(dashboard, 'bucket', {
  intervals: ['5m', '1h', '1d'],
  auto: true,
});

for (const variable of [region, environment, account, bucket]) {
  dashboard.addVariable(variable);
}

dashboard.addPanel(
  new TablePanel(dashboard, 'devices', {
    title: 'Devices',
    datasource: athena,
    gridPos: { w: 24, h: 10 },
    targets: [
      athena.createTarget('devices', {
        refId: 'A',
        // asRef() is `$region`; asBracedRef() is `${region}`, for when the
        // reference abuts other text.
        rawSQL: `SELECT * FROM analytics.devices
                 WHERE region IN (${region.asRef()})
                   AND environment = '${environment.asRef()}'
                   AND account = '${account.asRef()}'`,
      }),
    ],
  }),
);

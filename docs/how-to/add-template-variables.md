# How to add template variables

Grafana models all nine variable types with one flat `VariableModel`, which
means the schema will happily let you build a constant with a refresh policy.
This package gives each type its own construct carrying only the fields Grafana
reads for it.

Add them with `dashboard.addVariable(…)`.

## Values from a query

```typescript
const region = new QueryVariable(dashboard, 'region', {
  label: 'Region',
  datasource: athena,
  query: 'SELECT DISTINCT region FROM analytics.devices ORDER BY 1',
  includeAll: true,
  multi: true,
});
```

`refresh` defaults to `VariableRefresh.onDashboardLoad`. That default matters:
Grafana never persists a query variable's options, so one saved with
`refresh: never` and no options is dropped on load — which reads as the variable
silently disappearing. Set `VariableRefresh.onTimeRangeChanged` if the option
list depends on the window.

## A fixed list

```typescript
const environment = new CustomVariable(dashboard, 'environment', {
  values: ['prod', { text: 'Staging', value: 'stg' }],
});
```

Grafana stores a custom variable twice — as a comma-separated `query` string
*and* as an options array — and the construct keeps the two in step, including
the `text : value` form for entries whose label differs from their value.

## Other types

| Construct | Use |
| --- | --- |
| `ConstantVariable` | A hidden constant. Grafana forces these hidden, so there is no `hide` prop. |
| `DataSourceVariable` | Swap every panel's data source for another instance of the same plugin. |
| `IntervalVariable` | A selectable granularity, with an optional `auto` entry. |
| `TextBoxVariable` | A free-text filter. |
| `AdHocVariable` | Key/value filters applied to every query against one data source. |

## Referencing a variable

`asRef()` gives `$name`; `asBracedRef()` gives `${name}`, which you need when
the reference abuts other text.

```typescript
rawSQL: `SELECT * FROM analytics.devices WHERE region IN (${region.asRef()})`
```

Variable names are restricted to letters, digits and underscores at
construction, because those are the characters Grafana's interpolation accepts —
`my-filter` would interpolate as `$my` followed by the literal `-filter`.

Two variables sharing a name are reported by `App.validate()`.

## All together

```typescript
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
```

## Repeating panels and rows

Set `repeat` on a panel or row to the variable's *name* (not its `$` form), and
`repeatDirection` to `'h'` or `'v'`:

```typescript
new StatPanel(dashboard, 'per-region', { gridPos: { w: 6, h: 4 }, repeat: 'region' })
```

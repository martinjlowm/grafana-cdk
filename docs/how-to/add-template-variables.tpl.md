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
$embed: ../snippets/variables.ts$
```

## Repeating panels and rows

Set `repeat` on a panel or row to the variable's *name* (not its `$` form), and
`repeatDirection` to `'h'` or `'v'`:

```typescript
new StatPanel(dashboard, 'per-region', { gridPos: { w: 6, h: 4 }, repeat: 'region' })
```

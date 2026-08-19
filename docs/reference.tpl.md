# Reference

Everything exported from `@martinjlowm/grafana-cdk`. Constructs take
`(scope, id, props)` in the `constructs` convention unless noted.

## App

`new App(props?)`

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `outdir` | `string` | `'dist'` | Created if missing. |
| `fileName` | `(dashboard: Dashboard) => string` | uid, else title | Basename, without `.json`. |

| Member | Returns | Notes |
| --- | --- | --- |
| `synth()` | `void` | Validates the whole tree, then writes one file per dashboard. Throws before writing anything if validation fails, or if two dashboards would resolve to the same filename. |
| `validate()` | `string[]` | Every validation error, each prefixed with the construct's path. |
| `dashboards` | `Dashboard[]` | |
| `App.of(construct)` | `App` | Walks up to the root. |

## Dashboard

`new Dashboard(scope, id, props)`

| Prop | Type | Default |
| --- | --- | --- |
| `title` | `string` | *required* |
| `uid` | `string` | — (Grafana generates one). Must be 8–40 characters. |
| `description` | `string` | — |
| `editable` | `boolean` | `true` |
| `fiscalYearStartMonth` | `number` | `0` (January). Must be 0–11. |
| `graphTooltip` | `DashboardCursorSync` | `Off` |
| `links` | `Array<DashboardLink \| IDashboardLink>` | `[]` |
| `refresh` | `DurationString` | — (no auto-refresh) |
| `tags` | `string[]` | `[]` |
| `time` | `TimeRangeProps` | `{from: 'now-6h', to: 'now'}` |
| `timepicker` | `TimePickerConfig` | `{}` |
| `timezone` | `string` | `'browser'` |
| `weekStart` | `string` | `''` |
| `liveNow` | `boolean` | — |
| `preload` | `boolean` | — |
| `version` | `number` | `0` |

| Member | Notes |
| --- | --- |
| `addPanel(panel)` | A `Panel` (any plugin binding) or a `RowPanel`, in reading order. |
| `addVariable(variable)` | |
| `addAnnotation(annotation)` | Alongside the built-in "Annotations & Alerts" query, which every dashboard gets. |
| `layout()` | Resolves flowed grid positions and unassigned panel ids. Idempotent; run automatically. |
| `toJSON()` | The dashboard model. |
| `toJSONString(space?)` | The same, as text. `space` defaults to `2`. |

`SCHEMA_VERSION` is the schema version emitted (`39`).

## Panels

`Panel<TOptions, TCustomFieldConfig>` is the base; the typed constructs below fix
`type` and bind both parameters. Their props are `PanelProps` minus `type` and
`libraryPanel` — `TypedPanelProps<TOptions, TCustomFieldConfig>`.

| Construct | Plugin | Options | `fieldConfig.custom` |
| --- | --- | --- | --- |
| `StatPanel` | `stat` | `StatOptions` | — |
| `GaugePanel` | `gauge` | `GaugeOptions` | — |
| `BarGaugePanel` | `bargauge` | `BarGaugeOptions` | — |
| `TimeSeriesPanel` | `timeseries` | `TimeSeriesOptions` | `TimeSeriesFieldConfig` |
| `BarChartPanel` | `barchart` | `BarChartOptions` | `BarChartFieldConfig` |
| `PieChartPanel` | `piechart` | `PieChartOptions` | `PieChartFieldConfig` |
| `TablePanel` | `table` | `TableOptions` | `TableCustomFieldConfig` |
| `GeomapPanel` | `geomap` | `GeomapOptions` | — |
| `TextPanel` | `text` | `TextOptions` | — |

`AnyPanel` is `Panel<unknown, unknown>` — what containers accept, since a
`StatPanel` is not assignable to `Panel`'s `Record<string, unknown>` default.

### PanelProps

| Prop | Type | Notes |
| --- | --- | --- |
| `type` | `string` | Plugin id. Supplied by the typed constructs. |
| `gridPos` | `GridPositionProps` | *required* |
| `title`, `description` | `string` | |
| `datasource` | `DataSource \| DataSourceRef` | Default for targets that name no other. |
| `targets` | `DataSourceTarget[]` | Built through the data source's `createTarget`. |
| `options` | `TOptions` | |
| `fieldConfig` | `FieldConfigProps<TCustomFieldConfig>` | |
| `transformations` | `DataTransformerConfig[]` | |
| `id` | `number` | Assigned by the dashboard when omitted. |
| `libraryPanel` | `LibraryPanel` | Suppresses every other body field — Grafana resolves them from the library. |
| `timeFrom`, `timeShift` | `RelativeTimeString \| DurationString` | |
| `interval` | `DurationString` | Lower bound for `$__interval`. |
| `repeat` | `string` | Variable *name*, not `$name`. |
| `repeatDirection` | `'h' \| 'v'` | |
| `cacheTimeout`, `queryCachingTTL`, `hideTimeOverride`, `maxDataPoints`, `maxPerRow`, `pluginVersion`, `links`, `transparent` | | Pass-through. |

### RowPanel

`new RowPanel(scope, id, props?)` — a full-width, one-row-tall section header, so
there is no `gridPos`.

| Prop | Type | Default |
| --- | --- | --- |
| `title` | `string` | — |
| `collapsed` | `boolean` | `false` |
| `panels` | `AnyPanel[]` | `[]` |
| `datasource` | `DataSource \| DataSourceRef` | — |
| `repeat` | `string` | — |
| `id` | `number` | assigned |
| `y` | `number` | flowed |

Emits its panels inline only when `collapsed`; an expanded row leaves them in the
dashboard's own list, which is where Grafana expects them.

## Grid

| Export | Notes |
| --- | --- |
| `GRID_COLUMNS` | `24`. |
| `GridPosition` | `{x?, y?, w, h, static?}`. `x`/`y` omitted means flowed. |
| `GridLayout` | The left-to-right packer, plus `GridLayout.validateNoOverlap`. |
| `isGridPosition(node)` | Narrowing helper. |

## Time

| Export | Notes |
| --- | --- |
| `RelativeTimeString` | `'now'`, `now±<n><unit>`, `now/<unit>`, or both. Units `s m h d w M y`. |
| `AbsoluteTimeString` | Branded ISO 8601, produced by `absoluteTime()`. |
| `TimeBoundary` | `RelativeTimeString \| AbsoluteTimeString \| Date \| number`. |
| `absoluteTime(value)` | Normalises to UTC ISO 8601. Throws on a non-instant. |
| `isRelativeTime(value)` | Runtime check for computed strings. |
| `parseRelativeTime(value)` | `{amount, unit?, snapTo?}`, or `undefined`. |
| `resolveTimeBoundary(value, now, edge)` | `edge` is `'from'` or `'to'`; snapping differs. |
| `renderTimeBoundary(value)` | The string form the JSON carries. |
| `TimeRange` | `TimeRange.of({from, to})`, `TimeRange.DEFAULT`, `TimeRange.lastMonth()`, `.resolve(now?)`. Throws if the range is inverted. |
| `DurationString`, `isDuration`, `duration`, `durationToMilliseconds` | Interval strings: `30s`, `5m`, `1h`. |

## Field config

| Export | Notes |
| --- | --- |
| `FieldConfig`, `FieldConfigProps<TCustom>` | Standard options plus `custom` and `overrides`. No invented defaults. |
| `thresholds(props?)` | Adds the required base step and sorts. Rejects duplicates and out-of-range percentage steps. |
| `defaultThresholds()` | Grafana's own new-panel thresholds. |
| `valueMap`, `rangeMap`, `regexMap`, `specialValueMap` | One per member of the `ValueMapping` union. |
| `fieldOverride(matcher, properties)` | `FieldMatcher` and `FieldOverrideProperty` are closed unions. |
| `fixedColorOverride(fieldName, color)` | Shorthand. |

## Transformations

`transformation(id, {options, filter?, topic?, disabled?})`, where `options` is
checked against `id` via `TransformerOptions`. `customTransformation(id, options)`
is the escape hatch. See
[the how-to](how-to/transform-data.md) for the modelled ids.

## Data sources

| Construct | Plugin | Target |
| --- | --- | --- |
| `GrafanaDataSource` | `grafana` (`-- Grafana --`) | — |
| `ExpressionDataSource` | `__expr__` | `ExpressionTarget` — `math`, `reduce`, `resample`, `threshold` |
| `CloudWatchDataSource` | `cloudwatch` | `CloudWatchDataSourceTarget` |
| `AthenaDataSource` | `grafana-athena-datasource` | `AthenaTarget` |

`DataSource.asRef()` gives the `{type, uid}` every reference repeats;
`DataSourceTarget.asRef()` gives the `$refId` an expression addresses it by.
Extend `DataSource` and `DataSourceTarget` for anything else — see
[the how-to](how-to/add-a-data-source.md).

## Variables

`QueryVariable`, `CustomVariable`, `ConstantVariable`, `DataSourceVariable`,
`IntervalVariable`, `TextBoxVariable`, `AdHocVariable`, all extending
`Variable`, which supplies `asRef()` (`$name`) and `asBracedRef()` (`${name}`).

## Other constructs

| Construct | Notes |
| --- | --- |
| `AnnotationQuery` | Event markers. The built-in query is created for you. |
| `DashboardLink` | Header or panel links. `type: 'link'` requires a `url`. |
| `LibraryPanel` | A reference to a panel saved in Grafana's library. |

## Enums

Re-exported from `@grafana/schema` so one import suffices:
`AxisColorMode`, `AxisPlacement`, `BarAlignment`, `BarGaugeDisplayMode`,
`BarGaugeNamePlacement`, `BarGaugeSizing`, `BarGaugeValueMode`,
`BigValueColorMode`, `BigValueGraphMode`, `BigValueJustifyMode`,
`BigValueTextMode`, `ComparisonOperation`, `DashboardCursorSync`, `DataTopic`,
`FieldColorModeId`, `FrameGeometrySourceMode`, `GraphDrawStyle`,
`GraphGradientMode`, `GraphThresholdsStyleMode`, `GraphTransform`,
`LegendDisplayMode`, `LineInterpolation`, `LogsDedupStrategy`, `LogsSortOrder`,
`MappingType`, `PercentChangeColorMode`, `ScaleDirection`, `ScaleDistribution`,
`ScaleOrientation`, `SortOrder`, `SpecialValueMatch`, `StackingMode`,
`TableCellBackgroundDisplayMode`, `TableCellDisplayMode`, `TableCellHeight`,
`ThresholdsMode`, `TooltipDisplayMode`, `VariableFormatID`, `VariableHide`,
`VariableRefresh`, `VariableSort`, `VisibilityMode`, `VizOrientation`.

Panel-local enums declared by this package: `PieChartType`, `PieChartLabels`,
`PieChartLegendValues`, `GeomapTooltipMode`, `MapCenterID`, `TextMode`,
`CodeLanguage`; and, on the data sources, `MetricQueryType`,
`MetricEditorMode`, `AthenaQueryFormat`.

## Validation errors

Collected by `App.validate()` and thrown by `App.synth()`:

- `gridPos.*` bounds, integrality and 24-column overflow
- panels whose areas intersect
- duplicate query `refId` within a panel
- duplicate panel id within a dashboard
- duplicate template variable name within a dashboard

Errors thrown at construction, because they are programming errors rather than
dashboard-level constraints: an inverted time range, a malformed time boundary
or interval, a `uid` outside 8–40 characters, a `fiscalYearStartMonth` outside
0–11, a variable name that cannot be interpolated, an empty picker, an empty
`refId` or data source `uid`, a `type: 'link'` dashboard link with no `url`, a
duplicate or out-of-range threshold step, an inverted range mapping, an invalid
regex, and a field override that sets nothing.

# How to style fields

A panel's `fieldConfig` has two halves: `defaults`, applied to every field, and
`overrides`, applied to the fields a matcher selects. This package builds both.

Note that `FieldConfig` invents **no** defaults. An earlier version seeded every
panel with `decimals: 1` and a red threshold at 5000 — right for exactly one
panel and silently wrong for the rest, because the panel still renders and looks
deliberate.

## Thresholds

```typescript
thresholds({ steps: [{ color: 'orange', value: 0.95 }, { color: 'green', value: 0.99 }] })
```

The base step is added for you — the schema requires the first entry to be
`value: null`, which is how `-Infinity` serialises — and the steps are sorted,
because the schema requires that too.

Pass `base` to change the below-everything colour, and `mode` for percentage
thresholds. Percentage steps are fractions of the field's min/max, so `0.95`
rather than `95`; a value outside 0–1 throws rather than becoming a threshold
that is never reached. Duplicate step values throw for the same reason.

## Value mappings

One builder per member of the union, each taking the options that member
actually has:

```typescript
valueMap({ '0': { text: 'Down', color: 'red' } })
rangeMap(0.999, null, { text: 'Nominal', color: 'green' })  // null = open-ended
regexMap('^prod-', { text: 'Production' })
specialValueMap(SpecialValueMatch.Null, { text: 'No data' })
```

`rangeMap` rejects an inverted range and `regexMap` rejects a pattern that is
not a valid regular expression — both would otherwise be mappings that can never
match.

## Overrides

```typescript
fixedColorOverride('Online', 'green')
```

is shorthand for the common case. The general form pairs any matcher with any
set of properties:

```typescript
fieldOverride({ id: 'byRegexp', options: '^p\\d+$' }, [
  { id: 'unit', value: 'ms' },
  { id: 'custom.axisPlacement', value: 'right' },
]);
```

Matcher ids are a closed union, each with the options it takes — `byName` takes
a string, `byValue` takes `{op, reducer, value}`, `byType` takes a field type.
Property ids are standard `FieldConfig` keys, or `custom.<key>` paths for the
panel plugin's own options. Getting that prefix wrong is the classic silent
no-op, so the type spells it out.

An override with no properties throws: Grafana keeps the entry and applies
nothing.

## Panel-plugin field options

`fieldConfig.custom` is bound to the plugin's own type by the typed panel
constructs, so `custom.lineWidth` is accepted on a `TimeSeriesPanel` and
rejected on a `StatPanel`.

## All together

```typescript
import {
  App,
  BarChartPanel,
  Dashboard,
  FieldColorModeId,
  SpecialValueMatch,
  StatPanel,
  ThresholdsMode,
  fieldOverride,
  fixedColorOverride,
  rangeMap,
  specialValueMap,
  thresholds,
  valueMap,
} from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'styling', { title: 'Styling', uid: 'styling-0001' });

dashboard.addPanel(
  new StatPanel(dashboard, 'availability', {
    title: 'Availability',
    gridPos: { w: 6, h: 4 },
    fieldConfig: {
      unit: 'percentunit',
      min: 0,
      max: 1,
      // The base step (`value: null`, which Grafana serialises from -Infinity)
      // is added for you, and the steps are sorted.
      thresholds: thresholds({
        mode: ThresholdsMode.Percentage,
        base: 'red',
        steps: [
          { color: 'orange', value: 0.95 },
          { color: 'green', value: 0.99 },
        ],
      }),
      mappings: [
        valueMap({ '0': { text: 'Down', color: 'red' } }),
        rangeMap(0.999, null, { text: 'Nominal', color: 'green' }),
        specialValueMap(SpecialValueMatch.Null, { text: 'No data' }),
      ],
    },
  }),
);

dashboard.addPanel(
  new BarChartPanel(dashboard, 'status', {
    title: 'By status',
    gridPos: { w: 18, h: 4 },
    fieldConfig: {
      color: { mode: FieldColorModeId.Fixed },
      custom: { fillOpacity: 100, lineWidth: 1 },
      overrides: [
        // Shorthand for the overwhelmingly common "colour this one series".
        fixedColorOverride('Online', 'green'),
        fixedColorOverride('Offline', 'red'),
        // The general form: any matcher, any set of properties. `custom.*`
        // properties are the panel plugin's; the rest are standard.
        fieldOverride({ id: 'byRegexp', options: '^p\\d+$' }, [
          { id: 'unit', value: 'ms' },
          { id: 'decimals', value: 0 },
          { id: 'custom.axisPlacement', value: 'right' },
        ]),
      ],
    },
  }),
);
```

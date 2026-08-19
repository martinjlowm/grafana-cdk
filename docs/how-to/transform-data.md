# How to transform panel data

Transformations run between the query and the visualisation. Grafana types a
transformation as `{id: string, options: unknown}`, so nothing stops a
`rowsToFields` config carrying `organize`'s options — the panel renders
untransformed data, and the mistake is invisible until someone opens it.

`transformation()` pairs each id with the options it takes.

```typescript
transformation('organize', {
  options: {
    excludeByName: { internal_id: true },
    renameByName: { uuid: 'Device', firmware_version: 'Firmware' },
  },
})
```

## Transformers this package models

`organize`, `rowsToFields`, `reduce`, `merge`, `joinByField`,
`filterFieldsByName`, `filterByValue`, `groupBy`, `sortBy`, `calculateField`,
`renameByRegex`, `labelsToFields`, `extractFields`, `partitionByValues`,
`limit`, `concatenate`.

Each entry in `TransformerOptions` follows
`grafana/grafana/packages/grafana-data/src/transformations/transformers`.

## Optional per-transformation settings

```typescript
transformation('limit', {
  options: { limitField: 10 },
  filter: { id: 'byFrameRefID', options: 'A' },  // only the frame from query A
  topic: DataTopic.Series,                        // series, annotations, alert states
  disabled: true,                                 // keep it, skip it
})
```

`filter` takes the same matcher union as
[field overrides](style-fields.md#overrides).

## Anything else

For a plugin's own transformer, or one newer than this release:

```typescript
customTransformation('myPluginTransform', { anything: true })
```

Deliberately more awkward to reach for than `transformation()`, so the typed
path stays the default.

## All together

```typescript
import {
  App,
  AthenaDataSource,
  Dashboard,
  StatPanel,
  TablePanel,
  customTransformation,
  transformation,
} from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'transformations', { title: 'Transformations', uid: 'transform-01' });
const athena = new AthenaDataSource(app, '<datasource-uid>');

dashboard.addPanel(
  new TablePanel(dashboard, 'inventory', {
    title: 'Inventory',
    datasource: athena,
    gridPos: { w: 16, h: 8 },
    targets: [athena.createTarget('rows', { refId: 'A', rawSQL: 'SELECT * FROM analytics.devices' })],
    transformations: [
      // Options are checked against the transformer id: an `organize` payload
      // on a `rowsToFields` transformation does not compile.
      transformation('organize', {
        options: {
          excludeByName: { internal_id: true },
          renameByName: { uuid: 'Device', firmware_version: 'Firmware' },
        },
      }),
      transformation('sortBy', {
        options: { sort: [{ field: 'Device', desc: false }] },
      }),
      transformation('limit', { options: { limitField: 100 } }),
    ],
  }),
);

dashboard.addPanel(
  new StatPanel(dashboard, 'freshness', {
    title: 'Freshness',
    datasource: athena,
    gridPos: { w: 8, h: 8 },
    targets: [athena.createTarget('lag', { refId: 'A', rawSQL: 'SELECT tbl, days_behind FROM analytics.pipeline' })],
    transformations: [
      transformation('rowsToFields', {
        options: {
          mappings: [
            { fieldName: 'tbl', handlerKey: 'field.name' },
            { fieldName: 'days_behind', handlerKey: 'field.value' },
          ],
        },
      }),
      // A transformer this package does not model — a plugin's own, or one
      // newer than this release.
      customTransformation('myPluginTransform', { anything: true }),
    ],
  }),
);
```

Transformations apply in the order listed, each one's output feeding the next.

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
$embed: ../snippets/transformations.ts$
```

Transformations apply in the order listed, each one's output feeding the next.

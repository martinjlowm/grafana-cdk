import type { DataTopic, DataTransformerConfig, MatcherConfig } from '@grafana/schema';

import type { FieldMatcher } from '#@/field-overrides.ts';

// `DataTopic` is an enum, so it is a value as well as a type; it is re-exported
// from `#@/enums.ts` alongside the rest of them rather than as a type here,
// which would make `DataTopic.Series` unusable through the barrel.
export type { DataTransformerConfig, MatcherConfig };

/**
 * Panel transformations.
 *
 * `DataTransformerConfig` types `options` as `unknown`, so nothing stops a
 * `rowsToFields` config carrying `organize`'s options — the panel renders
 * untransformed data and the mistake is invisible until someone opens the
 * dashboard. The map below pairs each transformer id with the options it
 * actually takes, and {@link transformation} is the only way to build one.
 *
 * Ids and option shapes follow grafana/grafana
 * `packages/grafana-data/src/transformations/transformers`.
 */
export interface TransformerOptions {
  /** Hide, reorder and rename fields. */
  organize: {
    excludeByName?: Record<string, boolean>;
    includeByName?: Record<string, boolean>;
    indexByName?: Record<string, number>;
    renameByName?: Record<string, string>;
  };
  /** Turn each row into a field, using one column for names and one for values. */
  rowsToFields: {
    mappings?: Array<{ fieldName: string; handlerKey: string; reducerId?: string }>;
  };
  /** Reduce every field to a single value per series. */
  reduce: {
    reducers: string[];
    includeTimeField?: boolean;
    labelsToFields?: boolean;
    mode?: 'seriesToRows' | 'reduceFields';
  };
  /** Merge multiple result sets into one. */
  merge: Record<string, never>;
  /** Join series on a shared field. */
  joinByField: { byField?: string; mode?: 'outer' | 'inner' | 'outerTabular' };
  /** Keep or drop fields by name. */
  filterFieldsByName: {
    include?: { names?: string[]; pattern?: string };
    exclude?: { names?: string[]; pattern?: string };
  };
  /** Drop rows whose value fails a condition. */
  filterByValue: {
    filters: Array<{ config: { id: string; options: unknown }; fieldName: string }>;
    match?: 'any' | 'all';
    type?: 'include' | 'exclude';
  };
  /** Group rows and aggregate the rest. */
  groupBy: {
    fields: Record<string, { aggregations: string[]; operation: 'groupby' | 'aggregate' | null }>;
  };
  /** Sort rows by a field. */
  sortBy: { fields?: Record<string, unknown>; sort: Array<{ field: string; desc?: boolean }> };
  /** Add a field computed from the others. */
  calculateField: {
    alias?: string;
    mode?: 'reduceRow' | 'binary' | 'unary' | 'index' | 'cumulativeFunctions' | 'window';
    binary?: { left: string; operator: string; right: string };
    reduce?: { reducer: string; include?: string[] };
    replaceFields?: boolean;
  };
  /** Rewrite field names with a regular expression. */
  renameByRegex: { regex: string; renamePattern: string };
  /** Turn labels into fields. */
  labelsToFields: { mode?: 'columns' | 'rows'; keepLabels?: string[]; valueLabel?: string };
  /** Pull structured values out of a field. */
  extractFields: { source?: string; format?: string; replace?: boolean; keepTime?: boolean };
  /** Split a frame into one frame per distinct value. */
  partitionByValues: { fields: string[]; keepFields?: boolean; naming?: { asLabels?: boolean } };
  /** Keep the first N rows. */
  limit: { limitField?: number | string };
  /** Concatenate frames side by side. */
  concatenate: { frameNameLabel?: string; frameNameMode?: string };
}

/** Every transformer id this module knows the options for. */
export type TransformerId = keyof TransformerOptions;

export interface TransformationProps<TId extends TransformerId> {
  /** Skip this transformation without removing it. */
  disabled?: boolean;
  /** Restrict the transformation to the frames a matcher selects. */
  filter?: FieldMatcher;
  /** Which data the transformation reads: series, annotations or alert states. */
  topic?: DataTopic;
  options: TransformerOptions[TId];
}

/**
 * Builds a transformation whose options are checked against its id.
 *
 * @example
 * transformation('rowsToFields', {
 *   options: {mappings: [{fieldName: 'name', handlerKey: 'field.name'}]},
 * })
 */
export function transformation<TId extends TransformerId>(
  id: TId,
  props: TransformationProps<TId>,
): DataTransformerConfig {
  return {
    id,
    options: props.options,
    ...(props.disabled === undefined ? {} : { disabled: props.disabled }),
    ...(props.filter === undefined ? {} : { filter: { id: props.filter.id, options: props.filter.options } }),
    ...(props.topic === undefined ? {} : { topic: props.topic }),
  };
}

/**
 * Escape hatch for transformers this module does not model — a plugin's own, or
 * one added to Grafana after this package was last updated. Deliberately more
 * awkward to reach for than {@link transformation}.
 */
export function customTransformation(id: string, options: unknown): DataTransformerConfig {
  return { id, options };
}

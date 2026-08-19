import {
  type FieldColor,
  FieldColorModeId,
  type FieldConfigSource,
  type MatcherConfig,
  type ThresholdsConfig,
  type ValueMapping,
} from '@grafana/schema';

/**
 * Per-field overrides — the half of `fieldConfig` that Grafana types as
 * `{matcher: {id: string, options: unknown}, properties: Array<{id: string, value?: unknown}>}`.
 *
 * Both `id` fields are registry keys and both payloads are `unknown`, so the
 * schema cannot tell you that `byName` takes a string while `byValue` takes an
 * object, nor that the property `custom.axisPlacement` is spelled with the
 * `custom.` prefix and `unit` is not. This module puts the pairings in the type
 * system.
 */

/** The matcher ids Grafana ships in its field-matcher registry. */
export type FieldMatcher =
  /** One field, by its exact name. */
  | { id: 'byName'; options: string }
  /** Several fields, by exact name. */
  | { id: 'byNames'; options: { mode?: 'exclude' | 'include'; names: string[]; prefix?: string; readOnly?: boolean } }
  /** Fields whose name matches a regular expression. */
  | { id: 'byRegexp'; options: string }
  /** Fields whose name matches a regular expression, or whose value matches it. */
  | { id: 'byRegexpOrNames'; options: { names?: string[]; pattern?: string } }
  /** Every field of a given data type. */
  | { id: 'byType'; options: 'number' | 'string' | 'time' | 'boolean' | 'trace' | 'other' | 'enum' }
  /** Every field of the frame produced by a given query. */
  | { id: 'byFrameRefID'; options: string }
  /** Fields whose reduced value satisfies a comparison. */
  | { id: 'byValue'; options: { op: 'gte' | 'gt' | 'lte' | 'lt' | 'eq' | 'neq'; reducer: string; value: number } }
  /** Every field. */
  | { id: 'byFieldPath'; options: string };

/**
 * A property to set on the matched fields.
 *
 * `id` is a `FieldConfig` key for standard options and a `custom.<key>` path
 * for the panel-plugin-specific ones — the distinction Grafana's own JSON makes
 * and the one most easily got wrong.
 */
export type FieldOverrideProperty =
  | { id: 'unit'; value: string }
  | { id: 'decimals'; value: number }
  | { id: 'min'; value: number }
  | { id: 'max'; value: number }
  | { id: 'displayName'; value: string }
  | { id: 'noValue'; value: string }
  | { id: 'color'; value: FieldColor }
  | { id: 'thresholds'; value: ThresholdsConfig }
  | { id: 'mappings'; value: ValueMapping[] }
  | { id: 'links'; value: unknown[] }
  | { id: 'filterable'; value: boolean }
  /** Panel-plugin options, e.g. `custom.width`, `custom.axisPlacement`. */
  | { id: `custom.${string}`; value: unknown };

/** One entry of `fieldConfig.overrides`. */
export interface FieldOverride {
  matcher: MatcherConfig;
  properties: Array<{ id: string; value?: unknown }>;
}

/**
 * Pairs a matcher with the properties to apply to whatever it selects.
 *
 * @example
 * fieldOverride({id: 'byName', options: 'Online'}, [
 *   {id: 'color', value: {mode: FieldColorModeId.Fixed, fixedColor: 'green'}},
 * ])
 */
export function fieldOverride(matcher: FieldMatcher, properties: FieldOverrideProperty[]): FieldOverride {
  if (properties.length === 0) {
    throw new RangeError(
      `Field override for matcher '${matcher.id}' sets no properties; Grafana would keep the entry and apply nothing.`,
    );
  }

  return {
    matcher: { id: matcher.id, options: matcher.options },
    properties: properties.map(({ id, value }) => ({ id, value })),
  };
}

/** Shorthand for the overwhelmingly common "colour this one series" override. */
export function fixedColorOverride(fieldName: string, fixedColor: string): FieldOverride {
  return fieldOverride({ id: 'byName', options: fieldName }, [
    { id: 'color', value: { mode: FieldColorModeId.Fixed, fixedColor } },
  ]);
}

/** The `overrides` array as `FieldConfigSource` types it. */
export type FieldOverrides = FieldConfigSource['overrides'];

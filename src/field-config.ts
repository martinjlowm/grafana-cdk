import type {
  FieldColor,
  FieldConfigSource,
  FieldConfig as IFieldConfig,
  ThresholdsConfig,
  ValueMapping,
} from '@grafana/schema';
import { Construct } from 'constructs';

import type { FieldOverride } from '#@/field-overrides.js';

export type { FieldColor, FieldConfigSource, IFieldConfig, ThresholdsConfig, ValueMapping };

/**
 * The standard field options, plus the panel-plugin-specific `custom` block.
 *
 * `TCustom` is the plugin's own field config — `GraphFieldConfig` for
 * timeseries, `TableFieldOptions` for table, and so on. Panels in
 * `#@/panels/*` bind it, so `custom.axisPlacement` is checked on a timeseries
 * and rejected on a stat.
 */
export interface FieldConfigProps<TCustom = Record<string, unknown>> {
  /** How the field is coloured: from thresholds, a palette, or a fixed colour. */
  color?: FieldColor;
  /** Options defined by the panel plugin. */
  custom?: TCustom;
  /** Decimal places; omit to let Grafana choose. */
  decimals?: number;
  description?: string;
  /** Overrides the series name. Supports variable interpolation. */
  displayName?: string;
  displayNameFromDS?: string;
  filterable?: boolean;
  links?: unknown[];
  /** Rewrites values for display. See `#@/value-mappings.js`. */
  mappings?: ValueMapping[];
  /** Ceiling for percentage thresholds and gauges; omit to auto-scale. */
  max?: number;
  /** Floor for percentage thresholds and gauges; omit to auto-scale. */
  min?: number;
  /** Shown instead of an empty cell. */
  noValue?: string;
  path?: string;
  /** See `#@/thresholds.js`. */
  thresholds?: ThresholdsConfig;
  /** Grafana unit id (`ms`, `percentunit`, `bytes`) or a `suffix:`/`si:` form. */
  unit?: string;
  writeable?: boolean;
  /** Per-field exceptions to the above. See `#@/field-overrides.js`. */
  overrides?: FieldOverride[];
}

/**
 * A panel's `fieldConfig`.
 *
 * Deliberately does *not* invent defaults. An earlier version of this class
 * seeded every panel with `decimals: 1` and a red threshold at 5000, which is
 * right for exactly one panel and silently wrong for the rest — a threshold you
 * did not ask for is worse than none, because the panel renders and looks
 * deliberate. Callers that want Grafana's own new-panel defaults can reach for
 * `defaultThresholds()`.
 */
export class FieldConfig<TCustom = Record<string, unknown>> extends Construct {
  public readonly defaults: IFieldConfig;
  public readonly overrides: FieldOverride[];

  constructor(scope: Construct, id: string, props: FieldConfigProps<TCustom> = {}) {
    super(scope, id);

    const { overrides = [], ...defaults } = props;

    this.defaults = defaults as IFieldConfig;
    this.overrides = overrides;
  }

  public toJSON(): FieldConfigSource {
    return {
      defaults: this.defaults,
      overrides: this.overrides,
    };
  }
}

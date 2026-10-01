import { type Threshold, type ThresholdsConfig, ThresholdsMode } from '@grafana/schema';

export type { Threshold, ThresholdsConfig };
export { ThresholdsMode };

/**
 * A threshold step above the base. The base step is implicit — Grafana requires
 * the first entry to have `value: null` (it serialises `-Infinity`), and having
 * callers restate that is how a threshold list ends up silently ignored.
 */
export interface ThresholdStep {
  /** Value at or above which this step's colour applies. */
  value: number;
  /** Grafana colour name (`green`, `red`) or a CSS colour. */
  color: string;
}

export interface ThresholdsProps {
  /**
   * `absolute` compares against the raw value; `percentage` against the field's
   * min/max, as a fraction between 0 and 1.
   */
  mode?: ThresholdsMode;
  /** Colour below every step. Grafana's own default is `green`. */
  base?: string;
  /** Steps above the base, in any order — they are sorted on the way out. */
  steps?: ThresholdStep[];
}

/**
 * Builds a `ThresholdsConfig` with the base step and the sort order the schema
 * requires ("Must be sorted by 'value', first value is always -Infinity").
 *
 * @throws on a duplicate step value, or a percentage-mode step outside 0–1 —
 * both render as a threshold that is simply never reached.
 */
export function thresholds(props: ThresholdsProps = {}): ThresholdsConfig {
  const mode = props.mode ?? ThresholdsMode.Absolute;
  const steps = [...(props.steps ?? [])].sort((a, b) => a.value - b.value);

  const seen = new Set<number>();
  for (const step of steps) {
    if (seen.has(step.value)) {
      throw new RangeError(`Duplicate threshold value ${step.value}: only the last step would ever apply.`);
    }
    seen.add(step.value);

    if (mode === ThresholdsMode.Percentage && (step.value < 0 || step.value > 1)) {
      throw new RangeError(
        `Percentage threshold ${step.value} is outside 0–1. Percentage thresholds are fractions of the field's min/max, not 0–100.`,
      );
    }
  }

  return {
    mode,
    steps: [{ color: props.base ?? 'green', value: null } as Threshold, ...steps],
  };
}

/** The thresholds Grafana attaches to a brand-new panel. */
export function defaultThresholds(): ThresholdsConfig {
  return thresholds({ steps: [{ color: 'red', value: 80 }] });
}

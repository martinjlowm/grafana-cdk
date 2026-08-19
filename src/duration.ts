/**
 * Grafana interval strings — the `refresh`, `interval`, `timeShift`,
 * `cacheTimeout` and `timepicker.refresh_intervals` fields.
 *
 * Same shape as the offset half of {@link RelativeTimeString} but without the
 * `now` prefix and with `ms` added, which is why it is its own type rather than
 * a reuse: `5m` is a valid interval and an invalid time boundary, and `now-5m`
 * is the reverse.
 */

/** Units Grafana accepts in an interval, from `grafana-data`'s `rangeUtil`. */
export type DurationUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

/** e.g. `30s`, `5m`, `1h`, `7d`. Note `m` is minutes and `M` is months. */
export type DurationString = `${number}${DurationUnit}`;

const DURATION_PATTERN = /^(\d+)(ms|[smhdwMy])$/;

const UNIT_MILLISECONDS: Record<DurationUnit, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  // Approximations, and only ever used for ordering/comparison — never to
  // produce a timestamp. Calendar arithmetic lives in time-range.ts.
  M: 2_629_800_000,
  y: 31_557_600_000,
};

/** Whether `value` is a well-formed Grafana interval string. */
export function isDuration(value: unknown): value is DurationString {
  return typeof value === 'string' && DURATION_PATTERN.test(value);
}

/**
 * Interval length in milliseconds, for ordering and comparison.
 *
 * `M` and `y` use the mean Gregorian month/year, so this is not a substitute
 * for calendar arithmetic — see {@link resolveTimeBoundary}.
 *
 * @throws if the value is not a well-formed interval.
 */
export function durationToMilliseconds(value: DurationString | string): number {
  const match = DURATION_PATTERN.exec(value);

  if (!match) {
    throw new TypeError(
      `Not a valid Grafana interval: ${JSON.stringify(value)}. Expected <number><unit>, e.g. '30s', '5m', '1h'.`,
    );
  }

  const [, amount, unit] = match;

  return Number.parseInt(amount as string, 10) * UNIT_MILLISECONDS[unit as DurationUnit];
}

/** Asserts a well-formed interval and returns it, for use inline in props. */
export function duration(value: DurationString): DurationString {
  if (!isDuration(value)) {
    throw new TypeError(
      `Not a valid Grafana interval: ${JSON.stringify(value)}. Expected <number><unit>, e.g. '30s', '5m', '1h'.`,
    );
  }

  return value;
}

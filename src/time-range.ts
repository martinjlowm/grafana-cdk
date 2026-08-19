/**
 * Grafana time boundaries — the `time`, `timeFrom` and `timeShift` fields of a
 * dashboard and its panels.
 *
 * Grafana accepts two shapes in the same string-typed field:
 *
 *   - relative, in its own markup: `now`, `now-6h`, `now/d`, `now-1M/M`
 *   - absolute, as an ISO 8601 instant: `2020-07-10T08:00:00.000Z`
 *
 * The schema types both as a bare `string`, which is where the class of bug
 * this module exists to prevent lives: `now-6hh`, `now-6H` and `now-6 h` are
 * all valid `string`s and all silently produce a dashboard whose time picker is
 * broken. Relative markup is therefore a template literal type (checked at
 * compile time for literals) with a parser behind it (checked at synth time for
 * values computed at runtime), and absolute instants are nominal so that
 * `RelativeTimeString | AbsoluteTimeString` does not collapse to `string`.
 */

/**
 * Units Grafana's relative markup accepts, from its own docs. Note the
 * case-sensitivity that makes the whole thing worth typing: `m` is minutes and
 * `M` is months.
 */
export type RelativeTimeUnit = 's' | 'm' | 'h' | 'd' | 'w' | 'M' | 'y';

type RelativeTimeOffset = `${'-' | '+'}${number}${RelativeTimeUnit}`;
type RelativeTimeSnap = `/${RelativeTimeUnit}`;

/**
 * `now`, optionally offset, optionally snapped to the start (as a range's
 * `from`) or end (as its `to`) of a unit.
 *
 * `${number}` is the loosest part of this — it also admits `now-1e3d` — so
 * {@link isRelativeTime} is the authority, and every constructor in this
 * package runs it. The literal type still rejects the mistakes that actually
 * happen: wrong unit letter, wrong case, missing `now`, stray whitespace.
 */
export type RelativeTimeString =
  | 'now'
  | `now${RelativeTimeOffset}`
  | `now${RelativeTimeSnap}`
  | `now${RelativeTimeOffset}${RelativeTimeSnap}`;

declare const absoluteTimeBrand: unique symbol;

/**
 * An ISO 8601 instant. Nominal on purpose: were this a plain `string`, the
 * union with {@link RelativeTimeString} would widen to `string` and every
 * literal check in this module would be lost.
 *
 * Produced by {@link absoluteTime}.
 */
export type AbsoluteTimeString = string & { readonly [absoluteTimeBrand]: true };

/** Either end of a time range, in any of the forms this package accepts. */
export type TimeBoundary = RelativeTimeString | AbsoluteTimeString | Date | number;

/** A dashboard or panel time range, as it appears in the dashboard JSON. */
export interface ITimeRange {
  from: string;
  to: string;
}

const RELATIVE_TIME_PATTERN = /^now(?:([-+])(\d+)([smhdwMy]))?(?:\/([smhdwMy]))?$/;

const UNIT_MILLISECONDS: Record<'s' | 'm' | 'h' | 'd' | 'w', number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
};

/** The pieces of a parsed relative marker. */
export interface RelativeTime {
  /** Signed offset amount; `0` when the marker is a bare `now` or `now/<unit>`. */
  readonly amount: number;
  /** Unit the offset is expressed in; `undefined` when there is no offset. */
  readonly unit?: RelativeTimeUnit;
  /** Unit the result is snapped to, if the marker ends in `/<unit>`. */
  readonly snapTo?: RelativeTimeUnit;
}

/**
 * Parses Grafana relative markup. Returns `undefined` rather than throwing so
 * callers can decide between "reject" and "this is an absolute instant".
 */
export function parseRelativeTime(value: string): RelativeTime | undefined {
  const match = RELATIVE_TIME_PATTERN.exec(value);

  if (!match) {
    return undefined;
  }

  const [, sign, amount, unit, snapTo] = match;

  return {
    amount: amount ? Number.parseInt(amount, 10) * (sign === '-' ? -1 : 1) : 0,
    unit: unit as RelativeTimeUnit | undefined,
    snapTo: snapTo as RelativeTimeUnit | undefined,
  };
}

/** Whether `value` is well-formed Grafana relative markup. */
export function isRelativeTime(value: unknown): value is RelativeTimeString {
  return typeof value === 'string' && RELATIVE_TIME_PATTERN.test(value);
}

/**
 * Marks an instant as absolute. Accepts what `new Date()` accepts plus epoch
 * milliseconds, and normalises to the UTC ISO 8601 form Grafana emits itself.
 *
 * @throws if the value is not a real instant — `absoluteTime('yesterday')`
 * would otherwise serialise to the string `"Invalid Date"`.
 */
export function absoluteTime(value: string | number | Date): AbsoluteTimeString {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Not a valid instant: ${JSON.stringify(value)}`);
  }

  return date.toISOString() as AbsoluteTimeString;
}

/**
 * Which end of a range a boundary sits on. Grafana snaps the two ends in
 * opposite directions — `now/d` means "start of today" as a `from` and "end of
 * today" as a `to`, which is what makes `{from: 'now-1M/M', to: 'now-1M/M'}`
 * (all of last month) a range rather than a zero-width instant.
 */
export type TimeEdge = 'from' | 'to';

function startOfUnit(date: Date, unit: RelativeTimeUnit): Date {
  const snapped = new Date(date.getTime());

  switch (unit) {
    case 's':
      snapped.setUTCMilliseconds(0);
      break;
    case 'm':
      snapped.setUTCSeconds(0, 0);
      break;
    case 'h':
      snapped.setUTCMinutes(0, 0, 0);
      break;
    case 'd':
      snapped.setUTCHours(0, 0, 0, 0);
      break;
    case 'w': {
      // ISO weeks (Monday-based), which is what Grafana uses when `weekStart`
      // is left unset. A dashboard that overrides `weekStart` shifts this by a
      // day — it only affects validation, never the emitted markup.
      snapped.setUTCHours(0, 0, 0, 0);
      const isoDayOfWeek = (snapped.getUTCDay() + 6) % 7;
      snapped.setUTCDate(snapped.getUTCDate() - isoDayOfWeek);
      break;
    }
    case 'M':
      snapped.setUTCHours(0, 0, 0, 0);
      snapped.setUTCDate(1);
      break;
    case 'y':
      snapped.setUTCHours(0, 0, 0, 0);
      snapped.setUTCMonth(0, 1);
      break;
  }

  return snapped;
}

function addUnits(date: Date, amount: number, unit: RelativeTimeUnit): Date {
  if (unit === 'M' || unit === 'y') {
    // Calendar arithmetic, not fixed milliseconds: `now-1M` in March must land
    // in February, not 30 days earlier.
    const shifted = new Date(date.getTime());
    shifted.setUTCMonth(shifted.getUTCMonth() + amount * (unit === 'y' ? 12 : 1));
    return shifted;
  }

  return new Date(date.getTime() + amount * UNIT_MILLISECONDS[unit]);
}

/**
 * Resolves a boundary to the instant Grafana would resolve it to, so ranges can
 * be checked for ordering before they ever reach a Grafana instance.
 *
 * @param now Reference instant relative markup is measured from.
 */
export function resolveTimeBoundary(value: TimeBoundary, now: Date, edge: TimeEdge): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'number') {
    return new Date(value);
  }

  const relative = parseRelativeTime(value);

  if (!relative) {
    const absolute = new Date(value);

    if (Number.isNaN(absolute.getTime())) {
      throw new TypeError(
        `Not a valid time boundary: ${JSON.stringify(value)}. Expected Grafana relative markup (e.g. 'now-6h', 'now-1M/M') or an ISO 8601 instant.`,
      );
    }

    return absolute;
  }

  const offset = relative.unit ? addUnits(now, relative.amount, relative.unit) : now;

  if (!relative.snapTo) {
    return offset;
  }

  const start = startOfUnit(offset, relative.snapTo);

  if (edge === 'from') {
    return start;
  }

  // The end of the snapped unit is the instant before the next one starts;
  // Grafana renders this as the last millisecond, not the next unit's first.
  return new Date(addUnits(start, 1, relative.snapTo).getTime() - 1);
}

/** Serialises a boundary to the string form the dashboard JSON carries. */
export function renderTimeBoundary(value: TimeBoundary): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number') {
    return new Date(value).toISOString();
  }

  return value;
}

/** A `{from, to}` pair, either end relative or absolute, in any combination. */
export interface TimeRangeProps {
  from: TimeBoundary;
  to: TimeBoundary;
}

/**
 * A validated dashboard time range.
 *
 * Not a construct: a time range has no identity in the tree, it is a value.
 * Validation happens at construction because a malformed range is a
 * programming error, not a dashboard-level constraint to collect and report
 * alongside others.
 */
export class TimeRange implements ITimeRange {
  /** The default Grafana itself applies to a new dashboard. */
  public static readonly DEFAULT = TimeRange.of({ from: 'now-6h', to: 'now' });

  public static of(props: TimeRangeProps): TimeRange {
    return new TimeRange(props);
  }

  /** The last complete calendar month, the way Grafana's own presets express it. */
  public static lastMonth(): TimeRange {
    return TimeRange.of({ from: 'now-1M/M', to: 'now-1M/M' });
  }

  public readonly from: string;
  public readonly to: string;

  constructor(props: TimeRangeProps) {
    const now = new Date();
    const from = resolveTimeBoundary(props.from, now, 'from');
    const to = resolveTimeBoundary(props.to, now, 'to');

    if (from.getTime() > to.getTime()) {
      throw new RangeError(
        `Time range starts after it ends: from ${renderTimeBoundary(props.from)} (${from.toISOString()}) is later than to ${renderTimeBoundary(props.to)} (${to.toISOString()}).`,
      );
    }

    this.from = renderTimeBoundary(props.from);
    this.to = renderTimeBoundary(props.to);
  }

  /** Resolves both ends against a reference instant. */
  public resolve(now: Date = new Date()): { from: Date; to: Date } {
    return {
      from: resolveTimeBoundary(this.from as TimeBoundary, now, 'from'),
      to: resolveTimeBoundary(this.to as TimeBoundary, now, 'to'),
    };
  }

  public toJSON(): ITimeRange {
    return { from: this.from, to: this.to };
  }
}

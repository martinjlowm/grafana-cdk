import { GRID_COLUMNS, type GridPositionProps } from '#@/grid-position.js';

/**
 * Laying a dashboard out by hand means writing `{x: 8, y: 12, w: 8, h: 6}` on
 * every panel and recomputing all of it the moment a panel is inserted or
 * resized. The flow layout in `#@/grid-position.js` avoids that for simple
 * reading-order dashboards, but it cannot express "this chart takes two thirds
 * of the row and these three stats share the rest".
 *
 * {@link Grid} is the planner for that case: you describe the split, it hands
 * back concrete areas. Because a {@link GridArea} already satisfies
 * {@link GridPositionProps}, the result goes straight into a panel's `gridPos`.
 *
 * ```typescript
 * const grid = new Grid();
 * const [chart, side] = grid.row(8, ['two-thirds', 'third']);
 * const [top, bottom] = side.rows(['half', 'half']);
 * ```
 */

/** A fraction of the available space, e.g. `'2/3'`, `'1/4'`. */
export type GridFraction = `${number}/${number}`;

/** Readable names for the fractions that come up constantly. */
export type GridSpanAlias = 'full' | 'half' | 'third' | 'two-thirds' | 'quarter' | 'three-quarters';

/**
 * How much of the available space one cell takes.
 *
 * - a **number** is an exact count of columns (or rows, when splitting
 *   vertically) — `8`, `12`
 * - a **fraction** or **alias** is a share of what the row or area offers —
 *   `'half'`, `'2/3'`
 * - **`'auto'`** splits whatever is left over equally between every `'auto'`
 *   cell, so `[16, 'auto', 'auto']` gives 16, 4 and 4
 */
export type GridSpan = number | GridFraction | GridSpanAlias | 'auto';

const ALIASES: Record<GridSpanAlias, [number, number]> = {
  full: [1, 1],
  half: [1, 2],
  third: [1, 3],
  'two-thirds': [2, 3],
  quarter: [1, 4],
  'three-quarters': [3, 4],
};

const FRACTION = /^(\d+)\/(\d+)$/;

/** Desired length of one span, or `null` for `'auto'` (resolved afterwards). */
function desiredLength(span: GridSpan, available: number, axis: string): number | null {
  if (typeof span === 'number') {
    if (!Number.isInteger(span) || span < 1) {
      throw new RangeError(`A ${axis} span given as a number must be a positive integer count, got ${span}.`);
    }

    return span;
  }

  if (span === 'auto') {
    return null;
  }

  const alias = ALIASES[span as GridSpanAlias];

  if (alias) {
    return (available * (alias[0] as number)) / (alias[1] as number);
  }

  const match = FRACTION.exec(span);

  if (!match) {
    throw new SyntaxError(
      `Not a valid grid span: ${JSON.stringify(span)}. Expected a column count, a fraction like '2/3', 'auto', or one of ${Object.keys(ALIASES).join(', ')}.`,
    );
  }

  const numerator = Number.parseInt(match[1] as string, 10);
  const denominator = Number.parseInt(match[2] as string, 10);

  if (denominator === 0) {
    throw new RangeError(`Grid span ${JSON.stringify(span)} divides by zero.`);
  }

  return (available * numerator) / denominator;
}

/**
 * Turns spans into integer lengths that sum to what was asked for and never
 * leave a gap.
 *
 * Fractions rarely divide the grid evenly — a fifth of 24 columns is 4.8 — so
 * rounding each cell independently would either overflow the row or leave a
 * one-column hole down the middle of the dashboard. Largest-remainder
 * apportionment spends the rounding error once, on the cells with the biggest
 * fractional part.
 */
function resolveSpans(available: number, spans: readonly GridSpan[], axis: string): number[] {
  if (spans.length === 0) {
    throw new RangeError(`A grid ${axis} needs at least one span.`);
  }

  const desired = spans.map((span) => desiredLength(span, available, axis));
  const autos = desired.filter((length) => length === null).length;
  const fixed = desired.reduce((sum: number, length) => sum + (length ?? 0), 0);

  const lengths = desired.map((length) => length ?? (available - fixed) / autos);
  const total = lengths.reduce((sum, length) => sum + length, 0);

  // 1e-9 rather than an exact comparison: fractions are floats, and
  // ['1/3', '1/3', '1/3'] of 24 sums to 23.999999999999996.
  if (total > available + 1e-9) {
    throw new RangeError(
      `Grid ${axis} spans total ${Math.round(total * 100) / 100}, more than the ${available} available.`,
    );
  }

  const target = Math.min(available, Math.round(total));
  const floors = lengths.map(Math.floor);
  let remaining = target - floors.reduce((sum, length) => sum + length, 0);

  const byRemainder = lengths
    .map((length, index) => ({ index, fraction: length - Math.floor(length) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of byRemainder) {
    if (remaining <= 0) {
      break;
    }

    floors[index] = (floors[index] as number) + 1;
    remaining -= 1;
  }

  const empty = floors.findIndex((length) => length < 1);

  if (empty !== -1) {
    throw new RangeError(
      `Grid span ${JSON.stringify(spans[empty])} resolves to zero ${axis} out of ${available}; the grid cannot be split any finer.`,
    );
  }

  return floors;
}

/** Any of the three forms a split accepts. */
type Spans = number | readonly GridSpan[] | Record<string, GridSpan>;

/**
 * One area per span, keeping the tuple shape of a literal.
 *
 * `const S` makes `['two-thirds', 'third']` infer as a two-element tuple rather
 * than `GridSpan[]`, so destructuring the result yields `GridArea` rather than
 * `GridArea | undefined` under `noUncheckedIndexedAccess`. A non-literal
 * `GridSpan[]` maps to `GridArea[]`, as it must.
 */
type GridAreas<S extends readonly GridSpan[]> = { -readonly [I in keyof S]: GridArea };

/**
 * `N` areas, as a tuple when `N` is a literal.
 *
 * Same purpose as {@link GridAreas} for the count shorthand: `grid.row(4, 3)`
 * yields a three-element tuple, so the three names you destructure into are all
 * `GridArea`. The `number extends N` guard is what stops a non-literal count
 * from collapsing to the empty tuple.
 */
type GridAreaTuple<N extends number, R extends GridArea[] = []> = number extends N
  ? GridArea[]
  : R['length'] extends N
    ? R
    : GridAreaTuple<N, [...R, GridArea]>;

function isSpanRecord(spans: unknown): spans is Record<string, GridSpan> {
  return typeof spans === 'object' && spans !== null && !Array.isArray(spans);
}

/**
 * A rectangle of grid space, ready to be a panel's `gridPos` and divisible into
 * smaller ones.
 *
 * Areas carry concrete `x`/`y`, so panels placed from a grid are pinned. Mixing
 * them with flowed panels on one dashboard is allowed and is exactly what the
 * overlap check is for.
 */
export class GridArea implements GridPositionProps {
  public readonly x: number;
  public readonly y: number;
  public readonly w: number;
  public readonly h: number;

  constructor(x: number, y: number, w: number, h: number) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  /** First row below this area — where the next thing would start. */
  public get bottom(): number {
    return this.y + this.h;
  }

  /** First column to the right of this area. */
  public get right(): number {
    return this.x + this.w;
  }

  /** Splits this area horizontally, left to right. */
  public columns<N extends number>(count: N): GridAreaTuple<N>;
  public columns<const S extends readonly GridSpan[]>(spans: S): GridAreas<S>;
  public columns<K extends string>(spans: Record<K, GridSpan>): Record<K, GridArea>;
  public columns(spans: Spans): GridArea[] | Record<string, GridArea> {
    return splitColumns(this, spans);
  }

  /** Splits this area vertically, top to bottom. */
  public rows<N extends number>(count: N): GridAreaTuple<N>;
  public rows<const S extends readonly GridSpan[]>(spans: S): GridAreas<S>;
  public rows<K extends string>(spans: Record<K, GridSpan>): Record<K, GridArea>;
  public rows(spans: Spans): GridArea[] | Record<string, GridArea> {
    return divide(spans, (list) => {
      const heights = resolveSpans(this.h, list, 'rows');
      let y = this.y;

      return heights.map((h) => {
        const area = new GridArea(this.x, y, this.w, h);
        y += h;
        return area;
      });
    });
  }

  /** This area with some coordinates replaced — most usefully `{static: true}`. */
  public with(overrides: Partial<GridPositionProps>): GridPositionProps {
    return { x: this.x, y: this.y, w: this.w, h: this.h, ...overrides };
  }

  public toJSON(): { x: number; y: number; w: number; h: number } {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }
}

/**
 * The horizontal split, shared by {@link GridArea.columns} and
 * {@link Grid.row} — the latter cannot call the former without picking one of
 * its overloads.
 */
function splitColumns(area: GridArea, spans: Spans): GridArea[] | Record<string, GridArea> {
  return divide(spans, (list) => {
    const widths = resolveSpans(area.w, list, 'columns');
    let x = area.x;

    return widths.map((w) => {
      const column = new GridArea(x, area.y, w, area.h);
      x += w;
      return column;
    });
  });
}

/** Shared plumbing for the array / record / count forms of a split. */
function divide(
  spans: Spans,
  place: (spans: readonly GridSpan[]) => GridArea[],
): GridArea[] | Record<string, GridArea> {
  if (typeof spans === 'number') {
    return place(Array.from({ length: spans }, () => 'auto' as const));
  }

  if (Array.isArray(spans)) {
    return place(spans);
  }

  if (!isSpanRecord(spans)) {
    throw new TypeError('Grid spans must be a count, an array of spans, or an object of named spans.');
  }

  const names = Object.keys(spans);
  const areas = place(names.map((name) => spans[name] as GridSpan));

  return Object.fromEntries(names.map((name, index) => [name, areas[index] as GridArea]));
}

export interface GridProps {
  /**
   * Columns the grid spans. Defaults to Grafana's 24; narrow it only to plan a
   * region rather than the whole dashboard.
   */
  columns?: number;
  /** Column the grid's left edge sits at. */
  x?: number;
  /** Row the grid starts at. */
  y?: number;
}

/**
 * A top-to-bottom planner over the dashboard grid.
 *
 * Each call takes the next band of rows and returns the areas it was split
 * into, so a dashboard reads top to bottom in source the way it does on screen.
 * Nothing here is a construct — a grid computes coordinates and holds no
 * identity in the tree.
 */
export class Grid {
  public readonly columns: number;

  readonly #x: number;
  #y: number;

  constructor(props: GridProps = {}) {
    this.columns = props.columns ?? GRID_COLUMNS;

    if (this.columns < 1 || this.columns > GRID_COLUMNS) {
      throw new RangeError(`A grid must span between 1 and ${GRID_COLUMNS} columns, got ${this.columns}.`);
    }

    this.#x = props.x ?? 0;
    this.#y = props.y ?? 0;

    if (this.#x + this.columns > GRID_COLUMNS) {
      throw new RangeError(
        `A grid of ${this.columns} columns starting at x ${this.#x} runs past the ${GRID_COLUMNS}-column grid.`,
      );
    }
  }

  /** The next unused row — where the following `row()` or `band()` will start. */
  public get y(): number {
    return this.#y;
  }

  /**
   * Takes the next `height` rows and splits them into columns.
   *
   * Pass a count for equal columns, an array of spans for a specific split, or
   * an object to get the areas back by name.
   */
  public row<N extends number>(height: number, count: N): GridAreaTuple<N>;
  public row<const S extends readonly GridSpan[]>(height: number, spans: S): GridAreas<S>;
  public row<K extends string>(height: number, spans: Record<K, GridSpan>): Record<K, GridArea>;
  public row(height: number, spans: Spans): GridArea[] | Record<string, GridArea> {
    return splitColumns(this.band(height), spans);
  }

  /** Takes the next `height` rows as one full-width area. */
  public band(height: number): GridArea {
    if (!Number.isInteger(height) || height < 1) {
      throw new RangeError(`A grid band must be a positive whole number of rows, got ${height}.`);
    }

    const area = new GridArea(this.#x, this.#y, this.columns, height);
    this.#y += height;

    return area;
  }

  /**
   * Takes the single row a `RowPanel` header occupies and returns its `y`, for
   * passing to the row panel.
   */
  public header(): number {
    return this.band(1).y;
  }

  /** Leaves `rows` rows empty. */
  public skip(rows: number): this {
    if (!Number.isInteger(rows) || rows < 0) {
      throw new RangeError(`A grid skip must be a whole number of rows, got ${rows}.`);
    }

    this.#y += rows;

    return this;
  }

  /** Restarts the cursor at `y`, for laying out a region a second time. */
  public seek(y: number): this {
    if (!Number.isInteger(y) || y < 0) {
      throw new RangeError(`A grid cursor must be a whole number of rows, got ${y}.`);
    }

    this.#y = y;

    return this;
  }
}

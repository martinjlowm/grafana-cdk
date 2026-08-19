import type { GridPos } from '@grafana/schema';
import { Construct, type IConstruct } from 'constructs';

/**
 * Grafana lays panels out on a fixed 24-column grid. A row is 30px tall; the
 * column width is whatever a 24th of the viewport happens to be.
 */
export const GRID_COLUMNS = 24;

export interface GridPositionProps {
  /**
   * Column of the panel's left edge, `0`–`23`. Omit to let the dashboard flow
   * the panel after the previous one — see {@link GridLayout}.
   */
  x?: GridPos['x'];
  /**
   * Row of the panel's top edge. Omit to let the dashboard place it.
   */
  y?: GridPos['y'];
  /** Width in columns, `1`–`24`. */
  w: GridPos['w'];
  /** Height in rows. */
  h: GridPos['h'];
  /** Pin the panel so neighbouring panels cannot push it around. */
  static?: GridPos['static'];
}

/**
 * A panel's position on the dashboard grid.
 *
 * `x`/`y` are optional in the props and resolved by the owning dashboard: a
 * dashboard built in code has a natural reading order, and making every panel
 * restate coordinates it can derive is how grids drift out of alignment. Panels
 * that do pin themselves keep exactly the coordinates they were given.
 *
 * Shape validation (bounds, integrality, overflow past column 24) is registered
 * on the node so it surfaces through `App.synth()` alongside every other
 * validation error, rather than throwing at the first bad panel.
 */
export class GridPosition extends Construct {
  /** Whether the caller pinned this panel rather than leaving it to flow. */
  public readonly explicit: boolean;

  public readonly w: GridPos['w'];
  public readonly h: GridPos['h'];
  public readonly static: GridPos['static'];

  #x: GridPos['x'];
  #y: GridPos['y'];

  constructor(scope: Construct, id: string, props: GridPositionProps) {
    super(scope, id);

    this.explicit = props.x !== undefined && props.y !== undefined;
    this.#x = props.x ?? 0;
    this.#y = props.y ?? 0;
    this.w = props.w;
    this.h = props.h;
    this.static = props.static;

    this.node.addValidation({ validate: () => this.validate() });
  }

  public get x(): GridPos['x'] {
    return this.#x;
  }

  public get y(): GridPos['y'] {
    return this.#y;
  }

  /**
   * Assigns flowed coordinates. Called by {@link GridLayout} during layout; a
   * position the caller pinned is left alone.
   */
  public place(x: GridPos['x'], y: GridPos['y']): void {
    if (this.explicit) {
      return;
    }

    this.#x = x;
    this.#y = y;
  }

  /** The area this panel occupies, as a half-open rectangle. */
  public get rectangle(): { left: number; top: number; right: number; bottom: number } {
    return { left: this.x, top: this.y, right: this.x + this.w, bottom: this.y + this.h };
  }

  public overlaps(other: GridPosition): boolean {
    const a = this.rectangle;
    const b = other.rectangle;

    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  }

  private validate(): string[] {
    const errors: string[] = [];

    for (const [name, value] of [
      ['x', this.x],
      ['y', this.y],
      ['w', this.w],
      ['h', this.h],
    ] as const) {
      if (!Number.isInteger(value)) {
        errors.push(`gridPos.${name} must be an integer, got ${value}`);
      }
    }

    if (this.w < 1 || this.w > GRID_COLUMNS) {
      errors.push(`gridPos.w must be between 1 and ${GRID_COLUMNS}, got ${this.w}`);
    }

    if (this.h < 1) {
      errors.push(`gridPos.h must be at least 1, got ${this.h}`);
    }

    if (this.x < 0 || this.x >= GRID_COLUMNS) {
      errors.push(`gridPos.x must be between 0 and ${GRID_COLUMNS - 1}, got ${this.x}`);
    }

    if (this.y < 0) {
      errors.push(`gridPos.y must be at least 0, got ${this.y}`);
    }

    if (this.x + this.w > GRID_COLUMNS) {
      errors.push(
        `gridPos.x + gridPos.w must not exceed ${GRID_COLUMNS} columns, got ${this.x} + ${this.w} = ${this.x + this.w}`,
      );
    }

    return errors;
  }

  public toJSON(): GridPos {
    return {
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      ...(this.static === undefined ? {} : { static: this.static }),
    };
  }
}

/**
 * Left-to-right, top-to-bottom packer for panels that did not pin themselves.
 *
 * Deliberately simple — it is a reading-order flow, not the gravity solver the
 * Grafana UI runs when you drag a panel. Panels that need a specific
 * arrangement pin `x` and `y`, and the overlap check below is what keeps the
 * two kinds honest with each other.
 */
export class GridLayout {
  #cursorX = 0;
  #cursorY = 0;
  #rowHeight = 0;

  /** Places one position, advancing the cursor. */
  public place(position: GridPosition): void {
    if (position.explicit) {
      // A pinned panel does not move the cursor: flowed panels around it keep
      // their reading order, and any collision is reported by `validate`.
      return;
    }

    if (this.#cursorX + position.w > GRID_COLUMNS) {
      this.#cursorX = 0;
      this.#cursorY += this.#rowHeight;
      this.#rowHeight = 0;
    }

    position.place(this.#cursorX, this.#cursorY);

    this.#cursorX += position.w;
    this.#rowHeight = Math.max(this.#rowHeight, position.h);
  }

  /**
   * Reports every pair of panels whose areas intersect. Runs after placement,
   * so it sees flowed and pinned panels in the same coordinate space.
   */
  public static validateNoOverlap(positions: Array<{ path: string; position: GridPosition }>): string[] {
    const errors: string[] = [];

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i] as { path: string; position: GridPosition };
        const b = positions[j] as { path: string; position: GridPosition };

        if (a.position.overlaps(b.position)) {
          errors.push(
            `panels [${a.path}] and [${b.path}] overlap: ` +
              `${describe(a.position)} intersects ${describe(b.position)}`,
          );
        }
      }
    }

    return errors;
  }
}

function describe(position: GridPosition): string {
  return `{x: ${position.x}, y: ${position.y}, w: ${position.w}, h: ${position.h}}`;
}

/** Narrowing helper for the construct-tree walks in `app.ts` and `dashboard.ts`. */
export function isGridPosition(node: IConstruct): node is GridPosition {
  return node instanceof GridPosition;
}

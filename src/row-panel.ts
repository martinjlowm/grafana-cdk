import type { DataSourceRef, RowPanel as GrafanaRowPanel } from '@grafana/schema';
import { Construct } from 'constructs';

import { DataSource } from '#@/data-source.ts';
import { GridPosition } from '#@/grid-position.ts';
import type { AnyPanel } from '#@/panel.ts';

export interface RowPanelProps {
  title?: string;
  /**
   * A collapsed row carries its panels inline, in `panels`; an expanded one
   * leaves them in the dashboard's own list and only marks where the row
   * header sits. Grafana moves them between the two on expand/collapse, and
   * this construct emits whichever form matches `collapsed`.
   */
  collapsed?: boolean;
  /** Panels belonging to this row. */
  panels?: AnyPanel[];
  /** Default data source for the row's panels. */
  datasource?: DataSource | DataSourceRef;
  /** Name of the template variable to repeat this row for. */
  repeat?: string;
  /** Unique within the dashboard; assigned by the dashboard when omitted. */
  id?: number;
  /** Row of the header. Assigned by the dashboard when omitted. */
  y?: number;
}

export type IRowPanel = GrafanaRowPanel;

/**
 * A row header, which groups the panels beneath it.
 *
 * Rows are full-width and exactly one grid row tall — Grafana ignores anything
 * else — so unlike a {@link Panel} there is no `gridPos` to pass.
 */
export class RowPanel extends Construct {
  public readonly type = 'row' as const;

  public readonly title?: string;
  public readonly collapsed: boolean;
  public readonly panels: AnyPanel[];
  public readonly datasource?: DataSourceRef;
  public readonly repeat?: string;
  public readonly gridPos: GridPosition;

  #id: number | undefined;

  constructor(scope: Construct, id: string, props: RowPanelProps = {}) {
    super(scope, id);

    this.title = props.title;
    this.collapsed = props.collapsed ?? false;
    this.panels = props.panels ?? [];
    this.datasource = props.datasource instanceof DataSource ? props.datasource.asRef() : props.datasource;
    this.repeat = props.repeat;
    this.#id = props.id;
    // A row always spans the full grid and is always one row tall; `y` is left
    // to the dashboard's layout unless the caller pinned it.
    this.gridPos = new GridPosition(this, 'grid-position', {
      x: 0,
      ...(props.y === undefined ? {} : { y: props.y }),
      w: 24,
      h: 1,
    });
  }

  public get id(): number | undefined {
    return this.#id;
  }

  public assignId(id: number): void {
    this.#id ??= id;
  }

  /** Adds a panel to this row. */
  public addPanel(panel: AnyPanel): void {
    this.panels.push(panel);
  }

  public toJSON(): IRowPanel {
    return {
      type: this.type,
      ...(this.title === undefined ? {} : { title: this.title }),
      collapsed: this.collapsed,
      gridPos: this.gridPos.toJSON(),
      id: this.#id ?? 0,
      ...(this.datasource === undefined ? {} : { datasource: this.datasource }),
      ...(this.repeat === undefined ? {} : { repeat: this.repeat }),
      // An expanded row leaves its panels in the dashboard's list; emitting
      // them here as well would render each one twice.
      panels: this.collapsed ? this.panels.map((panel) => panel.toJSON()) : [],
    } as IRowPanel;
  }
}

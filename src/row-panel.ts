import type { DataSourceRef, RowPanel as GrafanaRowPanel, GridPos } from '@grafana/schema';
import { Construct } from 'constructs';

import type { IPanel } from '#@/panel.js';

type PanelProps = {
  collapsed: boolean;
  datasource?: DataSourceRef;
  gridPos?: GridPos;
  id: number;
  panels?: Array<IPanel>;
  repeat?: string;
  title?: string;
  type: 'row';
};

type ExcludeRowPanelProperties =
  // This is not properly typed upstream
  'panels';

export type IRowPanel = Omit<GrafanaRowPanel, ExcludeRowPanelProperties>;

export class RowPanel extends Construct implements IRowPanel {
  public readonly type = 'row';
  public readonly collapsed: boolean;
  public readonly datasource?: DataSourceRef;
  public readonly gridPos?: GridPos;
  public readonly id = 0;
  public readonly panels: Array<IPanel>;
  public readonly repeat?: string;
  public readonly title?: string;

  constructor(scope: Construct, id: string, props: PanelProps) {
    super(scope, id);

    this.collapsed = props.collapsed || false;
    this.repeat = props.repeat;
    this.title = props.title;
    this.panels = props.panels || [];
  }
}

import { Construct } from 'constructs';
import type { Dashboard as IDashboard, DashboardCursorSync, DashboardLink, TimePickerConfig } from '@grafana/schema';

import { Panel } from '#@/panel';
import { RowPanel } from '#@/row-panel';

// zod this
type TimeRangeString = string;

type TimeRange = {
  from: TimeRangeString;
  to: TimeRangeString;
};

type DashboardProps = {
  editable?: boolean;
  fiscalYearStartMonth?: number;
  graphTooltip?: number;
  links?: DashboardLink[];
  schemaVersion?: number;
  tags?: string;
  time?: TimeRange;
  timepicker?: any;
  timezone?: string;
  title: string;
  weekStart: string;
};

export class Dashboard extends Construct implements IDashboard {

  public readonly version: number;
  public readonly editable?: boolean;
  public readonly fiscalYearStartMonth?: number;
  public readonly graphTooltip?: DashboardCursorSync;
  public readonly links?: DashboardLink[];
  public readonly schemaVersion: number;
  public readonly tags?: string[];
  public readonly time?: TimeRange;
  public readonly timepicker?: TimePickerConfig;
  public readonly timezone?: string;
  public readonly title?: string;
  public readonly weekStart?: string;

  public readonly panels: Array<Panel | RowPanel>;

  constructor(scope: Construct, id: string, props: DashboardProps) {
    super(scope, id);

    this.version = 0;
    this.editable = props.editable || true;
    this.fiscalYearStartMonth = 0;
    this.graphTooltip = 0;
    this.links = [];
    this.schemaVersion = 0;
    this.tags = [];
    this.time = { from: '', to: '' };
    this.title = props.title;
    this.panels = [];
    this.timepicker = {};
  }

  toJSON() {
    const { toJSON, addPanel, node, ...fields } = this;

    return JSON.stringify(fields, undefined, 2);
  }

  addPanel(panel: Panel | RowPanel) {
    this.panels.push(panel);
  }
}

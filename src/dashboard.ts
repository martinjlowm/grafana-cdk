import type { DashboardCursorSync, DashboardLink, Dashboard as IDashboard, TimePickerConfig } from '@grafana/schema';
import { Construct } from 'constructs';

import { AnnotationQuery } from '#@/annotation-query.js';
import type { Panel } from '#@/panel.js';
import type { RowPanel } from '#@/row-panel.js';

import { GrafanaDataSource } from '#@/data-sources/index.js';

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
  timepicker?: TimePickerConfig;
  timezone?: string;
  title: string;
  uid?: string;
  weekStart?: string;
  templating?: IDashboard['templating'];
};

export class Dashboard extends Construct implements IDashboard {
  public readonly annotations: IDashboard['annotations'];
  public readonly editable?: boolean;
  public readonly fiscalYearStartMonth?: number;
  public readonly graphTooltip?: DashboardCursorSync;
  public readonly panels: Array<Panel | RowPanel>; // TODO: Raw Panel or Panel with library reference
  public readonly id: number;
  public readonly links?: DashboardLink[];
  public readonly schemaVersion: number;
  public readonly tags?: string[];
  public readonly time?: TimeRange;
  public readonly timepicker?: TimePickerConfig;
  public readonly timezone?: string;
  public readonly title: string;
  public readonly uid?: string;
  public readonly version: number;
  public readonly weekStart?: string;
  public readonly templating?: IDashboard['templating'];

  constructor(scope: Construct, id: string, props: DashboardProps) {
    super(scope, id);

    this.annotations = {
      list: [
        new AnnotationQuery(this, 'annotations-alerts', {
          datasource: new GrafanaDataSource(this),
          name: 'Annotations & Alerts',
          type: 'dashboard',
        }),
      ],
    };
    this.editable = props.editable || true;
    this.fiscalYearStartMonth = 0;
    this.graphTooltip = 0;
    this.id = null as unknown as number;
    this.links = [];
    this.panels = [];
    this.schemaVersion = 39;
    this.tags = [];
    this.templating = props.templating;
    this.time = {
      from: 'now-30m',
      to: 'now',
    };
    this.timepicker = {};
    this.timezone = 'browser';
    this.title = props.title;
    this.uid = props.uid;
    this.version = 0;
    this.weekStart = '';
  }

  toJSON() {
    const { node, ...fields } = this;
    return JSON.stringify(
      fields,
      (key, value) => {
        if (key === 'node') {
          return;
        }

        return value;
      },
      2,
    );
  }

  addPanel(panel: Panel | RowPanel) {
    this.panels.push(panel);
  }
}

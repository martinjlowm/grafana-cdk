import type { FieldConfigSource, GridPos, Panel as IPanel } from '@grafana/schema';
import { Construct } from 'constructs';

import type { DashboardLink } from '#@/dashboard-link.js';
import type { DataSource } from '#@/data-source.js';
import type { DataTransformer } from '#@/data-transformer.js';
import { FieldConfig, type FieldConfigProps } from '#@/field-config.js';
import { GridPosition } from '#@/grid-position.js';
import type { LibraryPanel } from '#@/library-panel.js';

// zod this
type TimeRangeString = string;

type PanelProps = {
  cacheTimeout?: string;
  datasource?: DataSource;
  description?: string;
  fieldConfig?: FieldConfigProps;
  gridPos: Omit<GridPos, 'x' | 'y'> & Partial<GridPos>;
  hideTimeOverride?: boolean;
  id?: number;
  interval?: string;
  libraryPanel?: LibraryPanel;
  links?: Array<DashboardLink>;
  maxDataPoints?: number;
  maxPerRow?: number;
  options?: Record<string, unknown>;
  pluginVersion?: string;
  queryCachingTTL?: number;
  repeat?: string;
  repeatDirection?: IPanel['repeatDirection'];
  targets?: IPanel['targets'];
  timeFrom?: TimeRangeString;
  timeShift?: TimeRangeString;
  title?: string;
  transformations?: Array<DataTransformer>;
  transparent?: boolean;
  type: string;
};

export class Panel extends Construct implements IPanel {
  public readonly title?: string;
  public readonly description?: string;

  public readonly datasource?: DataSource;
  public readonly transformations?: Array<DataTransformer>;

  public readonly cacheTimeout?: string;
  public readonly fieldConfig?: FieldConfigSource;
  public readonly gridPos: GridPos;
  public readonly hideTimeOverride?: boolean;
  public readonly id?: number;
  public readonly interval?: string;
  public readonly libraryPanel?: LibraryPanel;
  public readonly links?: Array<DashboardLink>;
  public readonly maxDataPoints?: number;
  public readonly maxPerRow?: number;
  public readonly options?: Record<string, unknown>;
  public readonly pluginVersion?: string;
  public readonly queryCachingTTL?: number;
  public readonly repeat?: string;
  public readonly repeatDirection?: IPanel['repeatDirection'];
  public readonly targets?: IPanel['targets'];
  public readonly timeFrom?: string;
  public readonly timeShift?: string;

  public readonly transparent?: boolean;
  public readonly type: string;

  constructor(scope: Construct, id: string, props: PanelProps) {
    super(scope, id);

    // Pass through GridPosition such that we can validate positions and that panels don't overlap
    this.gridPos = new GridPosition(this, id, props.gridPos);
    this.title = props.title || '';
    this.type = props.type;

    if (props.libraryPanel) {
      this.libraryPanel = props.libraryPanel;
      return;
    }

    this.cacheTimeout = props.cacheTimeout;
    this.datasource = props.datasource;
    this.description = props.description;
    this.fieldConfig = new FieldConfig(this, 'field-config', props.fieldConfig);

    this.hideTimeOverride = props.hideTimeOverride;
    this.interval = props.interval;
    this.libraryPanel = props.libraryPanel;
    this.links = props.links;
    this.maxDataPoints = props.maxDataPoints;
    this.maxPerRow = props.maxPerRow;
    this.options = props.options;
    this.pluginVersion = props.pluginVersion;
    this.queryCachingTTL = props.queryCachingTTL;
    this.repeat = props.repeat;
    this.repeatDirection = props.repeatDirection;
    this.targets = props.targets;
    this.timeFrom = props.timeFrom;
    this.timeShift = props.timeShift;

    this.transformations = props.transformations;
    this.transparent = props.transparent;
  }
}

import type {
  DataSourceRef,
  DataTransformerConfig,
  Panel as GrafanaPanel,
  DashboardLink as IDashboardLink,
} from '@grafana/schema';
import { Construct } from 'constructs';

import type { DashboardLink } from '#@/dashboard-link.ts';
import { DataSource, type DataSourceTarget } from '#@/data-source.ts';
import { type DurationString, isDuration } from '#@/duration.ts';
import { FieldConfig, type FieldConfigProps } from '#@/field-config.ts';
import { GridPosition, type GridPositionProps } from '#@/grid-position.ts';
import type { LibraryPanel } from '#@/library-panel.ts';
import { isRelativeTime, type RelativeTimeString } from '#@/time-range.ts';

/**
 * A panel-level time override. Grafana accepts both a relative marker
 * (`now-5m`) and a bare interval (`5m`) here and treats them the same way.
 */
export type PanelTimeOverride = RelativeTimeString | DurationString;

export interface PanelProps<TOptions = Record<string, unknown>, TCustomFieldConfig = Record<string, unknown>> {
  /** Panel plugin id — `stat`, `timeseries`, `table`. */
  type: string;
  title?: string;
  description?: string;
  /** Where the panel sits on the 24-column grid. Omit `x`/`y` to flow. */
  gridPos: GridPositionProps;
  /** Default data source for every target that does not name its own. */
  datasource?: DataSource | DataSourceRef;
  /** The queries. Build them through the data source's `createTarget`. */
  targets?: DataSourceTarget[];
  /**
   * Plugin-specific display options. Bound to the plugin's own `Options` type
   * by the panels in `#@/panels/*`; a bare {@link Panel} leaves it open.
   */
  options?: TOptions;
  /** Field display options, standard and plugin-specific. */
  fieldConfig?: FieldConfigProps<TCustomFieldConfig>;
  /** Transformations applied before rendering. See `#@/data-transformer.ts`. */
  transformations?: DataTransformerConfig[];
  /** Unique within the dashboard; assigned by the dashboard when omitted. */
  id?: number;
  cacheTimeout?: string;
  hideTimeOverride?: boolean;
  /** Lower bound for `$__interval`. */
  interval?: DurationString;
  /** Render a saved library panel instead of this panel's own configuration. */
  libraryPanel?: LibraryPanel;
  links?: Array<DashboardLink | IDashboardLink>;
  maxDataPoints?: number;
  /** Cap on panels per row when `repeat` is horizontal. */
  maxPerRow?: number;
  /** Plugin version this panel's `options` were authored against. */
  pluginVersion?: string;
  queryCachingTTL?: number;
  /** Name of the template variable to repeat this panel for. */
  repeat?: string;
  repeatDirection?: 'h' | 'v';
  /** Time range for this panel alone. */
  timeFrom?: PanelTimeOverride;
  /** Shift this panel's window relative to the dashboard's. */
  timeShift?: PanelTimeOverride;
  transparent?: boolean;
}

/** The panel as it appears in the dashboard JSON. */
export type IPanel = GrafanaPanel;

/**
 * Any panel, whatever its plugin binds the two type parameters to.
 *
 * `Panel` defaults both to `Record<string, unknown>`, which a `StatPanel` is
 * *not* assignable to — an interface with named properties has no index
 * signature. Containers therefore accept this rather than the bare default,
 * which would reject every typed panel in `#@/panels/*`.
 */
export type AnyPanel = Panel<unknown, unknown>;

function assertTimeOverride(field: string, value: PanelTimeOverride | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!isRelativeTime(value) && !isDuration(value)) {
    throw new SyntaxError(
      `Panel ${field} ${JSON.stringify(value)} is neither Grafana relative markup ('now-5m', 'now/d') nor an interval ('5m', '1h').`,
    );
  }
}

/**
 * A dashboard panel.
 *
 * Generic over the plugin's options and its `fieldConfig.custom` block so a
 * typed subclass can bind both — see `#@/panels/*`, which is where nearly every
 * caller should start. This class stays open for plugins those do not cover.
 *
 * `id` and `gridPos.x`/`y` are resolved by the owning dashboard rather than
 * here: both are only meaningful relative to the panel's siblings, and a panel
 * does not know them at construction time.
 */
export class Panel<TOptions = Record<string, unknown>, TCustomFieldConfig = Record<string, unknown>> extends Construct {
  public readonly type: string;
  public readonly title?: string;
  public readonly description?: string;

  public readonly gridPos: GridPosition;
  public readonly datasource?: DataSourceRef;
  public readonly targets: DataSourceTarget[];
  public readonly options?: TOptions;
  public readonly fieldConfig?: FieldConfig<TCustomFieldConfig>;
  public readonly transformations?: DataTransformerConfig[];

  public readonly cacheTimeout?: string;
  public readonly hideTimeOverride?: boolean;
  public readonly interval?: DurationString;
  public readonly libraryPanel?: LibraryPanel;
  public readonly links?: Array<DashboardLink | IDashboardLink>;
  public readonly maxDataPoints?: number;
  public readonly maxPerRow?: number;
  public readonly pluginVersion?: string;
  public readonly queryCachingTTL?: number;
  public readonly repeat?: string;
  public readonly repeatDirection?: 'h' | 'v';
  public readonly timeFrom?: PanelTimeOverride;
  public readonly timeShift?: PanelTimeOverride;
  public readonly transparent?: boolean;

  #id: number | undefined;

  constructor(scope: Construct, id: string, props: PanelProps<TOptions, TCustomFieldConfig>) {
    super(scope, id);

    assertTimeOverride('timeFrom', props.timeFrom);
    assertTimeOverride('timeShift', props.timeShift);

    this.type = props.type;
    this.title = props.title;
    this.description = props.description;
    this.gridPos = new GridPosition(this, 'grid-position', props.gridPos);
    this.#id = props.id;
    this.targets = props.targets ?? [];

    if (props.libraryPanel) {
      // A library panel reference carries nothing else: Grafana resolves the
      // whole configuration from the library at render time, and any local
      // options, targets or fieldConfig alongside it are dropped on save.
      this.libraryPanel = props.libraryPanel;
      this.node.addValidation({ validate: () => this.validate() });
      return;
    }

    this.datasource = props.datasource instanceof DataSource ? props.datasource.asRef() : props.datasource;
    this.options = props.options;
    this.fieldConfig = new FieldConfig<TCustomFieldConfig>(this, 'field-config', props.fieldConfig);
    this.transformations = props.transformations;

    this.cacheTimeout = props.cacheTimeout;
    this.hideTimeOverride = props.hideTimeOverride;
    this.interval = props.interval;
    this.links = props.links;
    this.maxDataPoints = props.maxDataPoints;
    this.maxPerRow = props.maxPerRow;
    this.pluginVersion = props.pluginVersion;
    this.queryCachingTTL = props.queryCachingTTL;
    this.repeat = props.repeat;
    this.repeatDirection = props.repeatDirection;
    this.timeFrom = props.timeFrom;
    this.timeShift = props.timeShift;
    this.transparent = props.transparent;

    this.node.addValidation({ validate: () => this.validate() });
  }

  /** The panel's id, once the dashboard has assigned one. */
  public get id(): number | undefined {
    return this.#id;
  }

  /**
   * Assigns an id. Called by the dashboard during layout; a panel that was
   * given an explicit id keeps it.
   */
  public assignId(id: number): void {
    this.#id ??= id;
  }

  private validate(): string[] {
    const errors: string[] = [];

    const refIds = new Set<string>();
    for (const target of this.targets) {
      if (refIds.has(target.refId)) {
        errors.push(
          `duplicate query refId '${target.refId}': expressions addressing '$${target.refId}' would resolve to whichever query Grafana happened to keep`,
        );
      }
      refIds.add(target.refId);
    }

    return errors;
  }

  public toJSON(): IPanel {
    if (this.libraryPanel) {
      return {
        type: this.type,
        ...(this.title === undefined ? {} : { title: this.title }),
        gridPos: this.gridPos.toJSON(),
        ...(this.#id === undefined ? {} : { id: this.#id }),
        libraryPanel: this.libraryPanel.asRef(),
      };
    }

    return {
      type: this.type,
      ...(this.title === undefined ? {} : { title: this.title }),
      ...(this.description === undefined ? {} : { description: this.description }),
      gridPos: this.gridPos.toJSON(),
      ...(this.#id === undefined ? {} : { id: this.#id }),
      ...(this.datasource === undefined ? {} : { datasource: this.datasource }),
      ...(this.targets.length === 0 ? {} : { targets: this.targets.map((target) => target.toJSON()) }),
      ...(this.options === undefined ? {} : { options: this.options as Record<string, unknown> }),
      ...(this.fieldConfig === undefined ? {} : { fieldConfig: this.fieldConfig.toJSON() }),
      ...(this.transformations === undefined ? {} : { transformations: this.transformations }),
      ...(this.cacheTimeout === undefined ? {} : { cacheTimeout: this.cacheTimeout }),
      ...(this.hideTimeOverride === undefined ? {} : { hideTimeOverride: this.hideTimeOverride }),
      ...(this.interval === undefined ? {} : { interval: this.interval }),
      ...(this.links === undefined ? {} : { links: this.links as IDashboardLink[] }),
      ...(this.maxDataPoints === undefined ? {} : { maxDataPoints: this.maxDataPoints }),
      ...(this.maxPerRow === undefined ? {} : { maxPerRow: this.maxPerRow }),
      ...(this.pluginVersion === undefined ? {} : { pluginVersion: this.pluginVersion }),
      ...(this.queryCachingTTL === undefined ? {} : { queryCachingTTL: this.queryCachingTTL }),
      ...(this.repeat === undefined ? {} : { repeat: this.repeat }),
      ...(this.repeatDirection === undefined ? {} : { repeatDirection: this.repeatDirection }),
      ...(this.timeFrom === undefined ? {} : { timeFrom: this.timeFrom }),
      ...(this.timeShift === undefined ? {} : { timeShift: this.timeShift }),
      ...(this.transparent === undefined ? {} : { transparent: this.transparent }),
    } as IPanel;
  }
}

import type { AnnotationPanelFilter, DataQuery, AnnotationQuery as IAnnotationQuery } from '@grafana/schema';
import { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';

export interface AnnotationQueryProps<TQuery extends DataQuery = DataQuery> {
  /** Name shown on the dashboard's annotation toggle. */
  name: string;
  /** Where the annotations come from. */
  datasource?: DataSource | null;
  /** `1` marks the built-in "Annotations & Alerts" query every dashboard has. */
  builtIn?: number;
  /** Run this query on every dashboard refresh. */
  enable?: boolean;
  /** Restrict the annotations to (or away from) specific panels. */
  filter?: AnnotationPanelFilter;
  /** Hide the toggle from the dashboard header. */
  hide?: boolean;
  /** Colour of the event markers. */
  iconColor?: string;
  /** Datasource-specific query. */
  target?: TQuery;
  /** Annotation source kind, e.g. `dashboard` for the built-in query. */
  type?: string;
}

/**
 * An annotation query — the event markers overlaid on a dashboard's graphs.
 *
 * Note that `enable` and `hide` default to Grafana's own defaults for the
 * *built-in* query (enabled, toggle hidden), which is the query almost every
 * dashboard carries and the only one this package creates on its own.
 */
export class AnnotationQuery<TQuery extends DataQuery = DataQuery> extends Construct {
  public readonly builtIn?: number;
  public readonly datasource?: DataSource | null;
  public readonly enable: boolean;
  public readonly filter?: AnnotationPanelFilter;
  public readonly hide: boolean;
  public readonly iconColor: string;
  public readonly name: string;
  public readonly target?: TQuery;
  public readonly type?: string;

  constructor(scope: Construct, id: string, props: AnnotationQueryProps<TQuery>) {
    super(scope, id);

    this.builtIn = props.builtIn;
    this.datasource = props.datasource;
    this.enable = props.enable ?? true;
    this.filter = props.filter;
    this.hide = props.hide ?? true;
    this.iconColor = props.iconColor ?? 'rgba(0, 211, 255, 1)';
    this.name = props.name;
    this.target = props.target;
    this.type = props.type;
  }

  public toJSON(): IAnnotationQuery {
    return {
      ...(this.builtIn === undefined ? {} : { builtIn: this.builtIn }),
      ...(this.datasource === undefined
        ? {}
        : { datasource: this.datasource instanceof DataSource ? this.datasource.asRef() : this.datasource }),
      enable: this.enable,
      ...(this.filter === undefined ? {} : { filter: this.filter }),
      hide: this.hide,
      iconColor: this.iconColor,
      name: this.name,
      ...(this.target === undefined ? {} : { target: this.target }),
      ...(this.type === undefined ? {} : { type: this.type }),
    } as IAnnotationQuery;
  }
}

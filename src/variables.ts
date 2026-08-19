import {
  type DataSourceRef,
  VariableHide,
  type VariableModel,
  type VariableOption,
  VariableRefresh,
  VariableSort,
  type VariableType,
} from '@grafana/schema';
import { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';
import type { DurationString } from '#@/duration.js';

export { VariableHide, VariableRefresh, VariableSort };
export type { VariableModel, VariableOption, VariableType };

/**
 * Dashboard template variables.
 *
 * `VariableModel` is one flat interface covering nine variable types, so the
 * schema lets you build a `constant` with a `refresh` policy or a `query`
 * without a datasource. Each type gets its own construct here, carrying only
 * the fields Grafana reads for it.
 *
 * Reference a variable from a query with {@link Variable.asRef} (`$name`) —
 * spelling the `$` by hand is the other half of the same problem.
 */
export interface VariableProps {
  /** Display name shown next to the picker; defaults to the variable's name. */
  label?: string;
  /** Free-text description shown on hover. */
  description?: string;
  /** Whether to show the label, the value only, or nothing. */
  hide?: VariableHide;
  /** Keep the current value out of the dashboard URL. */
  skipUrlSync?: boolean;
}

export abstract class Variable extends Construct {
  public abstract readonly type: VariableType;

  public readonly name: string;
  public readonly label?: string;
  public readonly description?: string;
  public readonly hide?: VariableHide;
  public readonly skipUrlSync?: boolean;

  constructor(scope: Construct, name: string, props: VariableProps = {}) {
    super(scope, name);

    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new SyntaxError(
        `Variable name ${JSON.stringify(name)} is not usable in a query: Grafana interpolates '$${name}', so names are limited to letters, digits and underscores.`,
      );
    }

    this.name = name;
    this.label = props.label;
    this.description = props.description;
    this.hide = props.hide;
    this.skipUrlSync = props.skipUrlSync;
  }

  /** `$name` — the form a query interpolates. */
  public asRef(): string {
    return `$${this.name}`;
  }

  /** `${name}` — the unambiguous form, needed when the reference abuts text. */
  public asBracedRef(): string {
    return `\${${this.name}}`;
  }

  protected base(): VariableModel {
    return {
      name: this.name,
      type: this.type,
      ...(this.label === undefined ? {} : { label: this.label }),
      ...(this.description === undefined ? {} : { description: this.description }),
      // `@grafana/schema` exports two structurally identical `VariableHide`
      // enums — the veneer's, which is what callers get, and the raw one, which
      // is what `VariableModel.hide` is typed against. They are the same
      // numbers; tsc just will not accept one for the other.
      ...(this.hide === undefined ? {} : { hide: this.hide as unknown as VariableModel['hide'] }),
      ...(this.skipUrlSync === undefined ? {} : { skipUrlSync: this.skipUrlSync }),
    };
  }

  public abstract toJSON(): VariableModel;
}

function asRef(datasource: DataSource | DataSourceRef): DataSourceRef {
  return datasource instanceof DataSource ? datasource.asRef() : datasource;
}

/** Options shared by the variable types that offer multi-select and "All". */
export interface SelectableVariableProps extends VariableProps {
  /** Offer an "All" entry. */
  includeAll?: boolean;
  /** Value sent when "All" is selected; defaults to Grafana's `.*` glob. */
  allValue?: string;
  /** Allow selecting more than one value. */
  multi?: boolean;
  /** Value selected when the dashboard first loads. */
  current?: VariableOption;
  /** How the picker orders its options. */
  sort?: VariableSort;
}

export interface QueryVariableProps extends SelectableVariableProps {
  /** Data source the query runs against. */
  datasource: DataSource | DataSourceRef;
  /** Datasource-specific query — a string for most, an object for some. */
  query: string | Record<string, unknown>;
  /** Extract part of each result; named capture groups split text from value. */
  regex?: string;
  /** When to re-run the query. Defaults to on dashboard load. */
  refresh?: VariableRefresh;
}

/** Values come from a query against a data source. */
export class QueryVariable extends Variable {
  public override readonly type = 'query' as const;

  public readonly datasource: DataSourceRef;
  public readonly query: string | Record<string, unknown>;
  public readonly regex?: string;
  public readonly refresh: VariableRefresh;
  public readonly includeAll: boolean;
  public readonly allValue?: string;
  public readonly multi: boolean;
  public readonly current?: VariableOption;
  public readonly sort?: VariableSort;

  constructor(scope: Construct, name: string, props: QueryVariableProps) {
    super(scope, name, props);

    // Grafana never persists options for a query variable — they are whatever
    // the last refresh returned — but it does drop the variable entirely if
    // `refresh` is 0 and no options were saved, which reads as "the variable
    // silently disappeared". Default to refreshing on load.
    this.refresh = props.refresh ?? VariableRefresh.onDashboardLoad;
    this.datasource = asRef(props.datasource);
    this.query = props.query;
    this.regex = props.regex;
    this.includeAll = props.includeAll ?? false;
    this.allValue = props.allValue;
    this.multi = props.multi ?? false;
    this.current = props.current;
    this.sort = props.sort;
  }

  public override toJSON(): VariableModel {
    return {
      ...this.base(),
      datasource: this.datasource,
      query: this.query,
      refresh: this.refresh,
      includeAll: this.includeAll,
      multi: this.multi,
      options: [],
      ...(this.regex === undefined ? {} : { regex: this.regex }),
      ...(this.allValue === undefined ? {} : { allValue: this.allValue }),
      ...(this.current === undefined ? {} : { current: this.current }),
      ...(this.sort === undefined ? {} : { sort: this.sort }),
    };
  }
}

export interface CustomVariableProps extends SelectableVariableProps {
  /**
   * The options, as `value` or `{text, value}`. Grafana stores these as a
   * comma-separated `query` string as well as an options array, and keeping the
   * two in step is this construct's job.
   */
  values: Array<string | { text: string; value: string }>;
}

/** Values are a fixed list written into the dashboard. */
export class CustomVariable extends Variable {
  public override readonly type = 'custom' as const;

  public readonly values: Array<{ text: string; value: string }>;
  public readonly includeAll: boolean;
  public readonly allValue?: string;
  public readonly multi: boolean;
  public readonly current?: VariableOption;

  constructor(scope: Construct, name: string, props: CustomVariableProps) {
    super(scope, name, props);

    if (props.values.length === 0) {
      throw new RangeError(`Custom variable '${name}' has no values; its picker would be empty.`);
    }

    this.values = props.values.map((value) => (typeof value === 'string' ? { text: value, value } : value));
    this.includeAll = props.includeAll ?? false;
    this.allValue = props.allValue;
    this.multi = props.multi ?? false;
    this.current = props.current ?? {
      text: this.values[0]?.text ?? '',
      value: this.values[0]?.value ?? '',
      selected: true,
    };
  }

  public override toJSON(): VariableModel {
    return {
      ...this.base(),
      // Grafana's own serialisation: `text : value` when they differ, the bare
      // value when they do not.
      query: this.values.map(({ text, value }) => (text === value ? value : `${text} : ${value}`)).join(','),
      includeAll: this.includeAll,
      multi: this.multi,
      options: this.values.map(({ text, value }) => ({ text, value, selected: this.current?.value === value })),
      current: this.current,
      ...(this.allValue === undefined ? {} : { allValue: this.allValue }),
    };
  }
}

export interface ConstantVariableProps extends VariableProps {
  value: string;
}

/**
 * A hidden constant. Grafana forces `hide` to `hideVariable` for this type, so
 * the prop is not offered.
 */
export class ConstantVariable extends Variable {
  public override readonly type = 'constant' as const;

  public readonly value: string;

  constructor(scope: Construct, name: string, props: ConstantVariableProps) {
    super(scope, name, { ...props, hide: VariableHide.hideVariable });

    this.value = props.value;
  }

  public override toJSON(): VariableModel {
    return {
      ...this.base(),
      query: this.value,
      current: { text: this.value, value: this.value, selected: true },
      options: [{ text: this.value, value: this.value, selected: true }],
      skipUrlSync: this.skipUrlSync ?? false,
    };
  }
}

export interface DataSourceVariableProps extends SelectableVariableProps {
  /** Plugin id whose instances the picker lists, e.g. `cloudwatch`. */
  pluginId: string;
  /** Limit the listed instances to those whose name matches. */
  regex?: string;
}

/** Swaps every panel's data source for another instance of the same plugin. */
export class DataSourceVariable extends Variable {
  public override readonly type = 'datasource' as const;

  public readonly pluginId: string;
  public readonly regex?: string;
  public readonly multi: boolean;
  public readonly includeAll: boolean;

  constructor(scope: Construct, name: string, props: DataSourceVariableProps) {
    super(scope, name, props);

    this.pluginId = props.pluginId;
    this.regex = props.regex;
    this.multi = props.multi ?? false;
    this.includeAll = props.includeAll ?? false;
  }

  public override toJSON(): VariableModel {
    return {
      ...this.base(),
      query: this.pluginId,
      multi: this.multi,
      includeAll: this.includeAll,
      options: [],
      ...(this.regex === undefined ? {} : { regex: this.regex }),
    };
  }
}

export interface IntervalVariableProps extends VariableProps {
  /** The selectable intervals. */
  intervals: DurationString[];
  /** Add an `auto` entry that scales with the dashboard's time range. */
  auto?: boolean;
  /** How many steps `auto` divides the range into. */
  autoCount?: number;
  /** Floor for the `auto` interval. */
  autoMin?: DurationString;
}

/** A time interval, for `$__interval`-style query granularity. */
export class IntervalVariable extends Variable {
  public override readonly type = 'interval' as const;

  public readonly intervals: DurationString[];
  public readonly auto: boolean;
  public readonly autoCount: number;
  public readonly autoMin: DurationString;

  constructor(scope: Construct, name: string, props: IntervalVariableProps) {
    super(scope, name, props);

    if (props.intervals.length === 0) {
      throw new RangeError(`Interval variable '${name}' has no intervals; its picker would be empty.`);
    }

    this.intervals = props.intervals;
    this.auto = props.auto ?? false;
    this.autoCount = props.autoCount ?? 30;
    this.autoMin = props.autoMin ?? '10s';
  }

  public override toJSON(): VariableModel {
    const options = (this.auto ? ['auto', ...this.intervals] : this.intervals).map((value, index) => ({
      text: value,
      value,
      selected: index === 0,
    }));

    return {
      ...this.base(),
      query: this.intervals.join(','),
      options,
      current: options[0],
      // Grafana reads these three off the variable model, not off `query`.
      ...({ auto: this.auto, auto_count: this.autoCount, auto_min: this.autoMin } as Partial<VariableModel>),
    };
  }
}

export interface TextBoxVariableProps extends VariableProps {
  /** Value the box starts with. */
  defaultValue?: string;
}

/** A free-text input. */
export class TextBoxVariable extends Variable {
  public override readonly type = 'textbox' as const;

  public readonly defaultValue: string;

  constructor(scope: Construct, name: string, props: TextBoxVariableProps = {}) {
    super(scope, name, props);

    this.defaultValue = props.defaultValue ?? '';
  }

  public override toJSON(): VariableModel {
    return {
      ...this.base(),
      query: this.defaultValue,
      current: { text: this.defaultValue, value: this.defaultValue, selected: false },
      options: [{ text: this.defaultValue, value: this.defaultValue, selected: false }],
    };
  }
}

export interface AdHocVariableProps extends VariableProps {
  /** Data source the filters are applied to. */
  datasource: DataSource | DataSourceRef;
  /** Filters present when the dashboard loads. */
  filters?: Array<{ key: string; operator: string; value: string }>;
}

/** Key/value filters applied to every query against one data source. */
export class AdHocVariable extends Variable {
  public override readonly type = 'adhoc' as const;

  public readonly datasource: DataSourceRef;
  public readonly filters: Array<{ key: string; operator: string; value: string }>;

  constructor(scope: Construct, name: string, props: AdHocVariableProps) {
    super(scope, name, props);

    this.datasource = asRef(props.datasource);
    this.filters = props.filters ?? [];
  }

  public override toJSON(): VariableModel {
    return {
      ...this.base(),
      datasource: this.datasource,
      ...({ filters: this.filters } as Partial<VariableModel>),
    };
  }
}

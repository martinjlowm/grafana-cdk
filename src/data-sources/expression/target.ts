import { DataSourceTarget, type DataSourceTargetProps } from '#@/data-source.js';
import type { ExpressionDataSource } from '#@/data-sources/expression/data-source.js';

/**
 * The server-side expression kinds Grafana's `__expr__` data source supports.
 * Each reads different fields off the query, which is why they are separate
 * props types below rather than one optional-everything interface.
 */
export type ExpressionType = 'math' | 'reduce' | 'resample' | 'classic_conditions' | 'threshold' | 'sql';

export interface MathExpressionProps extends DataSourceTargetProps {
  type?: 'math';
  /** Metric math over other targets, addressed as `$A`, `$B`. */
  expression: string;
}

export interface ReduceExpressionProps extends DataSourceTargetProps {
  type: 'reduce';
  /** refId of the query to reduce. */
  expression: string;
  /** `mean`, `min`, `max`, `sum`, `count`, `last`. */
  reducer: string;
  /** What to do with non-numeric values. */
  settings?: { mode?: 'dropNN' | 'replaceNN'; replaceWithValue?: number };
}

export interface ResampleExpressionProps extends DataSourceTargetProps {
  type: 'resample';
  /** refId of the query to resample. */
  expression: string;
  /** Target interval, e.g. `10m`. */
  window: string;
  /** Aggregation applied within each window. */
  downsampler: string;
  /** How empty windows are filled. */
  upsampler: string;
}

export interface ThresholdExpressionProps extends DataSourceTargetProps {
  type: 'threshold';
  /** refId of the query to threshold. */
  expression: string;
  conditions: Array<{
    evaluator: { type: 'gt' | 'lt' | 'within_range' | 'outside_range'; params: number[] };
  }>;
}

export type ExpressionTargetProps =
  | MathExpressionProps
  | ReduceExpressionProps
  | ResampleExpressionProps
  | ThresholdExpressionProps;

/** A server-side expression. Built through {@link ExpressionDataSource.createTarget}. */
export class ExpressionTarget extends DataSourceTarget {
  public readonly type: ExpressionType;
  public readonly expression: string;

  readonly #extra: Record<string, unknown>;

  constructor(scope: ExpressionDataSource, id: string, props: ExpressionTargetProps) {
    super(scope, id, { hide: props.hide, refId: props.refId });

    this.type = props.type ?? 'math';
    this.expression = props.expression;

    switch (props.type) {
      case 'reduce':
        this.#extra = {
          reducer: props.reducer,
          ...(props.settings === undefined ? {} : { settings: props.settings }),
        };
        break;
      case 'resample':
        this.#extra = {
          window: props.window,
          downsampler: props.downsampler,
          upsampler: props.upsampler,
        };
        break;
      case 'threshold':
        this.#extra = { conditions: props.conditions };
        break;
      default:
        this.#extra = {};
    }
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...this.base(),
      type: this.type,
      expression: this.expression,
      ...this.#extra,
    };
  }
}

import { DataSourceTarget, type DataSourceTargetProps } from '#@/data-source.ts';
import type { CloudWatchDataSource } from '#@/data-sources/cloudwatch/data-source.ts';
import type { DurationString } from '#@/duration.ts';

/**
 * Shapes mirrored from grafana/grafana
 * `packages/grafana-schema/src/raw/composable/cloudwatch/dataquery`, which the
 * published `@grafana/schema` does not export.
 */

/** A name/value pair identifying a metric, e.g. `{InstanceId: 'i-0123'}`. */
export type Dimensions = Record<string, string | string[]>;

/** Which of the CloudWatch plugin's three query kinds this target is. */
export type CloudWatchQueryMode = 'Metrics' | 'Logs' | 'Annotations';

/** Metric search versus Metrics Insights SQL. */
export enum MetricQueryType {
  Search = 0,
  Insights = 1,
}

/** Whether the query was authored in the builder or the code editor. */
export enum MetricEditorMode {
  Builder = 0,
  Code = 1,
}

/**
 * `default` uses the data source's configured region; anything else is an AWS
 * region id. Kept open rather than enumerated so a new region does not need a
 * release of this package.
 */
export type CloudWatchRegion = 'default' | (string & {});

/**
 * Period accepts a second count, one of Grafana's interval strings, or `auto`.
 * Typed as the union so `period: 86400` and `period: '5m'` are both accepted
 * and both serialise to the string CloudWatch expects.
 */
export type CloudWatchPeriod = number | DurationString | 'auto';

export interface CloudWatchDataSourceTargetProps extends DataSourceTargetProps {
  /** AWS account to query; `all` fans out across a monitoring account's members. */
  accountId?: string;
  /** Dimensions narrowing the metric. */
  dimensions?: Dimensions;
  /** Metric math expression, evaluated over the other targets' results. */
  expression?: string;
  /**
   * Identifier used by metric math. Must start with a lowercase letter and
   * contain only letters, digits and underscores — CloudWatch rejects the
   * query otherwise, with an error Grafana surfaces as an empty panel.
   */
  id?: string;
  /** Dynamic label for the series, e.g. `${PROP('Dim.InstanceId')}`. */
  label?: string;
  /** Log groups, for `queryMode: 'Logs'`. */
  logGroups?: unknown[];
  /** Only return metrics matching every named dimension exactly. */
  matchExact?: boolean;
  metricEditorMode?: MetricEditorMode;
  /** Metric name within the namespace, e.g. `Latency`. */
  metricName?: string;
  metricQueryType?: MetricQueryType;
  /** CloudWatch namespace, e.g. `AWS/ApiGateway`. */
  namespace: string;
  /** Aggregation period. */
  period?: CloudWatchPeriod;
  queryMode?: CloudWatchQueryMode;
  region?: CloudWatchRegion;
  /** Metrics Insights SQL, for `metricQueryType: Insights`. */
  sqlExpression?: string;
  /** CloudWatch statistic, e.g. `Average`, `Sum`, `p99`. */
  statistic?: string;
}

const METRIC_MATH_ID = /^[a-z][a-zA-Z0-9_]*$/;

/** A CloudWatch query. Built through {@link CloudWatchDataSource.createTarget}. */
export class CloudWatchDataSourceTarget extends DataSourceTarget {
  public readonly accountId: string;
  public readonly dimensions: Dimensions;
  public readonly expression: string;
  public readonly id: string;
  public readonly label: string;
  public readonly logGroups: unknown[];
  public readonly matchExact: boolean;
  public readonly metricEditorMode: MetricEditorMode;
  public readonly metricName?: string;
  public readonly metricQueryType: MetricQueryType;
  public readonly namespace: string;
  public readonly period: string;
  public readonly queryMode: CloudWatchQueryMode;
  public readonly region: CloudWatchRegion;
  public readonly sqlExpression: string;
  public readonly statistic?: string;

  constructor(scope: CloudWatchDataSource, id: string, props: CloudWatchDataSourceTargetProps) {
    super(scope, id, { hide: props.hide, refId: props.refId });

    if (props.id && !METRIC_MATH_ID.test(props.id)) {
      throw new SyntaxError(
        `CloudWatch metric math id ${JSON.stringify(props.id)} is invalid: it must start with a lowercase letter and contain only letters, digits and underscores.`,
      );
    }

    this.accountId = props.accountId ?? 'all';
    this.dimensions = props.dimensions ?? {};
    this.expression = props.expression ?? '';
    this.id = props.id ?? '';
    this.label = props.label ?? '';
    this.logGroups = props.logGroups ?? [];
    this.matchExact = props.matchExact ?? true;
    this.metricEditorMode = props.metricEditorMode ?? MetricEditorMode.Builder;
    this.metricName = props.metricName;
    this.metricQueryType = props.metricQueryType ?? MetricQueryType.Search;
    this.namespace = props.namespace;
    this.period = `${props.period ?? ''}`;
    this.queryMode = props.queryMode ?? 'Metrics';
    this.region = props.region ?? 'default';
    this.sqlExpression = props.sqlExpression ?? '';
    this.statistic = props.statistic;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...this.base(),
      accountId: this.accountId,
      dimensions: this.dimensions,
      expression: this.expression,
      id: this.id,
      label: this.label,
      logGroups: this.logGroups,
      matchExact: this.matchExact,
      metricEditorMode: this.metricEditorMode,
      ...(this.metricName === undefined ? {} : { metricName: this.metricName }),
      metricQueryType: this.metricQueryType,
      namespace: this.namespace,
      period: this.period,
      queryMode: this.queryMode,
      region: this.region,
      sqlExpression: this.sqlExpression,
      ...(this.statistic === undefined ? {} : { statistic: this.statistic }),
    };
  }
}

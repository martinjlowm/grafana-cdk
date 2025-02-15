import { DataSourceTarget, type DataSourceTargetProps } from '#@/data-source.js';
import type { CloudWatchDataSource } from '#@/data-sources/cloudwatch/data-source.js';

interface Dimensions {
  ApiName: string;
}

// TODO: Generate from AWS docs
type MetricName = 'Latency';

type Namespace = 'ApiGateway' | 'Lambda';
type AWSNamespace = `AWS/${Namespace}`;
type QueryMode = 'Metrics';
type Region = 'default' | 'eu-west-1';
type Statistic = 'p99';

namespace Duration {
  export type Seconds = number;
}

export type CloudWatchDataSourceTargetProps = {
  accountId?: string;
  dimensions: Dimensions;
  expression: string;
  label?: string;
  logGroups?: [];
  matchExact?: boolean;
  metricEditorMode?: number;
  metricName: MetricName;
  hide?: boolean;
  metricQueryType?: number;
  namespace: AWSNamespace;
  // FIXME: Adjust this to a proper Duration typesafe implementation
  period: Duration.Seconds;
  queryMode: QueryMode;
  refId: string;
  region?: Region;
  sqlExpression?: string;
  statistic: Statistic;
};
// Create this from the data source to sync the datasource reference
//Ggotta figure out the nature of the redundant data source references
export class CloudWatchDataSourceTarget extends DataSourceTarget {
  accountId: string;
  dimensions: Dimensions;
  expression: string;
  id: string;
  label: string;
  logGroups: [];
  matchExact: boolean;
  metricEditorMode: number;
  metricName: MetricName;
  metricQueryType: number;
  namespace: AWSNamespace;
  period: string;
  queryMode: string;
  region: Region;
  sqlExpression: string;
  statistic: Statistic;

  constructor(
    scope: CloudWatchDataSource,
    uid: string,
    { hide, refId, ...props }: DataSourceTargetProps & CloudWatchDataSourceTargetProps,
  ) {
    super(scope, uid, { hide, refId });

    this.accountId = props.accountId || 'all';
    this.datasource = scope;
    this.dimensions = props.dimensions;
    this.expression = props.expression;
    this.id = '';
    this.label = props.label || '';
    this.logGroups = props.logGroups || [];
    this.matchExact = props.matchExact ?? true;
    this.metricEditorMode = props.metricEditorMode ?? 0;
    this.metricName = props.metricName;
    this.metricQueryType = props.metricQueryType ?? 0;
    this.namespace = props.namespace;
    this.period = `${props.period}`;
    this.queryMode = props.queryMode;
    this.region = props.region || 'default';
    this.sqlExpression = props.sqlExpression || '';
    this.statistic = props.statistic;
  }
}

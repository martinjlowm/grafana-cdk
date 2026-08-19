import {
  App,
  Dashboard,
  DataSource,
  DataSourceTarget,
  type DataSourceTargetProps,
  TimeSeriesPanel,
} from '@martinjlowm/grafana-cdk';
import type { Construct } from 'constructs';

// A query against the plugin. `base()` supplies refId, datasource and hide;
// everything after it is the plugin's own shape.
export interface PrometheusTargetProps extends DataSourceTargetProps {
  expr: string;
  legendFormat?: string;
  range?: boolean;
  instant?: boolean;
}

export class PrometheusTarget extends DataSourceTarget {
  public readonly expr: string;
  public readonly legendFormat?: string;
  public readonly range: boolean;
  public readonly instant: boolean;

  constructor(scope: PrometheusDataSource, id: string, props: PrometheusTargetProps) {
    super(scope, id, { hide: props.hide, refId: props.refId });

    if (!props.expr.trim()) {
      throw new SyntaxError(`Prometheus target '${id}' has no expression.`);
    }

    this.expr = props.expr;
    this.legendFormat = props.legendFormat;
    this.range = props.range ?? true;
    this.instant = props.instant ?? false;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...this.base(),
      expr: this.expr,
      range: this.range,
      instant: this.instant,
      ...(this.legendFormat === undefined ? {} : { legendFormat: this.legendFormat }),
    };
  }
}

// The data source itself: a plugin type id, an instance uid, and a factory that
// binds the target to it so the two references cannot drift apart.
export class PrometheusDataSource extends DataSource {
  constructor(scope: Construct, uid: string, id = 'prometheus-data-source') {
    super(scope, id, { type: 'prometheus', uid });
  }

  public createTarget(id: string, props: PrometheusTargetProps): PrometheusTarget {
    return new PrometheusTarget(this, id, props);
  }
}

const app = new App();
const dashboard = new Dashboard(app, 'prometheus', { title: 'Prometheus', uid: 'prometheus-1' });
const prometheus = new PrometheusDataSource(app, '<datasource-uid>');

dashboard.addPanel(
  new TimeSeriesPanel(dashboard, 'request-rate', {
    title: 'Request rate',
    datasource: prometheus,
    gridPos: { w: 12, h: 8 },
    targets: [
      prometheus.createTarget('rate', {
        refId: 'A',
        expr: 'sum(rate(http_requests_total[5m])) by (status)',
        legendFormat: '{{status}}',
      }),
    ],
  }),
);

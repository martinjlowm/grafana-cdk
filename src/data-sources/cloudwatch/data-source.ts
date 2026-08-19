import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';
import { CloudWatchDataSourceTarget, type CloudWatchDataSourceTargetProps } from '#@/data-sources/cloudwatch/target.js';

/** The Amazon CloudWatch data source plugin, bundled with Grafana. */
export class CloudWatchDataSource extends DataSource {
  constructor(scope: Construct, uid: string, id = 'cloudwatch-data-source') {
    super(scope, id, {
      type: 'cloudwatch',
      uid,
    });
  }

  /**
   * Adds a query against this data source. Going through the data source is
   * what keeps a target's `datasource` ref and the panel's in step.
   */
  public createTarget(id: string, props: CloudWatchDataSourceTargetProps): CloudWatchDataSourceTarget {
    return new CloudWatchDataSourceTarget(this, id, props);
  }
}

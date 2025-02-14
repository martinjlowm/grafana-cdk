import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';
import { CloudWatchDataSourceTarget, type CloudWatchDataSourceTargetProps } from '#@/data-sources/cloudwatch/target.js';

export class CloudWatchDataSource extends DataSource {
  constructor(scope: Construct, uid: string) {
    super(scope, 'cloudwatch-data-source', {
      type: 'cloudwatch',
      uid,
    });
  }

  createTarget(id: string, props: CloudWatchDataSourceTargetProps): CloudWatchDataSourceTarget {
    return new CloudWatchDataSourceTarget(this, id, props);
  }
}

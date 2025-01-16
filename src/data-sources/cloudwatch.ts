import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source';

export class CloudWatchDataSource extends DataSource {
  constructor(scope: Construct, uid: string) {
    super(scope, 'cloudwatch-data-source', {
      type: 'cloudwatch',
      uid,
    });
  }
}

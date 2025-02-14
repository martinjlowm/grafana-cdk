import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';

export class GrafanaDataSource extends DataSource {
  constructor(scope: Construct) {
    super(scope, 'grafana-data-source', {
      type: 'grafana',
      uid: '-- Grafana --',
    });
  }
}

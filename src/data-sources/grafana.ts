import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';

/**
 * Grafana's built-in data source — the one every dashboard's default
 * annotation query points at. `-- Grafana --` is a reserved uid, so there is
 * nothing to provision and nothing to pass.
 */
export class GrafanaDataSource extends DataSource {
  constructor(scope: Construct, id = 'grafana-data-source') {
    super(scope, id, {
      type: 'grafana',
      uid: '-- Grafana --',
    });
  }
}

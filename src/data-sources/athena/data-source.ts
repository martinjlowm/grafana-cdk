import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.ts';
import { AthenaTarget, type AthenaTargetProps } from '#@/data-sources/athena/target.ts';

/**
 * The Amazon Athena data source plugin (`grafana-athena-datasource`).
 *
 * Not bundled with Grafana — the plugin has to be installed on the instance,
 * and on Amazon Managed Grafana it is one of the plugins the workspace enables.
 */
export class AthenaDataSource extends DataSource {
  constructor(scope: Construct, uid: string, id = 'athena-data-source') {
    super(scope, id, {
      type: 'grafana-athena-datasource',
      uid,
    });
  }

  public createTarget(id: string, props: AthenaTargetProps): AthenaTarget {
    return new AthenaTarget(this, id, props);
  }
}

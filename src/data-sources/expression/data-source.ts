import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';
import { ExpressionTarget, type ExpressionTargetProps } from '#@/data-sources/expression/target.js';

/**
 * Grafana's built-in server-side expression data source.
 *
 * Not provisioned like a real data source — `__expr__` is a reserved uid every
 * Grafana instance recognises — so the constructor takes no uid.
 */
export class ExpressionDataSource extends DataSource {
  constructor(scope: Construct, id = 'expression-data-source') {
    super(scope, id, {
      name: 'Expression',
      type: '__expr__',
      uid: '__expr__',
    });
  }

  public createTarget(id: string, props: ExpressionTargetProps): ExpressionTarget {
    return new ExpressionTarget(this, id, props);
  }
}

import type { Construct } from 'constructs';

import { DataSource } from '#@/data-source.js';
import { ExpressionTarget, type ExpressionTargetProps } from '#@/data-sources/expression/target.js';

export class ExpressionDataSource extends DataSource {
  constructor(scope: Construct) {
    super(scope, 'expression-data-source', {
      type: '__expr__',
      uid: '__expr__',
    });
  }

  createTarget(id: string, { expression, refId }: ExpressionTargetProps): ExpressionTarget {
    return new ExpressionTarget(this, id, {
      expression,
      refId,
    });
  }
}

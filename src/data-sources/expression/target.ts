import { type DataSource, DataSourceTarget, type DataSourceTargetProps } from '#@/data-source.js';

export type ExpressionTargetProps = {
  refId: string;
  expression: string;
};

// Create this from the data source to sync the datasource reference
// Gotta figure out the nature of the redundant data source references
export class ExpressionTarget extends DataSourceTarget {
  expression: string;
  type: 'math';

  constructor(
    scope: DataSource,
    uid: string,
    { hide, refId, ...props }: DataSourceTargetProps & ExpressionTargetProps,
  ) {
    super(scope, uid, { hide, refId });

    this.expression = props.expression;
    this.type = 'math';
  }
}

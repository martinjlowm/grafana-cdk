import { Construct } from 'constructs';

export type ExpressionTargetProps = {
  expression: string;
  refId: string;
};

// Create this from the data source to sync the datasource reference
// Gotta figure out the nature of the redundant data source references
export class ExpressionTarget extends Construct {
  expression: string;
  refId: string;

  constructor(scope: Construct, uid: string, props: ExpressionTargetProps) {
    super(scope, uid);

    this.expression = props.expression;
    this.refId = props.refId;
  }

  asRef() {
    return this.refId;
  }
}

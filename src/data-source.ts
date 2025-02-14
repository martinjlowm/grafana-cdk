import type { DataSourceRef } from '@grafana/schema';
import { Construct } from 'constructs';

export type DataSourceTargetProps = {
  hide?: boolean;
  refId: string;
};

export type IDataSource = {
  type: string;
  uid: string;
};

type DataSourceProps = {
  name?: string;
  type: string;
  uid: string;
};

export class DataSourceTarget extends Construct {
  hide: boolean;
  datasource: DataSource;
  refId: string;

  constructor(scope: DataSource, id: string, props: DataSourceTargetProps) {
    super(scope, id);

    this.hide = false;
    this.datasource = scope;
    this.refId = props.refId;
  }

  asRef() {
    return `$${this.refId}`;
  }
}

export class DataSource extends Construct {
  public readonly name?: string;
  public readonly type: string;
  public readonly uid: string;

  constructor(scope: Construct, id: string, props: DataSourceProps) {
    super(scope, id);

    this.name = props.name;
    this.type = props.type;
    this.uid = props.uid;
  }

  asRef(): DataSourceRef {
    return {
      type: this.type,
      uid: this.uid,
    };
  }
}

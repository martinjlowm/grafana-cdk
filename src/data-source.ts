import type { DataSourceRef } from '@grafana/schema';
import { Construct } from 'constructs';

export type IDataSourceTarget = {
  datasource: DataSource;
};

export type IDataSource = {
  type: string;
  uid: string;
};

type DataSourceProps = {
  type: string;
  uid: string;
};

export class DataSource extends Construct {
  public readonly type: string;
  public readonly uid: string;

  constructor(scope: Construct, id: string, props: DataSourceProps) {
    super(scope, id);

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

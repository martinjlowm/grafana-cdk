import type {
  AnnotationPanelFilter,
  AnnotationTarget,
  DataQuery,
  AnnotationQuery as IAnnotationQuery,
} from '@grafana/schema';
import { Construct } from 'constructs';

import type { DataSource } from '#@/data-source';

type AnnotationQueryProps = {
  datasource?: DataSource | null;
  snapshotData?: unknown;
  builtIn?: number;
  enable?: boolean;
  filter?: AnnotationPanelFilter;
  hide?: boolean;
  iconColor?: string;
  name: string;
  target?: AnnotationTarget;
  type?: string;
};

export class AnnotationQuery<TQuery extends DataQuery = DataQuery> extends Construct implements IAnnotationQuery {
  public readonly builtIn?: number;
  public readonly datasource?: DataSource | null;
  public readonly snapshotData?: unknown;

  public readonly enable: boolean;
  public readonly filter?: AnnotationPanelFilter;
  public readonly hide?: boolean;
  public readonly iconColor: string;
  public readonly name: string;
  public readonly target?: TQuery;
  public readonly type?: string;

  constructor(scope: Construct, id: string, props: AnnotationQueryProps) {
    super(scope, id);

    this.builtIn = props.builtIn || 1;
    this.datasource = props.datasource;
    this.enable = props.enable || true;
    this.hide = props.hide || true;
    this.iconColor = props.iconColor || 'rgba(0, 211, 255, 1)';
    this.name = props.name;
    this.type = props.type;
  }
}

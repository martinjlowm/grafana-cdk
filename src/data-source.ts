import type { DataQuery, DataSourceRef } from '@grafana/schema';
import { Construct } from 'constructs';

export type { DataQuery, DataSourceRef };

export interface DataSourceTargetProps {
  /**
   * Run the query but do not draw it. Used for queries that only exist to feed
   * an expression.
   */
  hide?: boolean;
  /**
   * Identifier other queries and expressions refer to — `A`, `B`, `C` by
   * convention. Unique within a panel; {@link Panel} enforces that.
   */
  refId: string;
}

export interface DataSourceProps {
  /** Display name. Only some data sources (expressions) carry one in the JSON. */
  name?: string;
  /** Plugin type id, e.g. `cloudwatch`, `grafana-athena-datasource`. */
  type: string;
  /** Instance uid, as provisioned in the Grafana instance. */
  uid: string;
}

/**
 * One query on a panel.
 *
 * Grafana types `Panel.targets` as `Array<Record<string, unknown>>`, so the
 * shape of a query is entirely up to the data source plugin and entirely
 * unchecked. Each data source in this package therefore ships its own target
 * subclass, built through the data source's `createTarget` so the target and
 * the `datasource` ref it carries cannot disagree.
 */
export abstract class DataSourceTarget extends Construct implements DataQuery {
  public readonly hide: boolean;
  public readonly datasource: DataSource;
  public readonly refId: string;

  constructor(scope: DataSource, id: string, props: DataSourceTargetProps) {
    super(scope, id);

    if (!props.refId) {
      throw new SyntaxError(
        `Query target '${id}' has an empty refId; expressions and panels address queries by refId.`,
      );
    }

    this.hide = props.hide ?? false;
    this.datasource = scope;
    this.refId = props.refId;
  }

  /**
   * `$refId` — how an expression query addresses this one's result.
   */
  public asRef(): string {
    return `$${this.refId}`;
  }

  /** The fields every target carries, in the order Grafana's own JSON uses. */
  protected base(): Record<string, unknown> {
    return {
      refId: this.refId,
      datasource: this.datasource.asRef(),
      hide: this.hide,
    };
  }

  public abstract toJSON(): Record<string, unknown>;
}

/**
 * A provisioned Grafana data source.
 *
 * Holds the `{type, uid}` pair that every panel, target, annotation and
 * variable referring to it must repeat — the redundancy is Grafana's, and
 * routing it all through {@link asRef} is what keeps the copies identical.
 */
export class DataSource extends Construct {
  public readonly name?: string;
  public readonly type: string;
  public readonly uid: string;

  constructor(scope: Construct, id: string, props: DataSourceProps) {
    super(scope, id);

    if (!props.uid) {
      throw new SyntaxError(`Data source '${id}' has an empty uid; Grafana resolves data sources by uid.`);
    }

    this.name = props.name;
    this.type = props.type;
    this.uid = props.uid;
  }

  public asRef(): DataSourceRef {
    return {
      ...(this.name === undefined ? {} : { name: this.name }),
      type: this.type,
      uid: this.uid,
    } as DataSourceRef;
  }

  public toJSON(): DataSourceRef {
    return this.asRef();
  }
}

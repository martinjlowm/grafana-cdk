import { DataSourceTarget, type DataSourceTargetProps } from '#@/data-source.js';
import type { AthenaDataSource } from '#@/data-sources/athena/data-source.js';

/**
 * How the plugin should shape the result set.
 *
 * Serialised as an integer, and the two values are easy to swap by accident:
 * a time series query returned as a table renders as an empty panel rather than
 * an error.
 */
export enum AthenaQueryFormat {
  TimeSeries = 0,
  Table = 1,
  Logs = 2,
}

/**
 * Where the query runs. `__default` defers to the data source's own
 * configuration, which is what a provisioned data source normally wants.
 */
export interface AthenaConnectionArgs {
  region?: string;
  catalog?: string;
  database?: string;
  /** Reuse a previous result set if one is recent enough — cuts Athena spend. */
  resultReuseEnabled?: boolean;
  /** How old a reusable result may be, in minutes. Athena's own cap is 10080. */
  resultReuseMaxAgeInMinutes?: number;
}

export interface AthenaTargetProps extends DataSourceTargetProps {
  /** The SQL to run. */
  rawSQL: string;
  format?: AthenaQueryFormat;
  connectionArgs?: AthenaConnectionArgs;
}

const DEFAULT_CONNECTION_ARGS: AthenaConnectionArgs = {
  region: '__default',
  catalog: '__default',
  database: '__default',
};

/** An Amazon Athena query. Built through {@link AthenaDataSource.createTarget}. */
export class AthenaTarget extends DataSourceTarget {
  public readonly rawSQL: string;
  public readonly format: AthenaQueryFormat;
  public readonly connectionArgs: AthenaConnectionArgs;

  constructor(scope: AthenaDataSource, id: string, props: AthenaTargetProps) {
    super(scope, id, { hide: props.hide, refId: props.refId });

    if (!props.rawSQL.trim()) {
      throw new SyntaxError(`Athena target '${id}' has no SQL.`);
    }

    const maxAge = props.connectionArgs?.resultReuseMaxAgeInMinutes;
    if (maxAge !== undefined && (maxAge < 1 || maxAge > 10_080)) {
      throw new RangeError(
        `resultReuseMaxAgeInMinutes must be between 1 and 10080 (Athena's own limit), got ${maxAge}.`,
      );
    }

    this.rawSQL = props.rawSQL;
    this.format = props.format ?? AthenaQueryFormat.Table;
    this.connectionArgs = { ...DEFAULT_CONNECTION_ARGS, ...props.connectionArgs };
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...this.base(),
      format: this.format,
      rawSQL: this.rawSQL,
      connectionArgs: this.connectionArgs,
    };
  }
}

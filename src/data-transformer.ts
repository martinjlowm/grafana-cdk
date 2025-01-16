import { Construct } from 'constructs';
import type { DataTopic, DataTransformerConfig, MatcherConfig } from '@grafana/schema';

type DataTransformerProps = DataTransformerConfig;

export class DataTransformer extends Construct implements DataTransformerConfig {

  public readonly disabled?: boolean;
  public readonly filter?: MatcherConfig;
  public readonly id: string;
  public readonly options: unknown;
  public readonly topic?: DataTopic;

  constructor(scope: Construct, id: string, props: DataTransformerProps) {
    super(scope, id);

    this.disabled = props.disabled;
    this.filter = props.filter;
    this.id = props.id;
    this.options = props.options;
    this.topic = props.topic;
  }

  toJSON() {
    return JSON.stringify(this);
  }
}

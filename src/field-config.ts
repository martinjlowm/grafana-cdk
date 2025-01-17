import type {
  FieldColor,
  FieldConfigSource,
  FieldConfig as IFieldConfig,
  ThresholdsConfig,
  ValueMapping,
} from '@grafana/schema';
import { FieldColorModeId, ThresholdsMode } from '@grafana/schema';
import { Construct } from 'constructs';

export type FieldConfigProps = {
  color?: FieldColor;
  custom?: Record<string, unknown>;
  decimals?: number;
  description?: string;
  displayName?: string;
  displayNameFromDS?: string;
  filterable?: boolean;
  links?: Array<unknown>;
  mappings?: Array<ValueMapping>;
  max?: number;
  min?: number;
  noValue?: string;
  path?: string;
  thresholds?: ThresholdsConfig;
  unit?: string;
  writeable?: boolean;
} & { overrides?: FieldConfigSource['overrides'] };

export class FieldConfig extends Construct {
  public readonly defaults: IFieldConfig;
  public readonly overrides: FieldConfigSource['overrides'];

  constructor(scope: Construct, id: string, props: FieldConfigProps = {}) {
    super(scope, id);

    const { overrides = [], ...defaults } = props;
    this.defaults = {
      color: {
        mode: FieldColorModeId.Thresholds,
      },
      decimals: 1,
      mappings: [],
      thresholds: {
        mode: ThresholdsMode.Absolute,
        steps: [
          {
            color: 'green',
            value: null,
          },
          {
            color: 'red',
            value: 5000,
          },
        ],
      },
      ...defaults,
    };
    this.overrides = overrides;
  }
}

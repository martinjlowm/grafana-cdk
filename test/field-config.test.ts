import { describe, expect, it } from 'bun:test';

import { duration, durationToMilliseconds, isDuration } from '#@/duration.js';
import {
  DataTopic,
  MappingType,
  SpecialValueMatch,
  ThresholdsMode,
  customTransformation,
  fieldOverride,
  fixedColorOverride,
  rangeMap,
  regexMap,
  specialValueMap,
  thresholds,
  transformation,
  valueMap,
} from '#@/index.js';

describe('thresholds', () => {
  it('adds the implicit base step the schema requires', () => {
    expect(thresholds({ steps: [{ color: 'red', value: 80 }] })).toEqual({
      mode: ThresholdsMode.Absolute,
      steps: [
        { color: 'green', value: null },
        { color: 'red', value: 80 },
      ],
    });
  });

  it('sorts steps by value', () => {
    const config = thresholds({
      steps: [
        { color: 'red', value: 90 },
        { color: 'yellow', value: 50 },
      ],
    });

    expect(config.steps.map((step) => step.value)).toEqual([null, 50, 90]);
  });

  it('rejects duplicate step values', () => {
    expect(() =>
      thresholds({
        steps: [
          { color: 'red', value: 5 },
          { color: 'blue', value: 5 },
        ],
      }),
    ).toThrow(RangeError);
  });

  it('rejects percentage steps expressed as 0–100', () => {
    expect(() => thresholds({ mode: ThresholdsMode.Percentage, steps: [{ color: 'red', value: 80 }] })).toThrow(
      /fractions of the field's min\/max/,
    );
  });
});

describe('value mappings', () => {
  it('builds each member of the union with its own options shape', () => {
    expect(valueMap({ '0': { text: 'Off', color: 'red' } }).type).toBe(MappingType.ValueToText);
    expect(rangeMap(0, 10, { text: 'Low' })).toEqual({
      type: MappingType.RangeToText,
      options: { from: 0, to: 10, result: { text: 'Low' } },
    });
    expect(regexMap('^prod-', { text: 'Production' }).type).toBe(MappingType.RegexToText);
    expect(specialValueMap(SpecialValueMatch.Null, { text: 'N/A' }).type).toBe(MappingType.SpecialValue);
  });

  it('accepts open-ended ranges', () => {
    expect(rangeMap(null, 0, { text: 'Negative' }).options.from).toBeNull();
  });

  it('rejects an inverted range that could never match', () => {
    expect(() => rangeMap(10, 0, { text: 'nope' })).toThrow(RangeError);
  });

  it('rejects a pattern that is not a regular expression', () => {
    expect(() => regexMap('([', { text: 'nope' })).toThrow(SyntaxError);
  });
});

describe('field overrides', () => {
  it('pairs a matcher with its properties', () => {
    expect(fixedColorOverride('Online', 'green')).toEqual({
      matcher: { id: 'byName', options: 'Online' },
      properties: [{ id: 'color', value: { mode: 'fixed', fixedColor: 'green' } }],
    });
  });

  it('rejects an override that would apply nothing', () => {
    expect(() => fieldOverride({ id: 'byType', options: 'number' }, [])).toThrow(RangeError);
  });
});

describe('transformations', () => {
  it('emits the transformer id alongside its own options', () => {
    expect(
      transformation('rowsToFields', {
        options: { mappings: [{ fieldName: 'tbl', handlerKey: 'field.name' }] },
      }),
    ).toEqual({
      id: 'rowsToFields',
      options: { mappings: [{ fieldName: 'tbl', handlerKey: 'field.name' }] },
    });
  });

  it('carries an optional frame filter and topic', () => {
    expect(
      transformation('limit', {
        options: { limitField: 10 },
        filter: { id: 'byFrameRefID', options: 'A' },
        topic: DataTopic.Series,
        disabled: true,
      }),
    ).toEqual({
      id: 'limit',
      options: { limitField: 10 },
      disabled: true,
      filter: { id: 'byFrameRefID', options: 'A' },
      topic: DataTopic.Series,
    });
  });

  it('leaves an escape hatch for transformers it does not model', () => {
    expect(customTransformation('myPluginTransform', { anything: true })).toEqual({
      id: 'myPluginTransform',
      options: { anything: true },
    });
  });
});

describe('durations', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['5m', 300_000],
    ['1h', 3_600_000],
    ['7d', 604_800_000],
  ])('converts %s', (value, milliseconds) => {
    expect(durationToMilliseconds(value)).toBe(milliseconds);
  });

  it.each(['5', 'm', '5 m', '5min', 'now-5m', ''])('rejects %p', (value) => {
    expect(isDuration(value)).toBe(false);
    expect(() => durationToMilliseconds(value)).toThrow(TypeError);
  });

  it('distinguishes minutes from months', () => {
    expect(durationToMilliseconds(duration('1m'))).toBeLessThan(durationToMilliseconds(duration('1M')));
  });
});

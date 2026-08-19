import {
  MappingType,
  type RangeMap,
  type RegexMap,
  type SpecialValueMap,
  SpecialValueMatch,
  type ValueMap,
  type ValueMapping,
  type ValueMappingResult,
} from '@grafana/schema';

export { MappingType, SpecialValueMatch };
export type { RangeMap, RegexMap, SpecialValueMap, ValueMap, ValueMapping, ValueMappingResult };

/**
 * Builders for the four members of the `ValueMapping` union.
 *
 * The union discriminates on a `MappingType` enum whose members do not match
 * their names (`MappingType.ValueToText === 'value'`), and each member nests
 * its payload under a differently-shaped `options`. Writing them by hand type
 * checks right up until you put a `RangeMap`'s `options` on a `ValueMap`, which
 * Grafana renders as no mapping at all.
 */

/** Maps exact values to display text and/or colour: `{ "10": "Perfection!" }`. */
export function valueMap(options: Record<string, ValueMappingResult>): ValueMap {
  return { type: MappingType.ValueToText, options };
}

/**
 * Maps a numeric range to a result. `from`/`to` accept `null` for an open end
 * (-Infinity / +Infinity respectively).
 */
export function rangeMap(from: number | null, to: number | null, result: ValueMappingResult): RangeMap {
  if (from !== null && to !== null && from > to) {
    throw new RangeError(`Range mapping is inverted: from ${from} is greater than to ${to}, so it can never match.`);
  }

  return { type: MappingType.RangeToText, options: { from, to, result } };
}

/** Maps values matching a regular expression to a result. */
export function regexMap(pattern: string, result: ValueMappingResult): RegexMap {
  try {
    new RegExp(pattern);
  } catch (error) {
    throw new SyntaxError(
      `Value mapping pattern ${JSON.stringify(pattern)} is not a valid regular expression: ${error}`,
    );
  }

  return { type: MappingType.RegexToText, options: { pattern, result } };
}

/** Maps null, NaN, empty or boolean values to a result. */
export function specialValueMap(match: SpecialValueMatch, result: ValueMappingResult): SpecialValueMap {
  return { type: MappingType.SpecialValue, options: { match, result } };
}

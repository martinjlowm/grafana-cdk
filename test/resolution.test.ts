import fs from 'node:fs';

import { describe, expect, it } from 'bun:test';

/**
 * Guards the one packaging invariant whose failure mode is invisible from
 * inside a passing test run: the `#@/*` and `#$/*` specifiers every source and
 * test file uses must resolve without any runner opting into a condition.
 *
 * These paths previously mapped to `./src` only under a `development`
 * condition, which meant `bun test` — the command in the justfile, the README
 * and everyone's muscle memory — failed with "Cannot find module '#@/index.js'"
 * unless it was spelled `bun test --conditions=development`. Every test still
 * passed when run the blessed way, so nothing caught it.
 *
 * The published package needs `./dist` instead, and gets it from nix/dist.nix
 * rewriting this map at build time; the artifact is checked by actually
 * importing from it, not here.
 */
const manifest = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  imports: Record<string, unknown>;
};

describe('the checkout import map', () => {
  it('points source specifiers at source, unconditionally', () => {
    expect(manifest.imports).toEqual({
      '#@/*.js': './src/*.ts',
      '#@/*': './src/*',
      '#$/*.js': './test/*.ts',
      '#$/*': './test/*',
    });
  });

  it('has no conditional targets for any runner to have to opt into', () => {
    for (const [specifier, target] of Object.entries(manifest.imports)) {
      expect(typeof target, `imports["${specifier}"] must be a plain path, not a conditions object`).toBe('string');
    }
  });
});

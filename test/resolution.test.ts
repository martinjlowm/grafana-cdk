import fs from 'node:fs';

import { describe, expect, it } from 'bun:test';

/**
 * Guards the packaging invariants whose failure mode is invisible from inside a
 * passing test run.
 *
 * The `#@/*` and `#$/*` specifiers every source and test file uses must resolve
 * with no runner opting into anything. These paths once mapped to `./src` only
 * under a `development` condition, so `bun test` — the command in the justfile,
 * the README and everyone's muscle memory — failed with "Cannot find module"
 * unless it was spelled `bun test --conditions=development`. Every test still
 * passed when run the blessed way, so nothing caught it.
 *
 * The published package needs the same specifiers pointing at `./dist`, which
 * `nix/dist.nix` arranges by rewriting this map at build time. That rewrite is
 * a jq expression in another language in another file, so renaming a specifier
 * here without updating it there would produce an artifact that resolves
 * nothing — and no TypeScript or Bun run would notice.
 */
const root = new URL('../', import.meta.url);

const manifest = JSON.parse(fs.readFileSync(new URL('package.json', root), 'utf8')) as {
  imports: Record<string, unknown>;
};

const distNix = fs.readFileSync(new URL('nix/dist.nix', root), 'utf8');

describe('the checkout import map', () => {
  it('points source specifiers at source, unconditionally', () => {
    expect(manifest.imports).toEqual({
      '#@/*.ts': './src/*.ts',
      '#@/*': './src/*',
      '#$/*.ts': './test/*.ts',
      '#$/*': './test/*',
    });
  });

  it('has no conditional targets for any runner to have to opt into', () => {
    for (const [specifier, target] of Object.entries(manifest.imports)) {
      expect(typeof target, `imports["${specifier}"] must be a plain path, not a conditions object`).toBe('string');
    }
  });
});

describe('the published import map', () => {
  // `#$/*` is test-only and deliberately absent from the artifact.
  const published = Object.keys(manifest.imports).filter((specifier) => specifier.startsWith('#@/'));

  it.each(published)('nix/dist.nix rewrites %s', (specifier) => {
    expect(
      distNix.includes(`"${specifier}"`),
      `nix/dist.nix must rewrite "${specifier}" to a ./dist path, or the published package resolves nothing`,
    ).toBe(true);
  });

  it('carries no specifier the checkout no longer uses', () => {
    const rewritten = [...distNix.matchAll(/"(#[@$]\/[^"]*)":/g)].map((match) => match[1] as string);

    expect(rewritten.length).toBeGreaterThan(0);
    for (const specifier of rewritten) {
      expect(published, `nix/dist.nix rewrites "${specifier}", which package.json no longer declares`).toContain(
        specifier,
      );
    }
  });
});

import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'bun:test';

import { App, Dashboard, Panel } from '#@/index.ts';

import { withTemporaryDirectory } from '#$/utils.ts';

describe('App.synth', () => {
  it(
    'writes one file per dashboard, named by uid',
    withTemporaryDirectory((tmpdir) => {
      const app = new App({ outdir: tmpdir });
      new Dashboard(app, 'one', { title: 'One', uid: 'abcdef12345678' });
      new Dashboard(app, 'two', { title: 'Two', uid: 'abcdef23456789' });

      app.synth();

      expect(fs.readdirSync(tmpdir).sort()).toEqual(['abcdef12345678.json', 'abcdef23456789.json']);
    }),
  );

  it(
    'writes JSON Grafana can import',
    withTemporaryDirectory((tmpdir) => {
      const app = new App({ outdir: tmpdir });
      const dashboard = new Dashboard(app, 'one', { title: 'One', uid: 'abcdef12345678' });
      dashboard.addPanel(new Panel(dashboard, 'p', { type: 'stat', title: 'A stat', gridPos: { w: 6, h: 4 } }));

      app.synth();

      const model = JSON.parse(fs.readFileSync(path.join(tmpdir, 'abcdef12345678.json'), 'utf8'));

      expect(model).toMatchObject({
        schemaVersion: 39,
        title: 'One',
        uid: 'abcdef12345678',
        panels: [{ type: 'stat', title: 'A stat', gridPos: { x: 0, y: 0, w: 6, h: 4 }, id: 1 }],
      });
    }),
  );

  it(
    'falls back to the title when a dashboard has no uid',
    withTemporaryDirectory((tmpdir) => {
      const app = new App({ outdir: tmpdir });
      new Dashboard(app, 'one', { title: 'Untitled' });

      app.synth();

      expect(fs.existsSync(path.join(tmpdir, 'Untitled.json'))).toBe(true);
    }),
  );

  it(
    'accepts a caller-supplied naming scheme',
    withTemporaryDirectory((tmpdir) => {
      const app = new App({ outdir: tmpdir, fileName: (dashboard) => dashboard.node.id });
      new Dashboard(app, 'fleet-overview', { title: 'Fleet overview', uid: 'abcdef12345678' });

      app.synth();

      expect(fs.existsSync(path.join(tmpdir, 'fleet-overview.json'))).toBe(true);
    }),
  );

  it(
    'refuses to let one dashboard overwrite another',
    withTemporaryDirectory((tmpdir) => {
      const app = new App({ outdir: tmpdir, fileName: () => 'same' });
      new Dashboard(app, 'one', { title: 'One', uid: 'abcdef12345678' });
      new Dashboard(app, 'two', { title: 'Two', uid: 'abcdef23456789' });

      expect(() => app.synth()).toThrow(/both synthesize to same\.json/);
    }),
  );

  it(
    'writes nothing when any dashboard fails validation',
    withTemporaryDirectory((tmpdir) => {
      const app = new App({ outdir: tmpdir });
      new Dashboard(app, 'good', { title: 'Good', uid: 'abcdef12345678' });
      const bad = new Dashboard(app, 'bad', { title: 'Bad', uid: 'abcdef23456789' });
      bad.addPanel(new Panel(bad, 'off-grid', { type: 'stat', gridPos: { x: 20, y: 0, w: 8, h: 4 } }));

      expect(() => app.synth()).toThrow(/Validation failed/);
      // The valid dashboard is not written either: a half-emitted directory is
      // worse than an empty one, because the next deploy ships it.
      expect(fs.existsSync(path.join(tmpdir, 'abcdef12345678.json'))).toBe(false);
    }),
  );
});

import fs from 'node:fs';
import path from 'node:path';

import { App, Dashboard } from '#@/index.js';

import { withTemporaryDirectory } from '#$/utils.js';

it(
  'synthesizes all dashboards',
  withTemporaryDirectory((tmpdir) => {
    const app = new App({ outdir: tmpdir });
    const dashboards = [];
    dashboards.push(
      new Dashboard(app, 'one', {
        title: 'One',
        uid: 'abcdef12345678',
      }),
    );

    dashboards.push(
      new Dashboard(app, 'two', {
        title: 'Two',
        uid: 'abcdef23456789',
      }),
    );

    app.synth();

    for (const dashboard of dashboards) {
      const dashboardModelPath = `${path.join(tmpdir, dashboard.title)}.json`;
      expect(fs.existsSync(dashboardModelPath)).toBe(true);
    }
  }),
);

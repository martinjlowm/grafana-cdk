import { describe, expect, it } from 'bun:test';

import { App, Dashboard, Grid, type GridArea, RowPanel, StatPanel } from '#@/index.js';

function widths(areas: GridArea[]): number[] {
  return areas.map((area) => area.w);
}

function boxes(areas: GridArea[]): Array<{ x: number; y: number; w: number; h: number }> {
  return areas.map((area) => area.toJSON());
}

describe('splitting a row', () => {
  it('divides a count into equal columns', () => {
    expect(boxes(new Grid().row(4, 3))).toEqual([
      { x: 0, y: 0, w: 8, h: 4 },
      { x: 8, y: 0, w: 8, h: 4 },
      { x: 16, y: 0, w: 8, h: 4 },
    ]);
  });

  it('reads fractions and their aliases', () => {
    expect(widths(new Grid().row(4, ['two-thirds', 'third']))).toEqual([16, 8]);
    expect(widths(new Grid().row(4, ['2/3', '1/3']))).toEqual([16, 8]);
    expect(widths(new Grid().row(4, ['quarter', 'quarter', 'half']))).toEqual([6, 6, 12]);
    expect(widths(new Grid().row(4, ['full']))).toEqual([24]);
  });

  it('takes exact column counts', () => {
    expect(widths(new Grid().row(4, [10, 14]))).toEqual([10, 14]);
  });

  it('shares what is left between the auto cells', () => {
    expect(widths(new Grid().row(4, [16, 'auto', 'auto']))).toEqual([16, 4, 4]);
    expect(widths(new Grid().row(4, ['half', 'auto']))).toEqual([12, 12]);
  });

  it('spends rounding error once rather than leaving a gap', () => {
    // A fifth of 24 is 4.8. Rounding each cell alone gives five 5s (25, an
    // overflow) or five 4s (20, a four-column hole).
    const fifths = widths(new Grid().row(4, ['1/5', '1/5', '1/5', '1/5', '1/5']));

    expect(fifths.reduce((sum, w) => sum + w, 0)).toBe(24);
    expect(fifths).toEqual([5, 5, 5, 5, 4]);
  });

  it('leaves the remainder empty when the spans do not fill the row', () => {
    expect(boxes(new Grid().row(4, ['half']))).toEqual([{ x: 0, y: 0, w: 12, h: 4 }]);
  });

  it('keeps the tuple shape so destructured areas are not possibly-undefined', () => {
    const [a, b, c] = new Grid().row(4, 3);
    const [wide, narrow] = new Grid().row(4, ['two-thirds', 'third']);

    // Reading `.w` without a null check is the assertion: under
    // noUncheckedIndexedAccess this only compiles because both forms return a
    // tuple rather than GridArea[].
    expect([a.w, b.w, c.w, wide.w, narrow.w]).toEqual([8, 8, 8, 16, 8]);
  });

  it('names the areas when given an object', () => {
    const { chart, side } = new Grid().row(8, { chart: 'two-thirds', side: 'third' });

    expect(chart.toJSON()).toEqual({ x: 0, y: 0, w: 16, h: 8 });
    expect(side.toJSON()).toEqual({ x: 16, y: 0, w: 8, h: 8 });
  });
});

describe('the cursor', () => {
  it('advances by each band and reports where it is', () => {
    const grid = new Grid();

    expect(grid.y).toBe(0);
    grid.row(4, 2);
    expect(grid.y).toBe(4);
    grid.band(9);
    expect(grid.y).toBe(13);
    grid.skip(1);
    expect(grid.y).toBe(14);
    expect(grid.row(3, 1)[0]?.y).toBe(14);
  });

  it('reserves one row for a row-panel header', () => {
    const grid = new Grid();
    grid.band(4);

    expect(grid.header()).toBe(4);
    expect(grid.y).toBe(5);
  });

  it('can be rewound to plan a region again', () => {
    const grid = new Grid();
    grid.band(10);

    expect(grid.seek(2).row(3, 1)[0]?.y).toBe(2);
  });

  it('starts where it is told', () => {
    expect(new Grid({ x: 12, columns: 12, y: 6 }).band(4).toJSON()).toEqual({ x: 12, y: 6, w: 12, h: 4 });
  });
});

describe('subdividing an area', () => {
  it('splits a column into stacked areas', () => {
    const [, side] = new Grid().row(8, ['two-thirds', 'third']);

    expect(boxes(side.rows(['half', 'half']))).toEqual([
      { x: 16, y: 0, w: 8, h: 4 },
      { x: 16, y: 4, w: 8, h: 4 },
    ]);
  });

  it('splits an area into further columns', () => {
    const [, bottom] = new Grid().band(12).rows([8, 4]);

    expect(boxes(bottom.columns(4))).toEqual([
      { x: 0, y: 8, w: 6, h: 4 },
      { x: 6, y: 8, w: 6, h: 4 },
      { x: 12, y: 8, w: 6, h: 4 },
      { x: 18, y: 8, w: 6, h: 4 },
    ]);
  });

  it('exposes its far edges', () => {
    const [area] = new Grid({ y: 3 }).row(5, ['half']);

    expect([area.right, area.bottom]).toEqual([12, 8]);
  });

  it('carries extra gridPos fields through `with`', () => {
    expect(new Grid().band(4).with({ static: true })).toEqual({ x: 0, y: 0, w: 24, h: 4, static: true });
  });
});

describe('what gets rejected', () => {
  it('rejects spans that overflow the available space', () => {
    expect(() => new Grid().row(4, [20, 20])).toThrow(/total 40, more than the 24 available/);
    expect(() => new Grid().row(4, ['two-thirds', 'two-thirds'])).toThrow(RangeError);
  });

  it('rejects a split too fine to give every cell a column', () => {
    expect(() => new Grid().row(4, 25)).toThrow(/cannot be split any finer/);
  });

  it('rejects malformed spans', () => {
    expect(() => new Grid().row(4, ['sixth' as 'half'])).toThrow(SyntaxError);
    expect(() => new Grid().row(4, ['1/0'])).toThrow(/divides by zero/);
    expect(() => new Grid().row(4, [4.5])).toThrow(/positive integer count/);
    expect(() => new Grid().row(4, [])).toThrow(/at least one span/);
  });

  it('rejects a nonsense band or cursor', () => {
    expect(() => new Grid().band(0)).toThrow(RangeError);
    expect(() => new Grid().skip(-1)).toThrow(RangeError);
    expect(() => new Grid().seek(-1)).toThrow(RangeError);
  });

  it('rejects a grid that runs off the dashboard', () => {
    expect(() => new Grid({ columns: 25 })).toThrow(RangeError);
    expect(() => new Grid({ x: 20, columns: 8 })).toThrow(/runs past the 24-column grid/);
  });
});

describe('using a grid on a dashboard', () => {
  it('places panels exactly where the grid allocated them', () => {
    const app = new App();
    const dashboard = new Dashboard(app, 'grid', { title: 'Grid', uid: 'gridded-001' });
    const grid = new Grid();

    const stats = grid.row(4, 3);
    for (const [index, area] of stats.entries()) {
      dashboard.addPanel(new StatPanel(dashboard, `stat-${index}`, { gridPos: area }));
    }

    dashboard.addPanel(new RowPanel(dashboard, 'detail', { title: 'Detail', y: grid.header() }));

    const { chart, side } = grid.row(8, { chart: 'two-thirds', side: 'third' });
    dashboard.addPanel(new StatPanel(dashboard, 'chart', { gridPos: chart }));
    dashboard.addPanel(new StatPanel(dashboard, 'side', { gridPos: side }));

    expect(app.validate()).toEqual([]);
    expect(dashboard.toJSON().panels?.map((panel) => panel.gridPos)).toEqual([
      { x: 0, y: 0, w: 8, h: 4 },
      { x: 8, y: 0, w: 8, h: 4 },
      { x: 16, y: 0, w: 8, h: 4 },
      { x: 0, y: 4, w: 24, h: 1 },
      { x: 0, y: 5, w: 16, h: 8 },
      { x: 16, y: 5, w: 8, h: 8 },
    ]);
  });

  it('still reports an overlap when two grids are wound back over each other', () => {
    const app = new App();
    const dashboard = new Dashboard(app, 'grid', { title: 'Grid', uid: 'gridded-002' });
    const grid = new Grid();

    dashboard.addPanel(new StatPanel(dashboard, 'first', { gridPos: grid.band(6) }));
    dashboard.addPanel(new StatPanel(dashboard, 'second', { gridPos: grid.seek(3).band(6) }));

    expect(app.validate().join('\n')).toContain('overlap');
  });
});

import { describe, expect, it } from 'bun:test';

import { App, Dashboard, Panel } from '#@/index.ts';

function dashboard(): { app: App; dashboard: Dashboard } {
  const app = new App();

  return { app, dashboard: new Dashboard(app, 'grid', { title: 'Grid', uid: 'grid-0001' }) };
}

describe('flow layout', () => {
  it('packs panels left to right and wraps at 24 columns', () => {
    const { dashboard: board } = dashboard();

    for (const [index, width] of [8, 8, 8, 12].entries()) {
      board.addPanel(new Panel(board, `p${index}`, { type: 'stat', gridPos: { w: width, h: 4 } }));
    }

    expect(board.toJSON().panels?.map((panel) => panel.gridPos)).toEqual([
      { x: 0, y: 0, w: 8, h: 4 },
      { x: 8, y: 0, w: 8, h: 4 },
      { x: 16, y: 0, w: 8, h: 4 },
      // Wrapped: 24 columns are used, so the fourth panel starts a new line
      // below the tallest panel on the previous one.
      { x: 0, y: 4, w: 12, h: 4 },
    ]);
  });

  it('clears the tallest panel of the previous line, not the last one', () => {
    const { dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'tall', { type: 'stat', gridPos: { w: 12, h: 9 } }));
    board.addPanel(new Panel(board, 'short', { type: 'stat', gridPos: { w: 12, h: 3 } }));
    board.addPanel(new Panel(board, 'next', { type: 'stat', gridPos: { w: 24, h: 4 } }));

    expect(board.toJSON().panels?.[2]?.gridPos).toEqual({ x: 0, y: 9, w: 24, h: 4 });
  });

  it('leaves pinned panels exactly where they were put', () => {
    const { dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'pinned', { type: 'stat', gridPos: { x: 12, y: 7, w: 6, h: 3 } }));

    expect(board.toJSON().panels?.[0]?.gridPos).toEqual({ x: 12, y: 7, w: 6, h: 3 });
  });

  it('is idempotent across repeated serialisation', () => {
    const { dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'a', { type: 'stat', gridPos: { w: 12, h: 4 } }));
    board.addPanel(new Panel(board, 'b', { type: 'stat', gridPos: { w: 12, h: 4 } }));

    expect(board.toJSON()).toEqual(board.toJSON());
  });
});

describe('validation', () => {
  it('rejects a panel that runs off the right edge', () => {
    const { app, dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'wide', { type: 'stat', gridPos: { x: 20, y: 0, w: 8, h: 4 } }));

    expect(app.validate()).toEqual([
      expect.stringContaining('gridPos.x + gridPos.w must not exceed 24 columns, got 20 + 8 = 28'),
    ]);
  });

  it.each([
    [{ x: -1, y: 0, w: 4, h: 4 }, 'gridPos.x must be between 0 and 23'],
    [{ x: 0, y: -1, w: 4, h: 4 }, 'gridPos.y must be at least 0'],
    [{ x: 0, y: 0, w: 0, h: 4 }, 'gridPos.w must be between 1 and 24'],
    [{ x: 0, y: 0, w: 4, h: 0 }, 'gridPos.h must be at least 1'],
    [{ x: 0, y: 0, w: 4.5, h: 4 }, 'gridPos.w must be an integer'],
  ])('rejects %o', (gridPos, message) => {
    const { app, dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'bad', { type: 'stat', gridPos }));

    expect(app.validate().join('\n')).toContain(message);
  });

  it('reports panels that overlap', () => {
    const { app, dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'a', { type: 'stat', gridPos: { x: 0, y: 0, w: 12, h: 8 } }));
    board.addPanel(new Panel(board, 'b', { type: 'stat', gridPos: { x: 6, y: 4, w: 12, h: 8 } }));

    expect(app.validate().join('\n')).toContain('overlap');
  });

  it('does not report panels that merely touch', () => {
    const { app, dashboard: board } = dashboard();

    board.addPanel(new Panel(board, 'a', { type: 'stat', gridPos: { x: 0, y: 0, w: 12, h: 8 } }));
    board.addPanel(new Panel(board, 'b', { type: 'stat', gridPos: { x: 12, y: 0, w: 12, h: 8 } }));
    board.addPanel(new Panel(board, 'c', { type: 'stat', gridPos: { x: 0, y: 8, w: 24, h: 4 } }));

    expect(app.validate()).toEqual([]);
  });
});

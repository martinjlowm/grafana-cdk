import { describe, expect, it } from 'bun:test';

import {
  App,
  CloudWatchDataSource,
  ConstantVariable,
  CustomVariable,
  Dashboard,
  type DashboardProps,
  ExpressionDataSource,
  IntervalVariable,
  Panel,
  QueryVariable,
  RowPanel,
  StatPanel,
  TextBoxVariable,
  VariableHide,
} from '#@/index.ts';

function board(props: Partial<DashboardProps> = {}): { app: App; dashboard: Dashboard } {
  const app = new App();

  return { app, dashboard: new Dashboard(app, 'd', { title: 'Dashboard', uid: 'dashboard-1', ...props }) };
}

describe('dashboard shape', () => {
  it('carries the built-in annotation query every Grafana dashboard has', () => {
    const { dashboard } = board();

    expect(dashboard.toJSON().annotations).toEqual({
      list: [
        {
          builtIn: 1,
          datasource: { type: 'grafana', uid: '-- Grafana --' },
          enable: true,
          hide: true,
          iconColor: 'rgba(0, 211, 255, 1)',
          name: 'Annotations & Alerts',
          type: 'dashboard',
        },
      ],
    });
  });

  it('defaults the time range to Grafana’s own', () => {
    expect(board().dashboard.toJSON().time).toEqual({ from: 'now-6h', to: 'now' });
  });

  it('rejects a uid Grafana would refuse', () => {
    const app = new App();

    expect(() => new Dashboard(app, 'short', { title: 'x', uid: 'abc' })).toThrow(RangeError);
  });

  it('rejects a fiscal year outside 0–11', () => {
    const app = new App();

    expect(() => new Dashboard(app, 'fy', { title: 'x', fiscalYearStartMonth: 12 })).toThrow(RangeError);
  });
});

describe('panel ids', () => {
  it('assigns sequential ids to panels that did not ask for one', () => {
    const { dashboard } = board();

    dashboard.addPanel(new Panel(dashboard, 'a', { type: 'stat', gridPos: { w: 4, h: 4 } }));
    dashboard.addPanel(new Panel(dashboard, 'b', { type: 'stat', gridPos: { w: 4, h: 4 } }));

    expect(dashboard.toJSON().panels?.map((panel) => panel.id)).toEqual([1, 2]);
  });

  it('leaves explicit ids alone and does not collide with them', () => {
    const { dashboard } = board();

    dashboard.addPanel(new Panel(dashboard, 'a', { type: 'stat', id: 7, gridPos: { w: 4, h: 4 } }));
    dashboard.addPanel(new Panel(dashboard, 'b', { type: 'stat', gridPos: { w: 4, h: 4 } }));

    expect(dashboard.toJSON().panels?.map((panel) => panel.id)).toEqual([7, 8]);
  });

  it('reports two panels pinned to the same id', () => {
    const { app, dashboard } = board();

    dashboard.addPanel(new Panel(dashboard, 'a', { type: 'stat', id: 3, gridPos: { x: 0, y: 0, w: 4, h: 4 } }));
    dashboard.addPanel(new Panel(dashboard, 'b', { type: 'stat', id: 3, gridPos: { x: 4, y: 0, w: 4, h: 4 } }));

    expect(app.validate().join('\n')).toContain('duplicate panel id 3');
  });
});

describe('rows', () => {
  it('spans the full grid and pushes later panels onto a new line', () => {
    const { dashboard } = board();

    dashboard.addPanel(new StatPanel(dashboard, 'a', { gridPos: { w: 12, h: 4 } }));
    dashboard.addPanel(new RowPanel(dashboard, 'row', { title: 'Details' }));
    dashboard.addPanel(new StatPanel(dashboard, 'b', { gridPos: { w: 12, h: 4 } }));

    expect(dashboard.toJSON().panels?.map((panel) => panel.gridPos)).toEqual([
      { x: 0, y: 0, w: 12, h: 4 },
      { x: 0, y: 4, w: 24, h: 1 },
      { x: 0, y: 5, w: 12, h: 4 },
    ]);
  });

  it('inlines its panels only when collapsed', () => {
    const { dashboard } = board();
    const panel = new StatPanel(dashboard, 'inner', { gridPos: { x: 0, y: 1, w: 12, h: 4 } });

    const expanded = new RowPanel(dashboard, 'expanded', { panels: [panel] });
    expect(expanded.toJSON().panels).toEqual([]);

    const collapsed = new RowPanel(dashboard, 'collapsed', { collapsed: true, panels: [panel] });
    expect(collapsed.toJSON().panels).toHaveLength(1);
  });
});

describe('query targets', () => {
  it('reports two queries on one panel sharing a refId', () => {
    const { app, dashboard } = board();
    const cloudwatch = new CloudWatchDataSource(app, 'cw-uid');

    dashboard.addPanel(
      new StatPanel(dashboard, 'p', {
        gridPos: { w: 4, h: 4 },
        targets: [
          cloudwatch.createTarget('first', { refId: 'A', namespace: 'AWS/ApiGateway', metricName: 'Latency' }),
          cloudwatch.createTarget('second', { refId: 'A', namespace: 'AWS/ApiGateway', metricName: 'Count' }),
        ],
      }),
    );

    expect(app.validate().join('\n')).toContain("duplicate query refId 'A'");
  });

  it('keeps the panel and its targets pointing at the same data source', () => {
    const app = new App();
    const cloudwatch = new CloudWatchDataSource(app, 'cw-uid');
    const target = cloudwatch.createTarget('t', { refId: 'A', namespace: 'AWS/Lambda', metricName: 'Errors' });

    expect(target.toJSON()['datasource']).toEqual(cloudwatch.asRef());
  });

  it('addresses one query from another through asRef', () => {
    const app = new App();
    const cloudwatch = new CloudWatchDataSource(app, 'cw-uid');
    const expression = new ExpressionDataSource(app);

    const a = cloudwatch.createTarget('a', { refId: 'A', namespace: 'AWS/Lambda', metricName: 'Errors' });
    const sum = expression.createTarget('sum', { refId: 'B', expression: `${a.asRef()} * 2` });

    expect(sum.toJSON()).toMatchObject({ refId: 'B', type: 'math', expression: '$A * 2' });
  });
});

describe('template variables', () => {
  it('serialises a query variable with the refresh policy that keeps it alive', () => {
    const { app, dashboard } = board();
    const cloudwatch = new CloudWatchDataSource(app, 'cw-uid');

    dashboard.addVariable(
      new QueryVariable(dashboard, 'region', { datasource: cloudwatch, query: 'regions()', includeAll: true }),
    );

    expect(dashboard.toJSON().templating?.list?.[0]).toMatchObject({
      name: 'region',
      type: 'query',
      query: 'regions()',
      refresh: 1,
      includeAll: true,
    });
  });

  it('keeps a custom variable’s query string and options in step', () => {
    const { dashboard } = board();

    dashboard.addVariable(
      new CustomVariable(dashboard, 'env', { values: ['prod', { text: 'Staging', value: 'stg' }] }),
    );

    expect(dashboard.toJSON().templating?.list?.[0]).toMatchObject({
      query: 'prod,Staging : stg',
      options: [
        { text: 'prod', value: 'prod', selected: true },
        { text: 'Staging', value: 'stg', selected: false },
      ],
    });
  });

  it('forces a constant variable to stay hidden', () => {
    const { dashboard } = board();

    dashboard.addVariable(new ConstantVariable(dashboard, 'account', { value: '0123' }));

    // The two `VariableHide` enums `@grafana/schema` exports are the same
    // numbers under different declarations; compare the value.
    expect(dashboard.toJSON().templating?.list?.[0]?.hide).toBe(VariableHide.hideVariable as never);
  });

  it('interpolates as $name and ${name}', () => {
    const { dashboard } = board();
    const variable = new TextBoxVariable(dashboard, 'filter', { defaultValue: '*' });

    expect(variable.asRef()).toBe('$filter');
    expect(variable.asBracedRef()).toBe('${filter}');
  });

  it('rejects a name that cannot be interpolated', () => {
    const { dashboard } = board();

    expect(() => new TextBoxVariable(dashboard, 'my-filter', {})).toThrow(SyntaxError);
  });

  it('rejects pickers that would render empty', () => {
    const { dashboard } = board();

    expect(() => new CustomVariable(dashboard, 'empty', { values: [] })).toThrow(RangeError);
    expect(() => new IntervalVariable(dashboard, 'none', { intervals: [] })).toThrow(RangeError);
  });

  it('reports two variables sharing a name', () => {
    const { app, dashboard } = board();

    dashboard.addVariable(new TextBoxVariable(dashboard, 'a', {}));
    dashboard.addVariable(new TextBoxVariable(dashboard, 'b', {}));
    // Same interpolation name, different construct id.
    Object.defineProperty(dashboard.variables[1], 'name', { value: 'a' });

    expect(app.validate().join('\n')).toContain("duplicate template variable 'a'");
  });
});

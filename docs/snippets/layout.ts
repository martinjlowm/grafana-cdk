import { App, Dashboard, RowPanel, StatPanel, TimeSeriesPanel } from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'layout', { title: 'Layout', uid: 'layout-0001' });

// Flowed: no x/y, so these three fill the first line left to right.
for (const [index, name] of ['Requests', 'Errors', 'Latency'].entries()) {
  dashboard.addPanel(new StatPanel(dashboard, `stat-${index}`, { title: name, gridPos: { w: 8, h: 4 } }));
}

// A row is always full width, so whatever follows starts a new line.
dashboard.addPanel(new RowPanel(dashboard, 'detail-row', { title: 'Detail' }));

dashboard.addPanel(new TimeSeriesPanel(dashboard, 'trend', { title: 'Trend', gridPos: { w: 24, h: 8 } }));

// Pinned: kept exactly here, and checked against the flowed panels for overlap.
dashboard.addPanel(new StatPanel(dashboard, 'pinned', { title: 'Pinned', gridPos: { x: 0, y: 14, w: 4, h: 4 } }));

export const positions = dashboard.toJSON().panels?.map((panel) => panel.gridPos);
// [{x: 0, y: 0, w: 8, h: 4}, {x: 8, y: 0, …}, {x: 16, y: 0, …},
//  {x: 0, y: 4, w: 24, h: 1},          <- the row
//  {x: 0, y: 5, w: 24, h: 8},          <- the time series
//  {x: 0, y: 14, w: 4, h: 4}]          <- the pinned stat

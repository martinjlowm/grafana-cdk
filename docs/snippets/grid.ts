import {
  App,
  BarGaugePanel,
  Dashboard,
  Grid,
  RowPanel,
  StatPanel,
  TablePanel,
  TimeSeriesPanel,
} from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'fleet', { title: 'Fleet', uid: 'fleet-000001' });

const grid = new Grid();

// Four equal stats across the top: a count is the shorthand for `['auto', …]`.
const [total, online, offline, stale] = grid.row(4, 4);

dashboard.addPanel(new StatPanel(dashboard, 'total', { title: 'Total', gridPos: total }));
dashboard.addPanel(new StatPanel(dashboard, 'online', { title: 'Online', gridPos: online }));
dashboard.addPanel(new StatPanel(dashboard, 'offline', { title: 'Offline', gridPos: offline }));
dashboard.addPanel(new StatPanel(dashboard, 'stale', { title: 'Stale', gridPos: stale }));

// A section header takes exactly one row.
dashboard.addPanel(new RowPanel(dashboard, 'detail-row', { title: 'Detail', y: grid.header() }));

// Named areas, so the split is legible at the call site rather than by index.
const { trend, breakdown } = grid.row(10, { trend: 'two-thirds', breakdown: 'third' });

dashboard.addPanel(new TimeSeriesPanel(dashboard, 'trend', { title: 'Trend', gridPos: trend }));

// Areas subdivide, so a column can be stacked without recomputing anything.
const [byRegion, byVersion] = breakdown.rows(['half', 'half']);

dashboard.addPanel(new BarGaugePanel(dashboard, 'by-region', { title: 'By region', gridPos: byRegion }));
dashboard.addPanel(new BarGaugePanel(dashboard, 'by-version', { title: 'By version', gridPos: byVersion }));

// `auto` takes whatever the fixed spans left over — here 24 - 16 = 8 columns.
const [inventory, notes] = grid.row(8, [16, 'auto']);

dashboard.addPanel(new TablePanel(dashboard, 'inventory', { title: 'Inventory', gridPos: inventory }));
dashboard.addPanel(new StatPanel(dashboard, 'notes', { title: 'Notes', gridPos: notes }));

app.synth();

import { expect, it } from 'bun:test';

import {
  App,
  AthenaDataSource,
  AthenaQueryFormat,
  BarChartPanel,
  BarGaugeDisplayMode,
  BarGaugePanel,
  Dashboard,
  FieldColorModeId,
  FrameGeometrySourceMode,
  fieldOverride,
  fixedColorOverride,
  GeomapPanel,
  GeomapTooltipMode,
  GraphDrawStyle,
  LegendDisplayMode,
  PieChartPanel,
  PieChartType,
  QueryVariable,
  RowPanel,
  SortOrder,
  StackingMode,
  StatPanel,
  TableCellDisplayMode,
  TableCellHeight,
  TablePanel,
  TimeSeriesPanel,
  TooltipDisplayMode,
  thresholds,
  transformation,
  VisibilityMode,
  VizOrientation,
} from '#@/index.ts';

/**
 * A realistic multi-panel dashboard over an Athena-backed data lake, modelled
 * on the panel mix a fleet-analytics workspace actually uses: categorical bars
 * with per-series colour overrides, a table behind an `organize` transform, a
 * pie chart, a bar gauge, a geomap, a time series, and a freshness stat fed by
 * `rowsToFields`.
 *
 * It exists as one end-to-end case rather than a set of unit tests because the
 * thing worth pinning is the whole emitted document — every panel type this
 * package types, every construct that contributes to `fieldConfig`, and the
 * flow layout that positions them.
 *
 * The SQL and schema names are illustrative.
 */
it('renders a fleet analytics dashboard', () => {
  const app = new App();

  const dashboard = new Dashboard(app, 'fleet-analytics', {
    title: 'Fleet analytics',
    uid: 'fleet-analytics-1',
    description: 'Device fleet composition, connectivity and freshness.',
    tags: ['fleet', 'analytics'],
    time: { from: 'now-30d', to: 'now' },
    refresh: '15m',
    timezone: 'utc',
  });

  const athena = new AthenaDataSource(app, 'fleet-analytics-athena');

  const deviceType = new QueryVariable(dashboard, 'device_type', {
    label: 'Device type',
    datasource: athena,
    query: 'SELECT DISTINCT device_type FROM analytics.device_current ORDER BY 1',
    includeAll: true,
    multi: true,
  });
  dashboard.addVariable(deviceType);

  // ---- Status ------------------------------------------------------------

  dashboard.addPanel(
    new BarChartPanel(dashboard, 'devices-by-status', {
      title: 'Devices by status',
      description: 'Status split per device type.',
      datasource: athena,
      gridPos: { w: 24, h: 5 },
      targets: [
        athena.createTarget('status', {
          refId: 'A',
          format: AthenaQueryFormat.Table,
          rawSQL: [
            'SELECT device_type AS type,',
            '  count(*) FILTER (WHERE online) AS "Online",',
            '  count(*) FILTER (WHERE NOT online) AS "Offline"',
            `FROM analytics.device_current WHERE device_type IN (${deviceType.asRef()})`,
            'GROUP BY 1 ORDER BY 1',
          ].join('\n'),
          connectionArgs: { resultReuseEnabled: true, resultReuseMaxAgeInMinutes: 30 },
        }),
      ],
      options: {
        orientation: VizOrientation.Horizontal,
        showValue: VisibilityMode.Always,
        stacking: StackingMode.Normal,
        legend: { calcs: [], displayMode: LegendDisplayMode.List, placement: 'bottom', showLegend: true },
        xField: 'type',
      },
      fieldConfig: {
        color: { mode: FieldColorModeId.Fixed },
        custom: { fillOpacity: 100, lineWidth: 1 },
        overrides: [fixedColorOverride('Online', 'green'), fixedColorOverride('Offline', 'red')],
      },
    }),
  );

  // ---- Composition -------------------------------------------------------

  dashboard.addPanel(new RowPanel(dashboard, 'composition-row', { title: 'Composition' }));

  dashboard.addPanel(
    new PieChartPanel(dashboard, 'firmware-split', {
      title: 'Firmware versions',
      datasource: athena,
      gridPos: { w: 8, h: 8 },
      targets: [
        athena.createTarget('firmware', {
          refId: 'A',
          rawSQL:
            'SELECT firmware_version, count(*) AS devices FROM analytics.device_current GROUP BY 1 ORDER BY 2 DESC',
        }),
      ],
      options: {
        pieType: PieChartType.Donut,
        reduceOptions: { calcs: ['lastNotNull'], values: true },
        tooltip: { mode: TooltipDisplayMode.Single, sort: SortOrder.Descending },
        legend: { calcs: [], displayMode: LegendDisplayMode.Table, placement: 'right', showLegend: true },
      },
    }),
  );

  dashboard.addPanel(
    new BarGaugePanel(dashboard, 'devices-by-region', {
      title: 'Devices by region',
      datasource: athena,
      gridPos: { w: 8, h: 8 },
      targets: [
        athena.createTarget('regions', {
          refId: 'A',
          rawSQL:
            'SELECT region, count(*) AS devices FROM analytics.device_current GROUP BY 1 ORDER BY 2 DESC LIMIT 20',
        }),
      ],
      options: {
        displayMode: BarGaugeDisplayMode.Gradient,
        orientation: VizOrientation.Horizontal,
        reduceOptions: { calcs: ['lastNotNull'], values: true },
        showUnfilled: true,
      },
      fieldConfig: { min: 0, color: { mode: FieldColorModeId.ContinuousGrYlRd } },
    }),
  );

  dashboard.addPanel(
    new TablePanel(dashboard, 'device-inventory', {
      title: 'Inventory',
      datasource: athena,
      gridPos: { w: 8, h: 8 },
      targets: [
        athena.createTarget('inventory', {
          refId: 'A',
          rawSQL: 'SELECT uuid, device_type, firmware_version, region, online FROM analytics.device_current LIMIT 200',
        }),
      ],
      options: {
        cellHeight: TableCellHeight.Sm,
        showHeader: true,
        footer: { show: false, countRows: false, reducer: [] },
      },
      transformations: [
        transformation('organize', {
          options: {
            excludeByName: { region: true },
            renameByName: { uuid: 'Device', device_type: 'Type', firmware_version: 'Firmware' },
          },
        }),
      ],
      fieldConfig: {
        custom: { align: 'auto', cellOptions: { type: TableCellDisplayMode.Auto }, inspect: false },
        overrides: [fieldOverride({ id: 'byName', options: 'online' }, [{ id: 'custom.width', value: 90 }])],
      },
    }),
  );

  // ---- Connectivity ------------------------------------------------------

  dashboard.addPanel(new RowPanel(dashboard, 'connectivity-row', { title: 'Connectivity' }));

  dashboard.addPanel(
    new TimeSeriesPanel(dashboard, 'online-trend', {
      title: 'Online devices',
      datasource: athena,
      gridPos: { w: 16, h: 8 },
      targets: [
        athena.createTarget('trend', {
          refId: 'A',
          format: AthenaQueryFormat.TimeSeries,
          rawSQL: 'SELECT day AS time, online_devices FROM analytics.device_daily ORDER BY 1',
        }),
      ],
      options: {
        legend: { calcs: [], displayMode: LegendDisplayMode.List, placement: 'bottom', showLegend: true },
        tooltip: { mode: TooltipDisplayMode.Single, sort: SortOrder.None },
      },
      fieldConfig: {
        custom: { drawStyle: GraphDrawStyle.Line, lineWidth: 2, fillOpacity: 10, showPoints: VisibilityMode.Never },
        min: 0,
      },
    }),
  );

  dashboard.addPanel(
    new StatPanel(dashboard, 'pipeline-freshness', {
      title: 'Pipeline freshness',
      description: 'Days behind for each source table.',
      datasource: athena,
      gridPos: { w: 8, h: 8 },
      targets: [
        athena.createTarget('freshness', {
          refId: 'A',
          rawSQL: "SELECT 'device_current' AS tbl, 0 AS days_behind UNION ALL SELECT 'device_daily', 1",
        }),
      ],
      transformations: [
        transformation('rowsToFields', {
          options: {
            mappings: [
              { fieldName: 'tbl', handlerKey: 'field.name' },
              { fieldName: 'days_behind', handlerKey: 'field.value' },
            ],
          },
        }),
      ],
      options: { reduceOptions: { calcs: ['lastNotNull'], values: false } },
      fieldConfig: {
        unit: 'd',
        thresholds: thresholds({
          steps: [
            { color: 'yellow', value: 1 },
            { color: 'red', value: 3 },
          ],
        }),
      },
    }),
  );

  dashboard.addPanel(
    new GeomapPanel(dashboard, 'device-locations', {
      title: 'Device locations',
      datasource: athena,
      gridPos: { w: 24, h: 14 },
      targets: [
        athena.createTarget('locations', {
          refId: 'A',
          rawSQL:
            'SELECT location_lat AS latitude, location_lng AS longitude, uuid, device_type FROM analytics.device_current WHERE location_lat IS NOT NULL',
        }),
      ],
      options: {
        view: { id: 'zero', lat: 0, lon: 0, zoom: 1 },
        controls: { showZoom: true, mouseWheelZoom: true, showAttribution: true },
        basemap: { type: 'default', name: 'Basemap' },
        tooltip: { mode: GeomapTooltipMode.Details },
        layers: [
          {
            type: 'markers',
            name: 'Devices',
            location: { mode: FrameGeometrySourceMode.Auto },
            config: { showLegend: false, style: { size: { fixed: 5 }, color: { fixed: 'blue' }, opacity: 0.6 } },
            tooltip: true,
          },
        ],
      },
    }),
  );

  expect(app.validate()).toEqual([]);
  expect(dashboard.toJSONString()).toMatchSnapshot();
});

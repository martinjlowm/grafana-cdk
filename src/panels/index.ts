import type { Construct } from 'constructs';

import { Panel, type PanelProps } from '#@/panel.js';
import type {
  BarChartFieldConfig,
  BarChartOptions,
  BarGaugeOptions,
  GaugeOptions,
  GeomapOptions,
  PieChartFieldConfig,
  PieChartOptions,
  StatOptions,
  TableCustomFieldConfig,
  TableOptions,
  TextOptions,
  TimeSeriesFieldConfig,
  TimeSeriesOptions,
} from '#@/panels/options.js';

export * from '#@/panels/options.js';

/**
 * Typed panel constructs, one per bundled Grafana visualisation.
 *
 * Each binds {@link Panel}'s two type parameters — the plugin's `options` and
 * its `fieldConfig.custom` — and fixes `type` to the plugin id, so a
 * `StatPanel` cannot carry a timeseries' legend options and `custom.lineWidth`
 * is rejected on a stat but accepted on a timeseries.
 *
 * `type` is omitted from every props type below because the class supplies it.
 */
export type TypedPanelProps<TOptions, TCustomFieldConfig> = Omit<
  PanelProps<TOptions, TCustomFieldConfig>,
  'type' | 'libraryPanel'
>;

/** A single big number. */
export class StatPanel extends Panel<StatOptions> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<StatOptions, Record<string, unknown>>) {
    super(scope, id, { ...props, type: 'stat' });
  }
}

/** A radial gauge. */
export class GaugePanel extends Panel<GaugeOptions> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<GaugeOptions, Record<string, unknown>>) {
    super(scope, id, { ...props, type: 'gauge' });
  }
}

/** Horizontal or vertical bars, one per series. */
export class BarGaugePanel extends Panel<BarGaugeOptions> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<BarGaugeOptions, Record<string, unknown>>) {
    super(scope, id, { ...props, type: 'bargauge' });
  }
}

/** Lines, bars or points over time. */
export class TimeSeriesPanel extends Panel<TimeSeriesOptions, TimeSeriesFieldConfig> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<TimeSeriesOptions, TimeSeriesFieldConfig>) {
    super(scope, id, { ...props, type: 'timeseries' });
  }
}

/** Categorical bars — a table of values rather than a time series. */
export class BarChartPanel extends Panel<BarChartOptions, BarChartFieldConfig> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<BarChartOptions, BarChartFieldConfig>) {
    super(scope, id, { ...props, type: 'barchart' });
  }
}

/** Proportions of a whole. */
export class PieChartPanel extends Panel<PieChartOptions, PieChartFieldConfig> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<PieChartOptions, PieChartFieldConfig>) {
    super(scope, id, { ...props, type: 'piechart' });
  }
}

/** The raw result set. */
export class TablePanel extends Panel<TableOptions, TableCustomFieldConfig> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<TableOptions, TableCustomFieldConfig>) {
    super(scope, id, { ...props, type: 'table' });
  }
}

/** Points, markers or heat on a map. */
export class GeomapPanel extends Panel<GeomapOptions> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<GeomapOptions, Record<string, unknown>>) {
    super(scope, id, { ...props, type: 'geomap' });
  }
}

/** Static markdown, HTML or code — headings and documentation between panels. */
export class TextPanel extends Panel<TextOptions> {
  constructor(scope: Construct, id: string, props: TypedPanelProps<TextOptions, Record<string, unknown>>) {
    super(scope, id, { ...props, type: 'text' });
  }
}

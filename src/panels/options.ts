import type {
  AxisConfig,
  BarGaugeDisplayMode,
  BarGaugeNamePlacement,
  BarGaugeSizing,
  BarGaugeValueMode,
  BigValueColorMode,
  BigValueGraphMode,
  BigValueJustifyMode,
  BigValueTextMode,
  GraphFieldConfig,
  GraphGradientMode,
  GraphThresholdsStyleConfig,
  HideableFieldConfig,
  MapLayerOptions,
  OptionsWithLegend,
  OptionsWithTextFormatting,
  OptionsWithTimezones,
  OptionsWithTooltip,
  PercentChangeColorMode,
  SingleStatBaseOptions,
  StackingMode,
  TableCellHeight,
  TableFieldOptions,
  TableFooterOptions,
  TableSortByFieldState,
  VisibilityMode,
  VizLegendOptions,
  VizOrientation,
  VizTooltipOptions,
} from '@grafana/schema';

/**
 * Per-plugin `options` and `fieldConfig.custom` shapes.
 *
 * `@grafana/schema` publishes every building block these compose from
 * (`SingleStatBaseOptions`, `VizLegendOptions`, `TableFieldOptions`, …) but not
 * the compositions themselves: those live in
 * `packages/grafana-schema/src/raw/composable/<plugin>/panelcfg`, which the npm
 * package does not ship. Transcribed from grafana/grafana v11.4.0 so the panels
 * in this directory can bind them.
 *
 * Every field is optional here even where the generated schema marks it
 * required. Grafana fills unset options from the plugin's own defaults on load,
 * so requiring a caller to spell out all nine of a stat panel's options to set
 * one of them buys nothing but noise.
 */

/** `stat` — packages/grafana-schema/src/raw/composable/stat/panelcfg */
export interface StatOptions extends Partial<SingleStatBaseOptions>, OptionsWithTextFormatting {
  colorMode?: BigValueColorMode;
  graphMode?: BigValueGraphMode;
  justifyMode?: BigValueJustifyMode;
  percentChangeColorMode?: PercentChangeColorMode;
  showPercentChange?: boolean;
  textMode?: BigValueTextMode;
  wideLayout?: boolean;
}

/** `gauge` — .../gauge/panelcfg */
export interface GaugeOptions extends Partial<SingleStatBaseOptions> {
  minVizHeight?: number;
  minVizWidth?: number;
  showThresholdLabels?: boolean;
  showThresholdMarkers?: boolean;
  sizing?: BarGaugeSizing;
}

/** `bargauge` — .../bargauge/panelcfg */
export interface BarGaugeOptions extends Partial<SingleStatBaseOptions>, Partial<OptionsWithLegend> {
  displayMode?: BarGaugeDisplayMode;
  maxVizHeight?: number;
  minVizHeight?: number;
  minVizWidth?: number;
  namePlacement?: BarGaugeNamePlacement;
  showUnfilled?: boolean;
  sizing?: BarGaugeSizing;
  valueMode?: BarGaugeValueMode;
}

/** `timeseries` — .../timeseries/panelcfg */
export interface TimeSeriesOptions extends OptionsWithTimezones {
  legend?: VizLegendOptions;
  orientation?: VizOrientation;
  tooltip?: VizTooltipOptions;
}

/** `timeseries` field config. */
export type TimeSeriesFieldConfig = GraphFieldConfig;

/** `barchart` — .../barchart/panelcfg */
export interface BarChartOptions
  extends Partial<OptionsWithLegend>,
    Partial<OptionsWithTooltip>,
    OptionsWithTextFormatting {
  /** Corner radius of each bar. */
  barRadius?: number;
  /** `1` = max width, `0` = min width. */
  barWidth?: number;
  /** Colour each bar from a sibling field's value. */
  colorByField?: string;
  /** Highlight the whole bar area on hover, not just the bar. */
  fullHighlight?: boolean;
  /** `1` = max width, `0` = min width. */
  groupWidth?: number;
  orientation?: VizOrientation;
  showValue?: VisibilityMode;
  stacking?: StackingMode;
  /** Field to use for the x axis. */
  xField?: string;
  xTickLabelMaxLength?: number;
  xTickLabelRotation?: number;
  /** Negative values skip labels backwards. */
  xTickLabelSpacing?: number;
}

/** `barchart` field config. */
export interface BarChartFieldConfig extends AxisConfig, HideableFieldConfig {
  fillOpacity?: number;
  gradientMode?: GraphGradientMode;
  lineWidth?: number;
  thresholdsStyle?: GraphThresholdsStyleConfig;
}

/** `piechart` display style. */
export enum PieChartType {
  Donut = 'donut',
  Pie = 'pie',
}

/** Labels drawn on the slices. */
export enum PieChartLabels {
  Name = 'name',
  Percent = 'percent',
  Value = 'value',
}

/** Values shown alongside each legend entry. */
export enum PieChartLegendValues {
  Percent = 'percent',
  Value = 'value',
}

export interface PieChartLegendOptions extends VizLegendOptions {
  values?: PieChartLegendValues[];
}

/** `piechart` — .../piechart/panelcfg */
export interface PieChartOptions extends Partial<SingleStatBaseOptions>, Partial<OptionsWithTooltip> {
  displayLabels?: PieChartLabels[];
  legend?: PieChartLegendOptions;
  pieType?: PieChartType;
}

/** `piechart` field config. */
export type PieChartFieldConfig = HideableFieldConfig;

/** `table` — .../table/panelcfg */
export interface TableOptions {
  cellHeight?: TableCellHeight;
  footer?: TableFooterOptions;
  /** Which of several result frames to show. */
  frameIndex?: number;
  showHeader?: boolean;
  showTypeIcons?: boolean;
  sortBy?: TableSortByFieldState[];
}

/** `table` field config. */
export type TableCustomFieldConfig = TableFieldOptions;

/** `geomap` map centring and zoom. */
export interface MapViewConfig {
  /** `zero`, `fit`, `coords`, or a region id. */
  id?: string;
  allLayers?: boolean;
  lastOnly?: boolean;
  lat?: number;
  lon?: number;
  layer?: string;
  maxZoom?: number;
  minZoom?: number;
  padding?: number;
  shared?: boolean;
  zoom?: number;
}

/** `geomap` on-map controls. */
export interface GeomapControlsOptions {
  mouseWheelZoom?: boolean;
  showAttribution?: boolean;
  showDebug?: boolean;
  showMeasure?: boolean;
  showScale?: boolean;
  showZoom?: boolean;
}

export enum GeomapTooltipMode {
  Details = 'details',
  None = 'none',
}

/** Where a geomap centres by default. */
export enum MapCenterID {
  Coords = 'coords',
  Fit = 'fit',
  Zero = 'zero',
}

/** `geomap` — .../geomap/panelcfg */
export interface GeomapOptions {
  basemap?: MapLayerOptions;
  controls?: GeomapControlsOptions;
  layers?: MapLayerOptions[];
  tooltip?: { mode: GeomapTooltipMode };
  view?: MapViewConfig;
}

/** `text` content format. */
export enum TextMode {
  Code = 'code',
  HTML = 'html',
  Markdown = 'markdown',
}

/** Syntax highlighting for `TextMode.Code`. */
export enum CodeLanguage {
  Go = 'go',
  Html = 'html',
  Json = 'json',
  Markdown = 'markdown',
  Plaintext = 'plaintext',
  Sql = 'sql',
  Typescript = 'typescript',
  Xml = 'xml',
  Yaml = 'yaml',
}

export interface CodeOptions {
  language?: CodeLanguage;
  showLineNumbers?: boolean;
  showMiniMap?: boolean;
}

/** `text` — .../text/panelcfg */
export interface TextOptions {
  code?: CodeOptions;
  content: string;
  mode?: TextMode;
}

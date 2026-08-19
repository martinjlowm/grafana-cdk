import {
  App,
  BarChartPanel,
  Dashboard,
  FieldColorModeId,
  SpecialValueMatch,
  StatPanel,
  ThresholdsMode,
  fieldOverride,
  fixedColorOverride,
  rangeMap,
  specialValueMap,
  thresholds,
  valueMap,
} from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'styling', { title: 'Styling', uid: 'styling-0001' });

dashboard.addPanel(
  new StatPanel(dashboard, 'availability', {
    title: 'Availability',
    gridPos: { w: 6, h: 4 },
    fieldConfig: {
      unit: 'percentunit',
      min: 0,
      max: 1,
      // The base step (`value: null`, which Grafana serialises from -Infinity)
      // is added for you, and the steps are sorted.
      thresholds: thresholds({
        mode: ThresholdsMode.Percentage,
        base: 'red',
        steps: [
          { color: 'orange', value: 0.95 },
          { color: 'green', value: 0.99 },
        ],
      }),
      mappings: [
        valueMap({ '0': { text: 'Down', color: 'red' } }),
        rangeMap(0.999, null, { text: 'Nominal', color: 'green' }),
        specialValueMap(SpecialValueMatch.Null, { text: 'No data' }),
      ],
    },
  }),
);

dashboard.addPanel(
  new BarChartPanel(dashboard, 'status', {
    title: 'By status',
    gridPos: { w: 18, h: 4 },
    fieldConfig: {
      color: { mode: FieldColorModeId.Fixed },
      custom: { fillOpacity: 100, lineWidth: 1 },
      overrides: [
        // Shorthand for the overwhelmingly common "colour this one series".
        fixedColorOverride('Online', 'green'),
        fixedColorOverride('Offline', 'red'),
        // The general form: any matcher, any set of properties. `custom.*`
        // properties are the panel plugin's; the rest are standard.
        fieldOverride({ id: 'byRegexp', options: '^p\\d+$' }, [
          { id: 'unit', value: 'ms' },
          { id: 'decimals', value: 0 },
          { id: 'custom.axisPlacement', value: 'right' },
        ]),
      ],
    },
  }),
);

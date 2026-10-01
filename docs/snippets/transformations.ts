import {
  App,
  AthenaDataSource,
  customTransformation,
  Dashboard,
  StatPanel,
  TablePanel,
  transformation,
} from '@martinjlowm/grafana-cdk';

const app = new App();
const dashboard = new Dashboard(app, 'transformations', { title: 'Transformations', uid: 'transform-01' });
const athena = new AthenaDataSource(app, '<datasource-uid>');

dashboard.addPanel(
  new TablePanel(dashboard, 'inventory', {
    title: 'Inventory',
    datasource: athena,
    gridPos: { w: 16, h: 8 },
    targets: [athena.createTarget('rows', { refId: 'A', rawSQL: 'SELECT * FROM analytics.devices' })],
    transformations: [
      // Options are checked against the transformer id: an `organize` payload
      // on a `rowsToFields` transformation does not compile.
      transformation('organize', {
        options: {
          excludeByName: { internal_id: true },
          renameByName: { uuid: 'Device', firmware_version: 'Firmware' },
        },
      }),
      transformation('sortBy', {
        options: { sort: [{ field: 'Device', desc: false }] },
      }),
      transformation('limit', { options: { limitField: 100 } }),
    ],
  }),
);

dashboard.addPanel(
  new StatPanel(dashboard, 'freshness', {
    title: 'Freshness',
    datasource: athena,
    gridPos: { w: 8, h: 8 },
    targets: [athena.createTarget('lag', { refId: 'A', rawSQL: 'SELECT tbl, days_behind FROM analytics.pipeline' })],
    transformations: [
      transformation('rowsToFields', {
        options: {
          mappings: [
            { fieldName: 'tbl', handlerKey: 'field.name' },
            { fieldName: 'days_behind', handlerKey: 'field.value' },
          ],
        },
      }),
      // A transformer this package does not model — a plugin's own, or one
      // newer than this release.
      customTransformation('myPluginTransform', { anything: true }),
    ],
  }),
);

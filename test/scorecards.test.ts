import { App, Dashboard } from '#@/index.js';

it('renders scorecards', () => {
  const app = new App();
  const dashboard = new Dashboard(app, 'scorecards', {
    time: {
      from: "now-1M/M",
      to: "now-1M/M",
    },
    title: 'Scorecards',
  });

  expect(dashboard.toJSON()).toMatchSnapshot();
});

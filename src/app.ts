import * as fs from 'node:fs';
import * as path from 'node:path';
import { Construct, type IConstruct } from 'constructs';

import { Dashboard } from '#@/dashboard.js';

export interface AppProps {
  /** Directory the dashboard JSON is written to. Created if missing. */
  readonly outdir?: string;
  /**
   * How the filename is derived from a dashboard. Defaults to the dashboard's
   * uid when it has one and its title otherwise: titles are not unique and
   * routinely contain `/`, which silently writes into a subdirectory that does
   * not exist.
   */
  readonly fileName?: (dashboard: Dashboard) => string;
}

/**
 * The root of the construct tree, and the thing that writes the JSON.
 *
 * Not a `Dashboard` container in the CDK "stack" sense — Grafana has no unit
 * above a dashboard — so an app is simply the scope that owns them and the
 * place validation is collected.
 */
export class App extends Construct {
  /** Walks up to the app from anywhere in the tree. */
  public static of(construct: IConstruct): App {
    const scope = construct.node.scope;

    if (!scope) {
      // The app is the only construct without a scope.
      return construct as App;
    }

    return App.of(scope);
  }

  public readonly outdir: string;

  readonly #fileName: (dashboard: Dashboard) => string;

  public get dashboards(): Dashboard[] {
    return this.node.findAll().filter((node: IConstruct): node is Dashboard => node instanceof Dashboard);
  }

  constructor(props: AppProps = {}) {
    // The root has no scope and no id; `constructs` types both as required.
    super(undefined as unknown as Construct, '');

    this.outdir = props.outdir ?? 'dist';
    this.#fileName = props.fileName ?? ((dashboard) => dashboard.uid ?? dashboard.title);
  }

  /**
   * Validates every construct, then writes one JSON file per dashboard.
   *
   * Validation runs across the whole tree before anything is written, so a
   * dashboard is never left half-emitted next to a failure.
   */
  public synth(): void {
    const errors = this.validate();

    if (errors.length > 0) {
      throw new Error(`Validation failed with the following errors:\n  ${errors.join('\n  ')}`);
    }

    fs.mkdirSync(this.outdir, { recursive: true });

    const written = new Map<string, string>();

    for (const dashboard of this.dashboards) {
      const name = this.#fileName(dashboard);
      const previous = written.get(name);

      if (previous) {
        throw new Error(
          `Dashboards [${previous}] and [${dashboard.node.path}] both synthesize to ${name}.json; one would overwrite the other.`,
        );
      }
      written.set(name, dashboard.node.path);

      fs.writeFileSync(path.join(this.outdir, `${name}.json`), `${dashboard.toJSONString()}\n`);
    }
  }

  /** Every validation error in the tree, prefixed with the construct's path. */
  public validate(): string[] {
    const errors: string[] = [];

    for (const child of this.node.findAll()) {
      for (const error of child.node.validate()) {
        errors.push(`[${child.node.path}] ${error}`);
      }
    }

    return errors;
  }
}

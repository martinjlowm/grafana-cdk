import * as fs from 'fs';
import * as path from 'path';
import { Construct, IConstruct, Node } from 'constructs';
import { Dashboard } from './dashboard';

export interface AppProps {
  readonly outdir?: string;
}

class SynthRequestCache {
  public nodeChildrenCache: Map<Node, IConstruct[]> = new Map<Node, IConstruct[]>();

  public findAll(node: Node): IConstruct[] {
    if (this.nodeChildrenCache.has(node)) {
      return this.nodeChildrenCache.get(node)!;
    }

    const children = node.findAll();
    this.nodeChildrenCache.set(node, children);
    return children;
  }
}

export class App extends Construct {

  public static of(c: IConstruct): App {

    const scope = c.node.scope;

    if (!scope) {
      // the app is the only construct without a scope.
      return c as App;
    }

    return App.of(scope);
  }

  public readonly outdir: string;

  public get dashboards(): Dashboard[] {
    return this.node.children.filter((node: IConstruct): node is Dashboard => node instanceof Dashboard);
  }

  constructor(props: AppProps = {}) {
    super(undefined as any, '');
    this.outdir = props.outdir ?? 'dist';
  }

  public synth(): void {
    fs.mkdirSync(this.outdir, { recursive: true });

    const cache = new SynthRequestCache();

    // Since we plan on removing the distributed synth mechanism, we no longer call `Node.synthesize`, but rather simply implement
    // the necessary operations. We do however want to preserve the distributed validation.
    validate(this, cache);

    for (const dashboard of this.dashboards) {
      fs.writeFileSync(path.join(this.outdir, `${dashboard.title}.json`), dashboard.toJSON());
    }
  }

}

function validate(app: App, cache: SynthRequestCache) {
  const errors = [];
  for (const child of cache.findAll(app.node)) {
    const childErrors = child.node.validate();
    for (const error of childErrors) {
      errors.push(`[${child.node.path}] ${error}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed with the following errors:\n  ${errors.join('\n  ')}`);
  }
}

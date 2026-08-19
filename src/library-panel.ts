import type { LibraryPanelRef } from '@grafana/schema';
import { Construct } from 'constructs';

export type LibraryPanelProps = LibraryPanelRef;

/**
 * A reference to a library panel — a panel saved once in Grafana and reused
 * across dashboards.
 *
 * Only the reference lives in the dashboard JSON; the configuration lives in
 * the library, so this package can describe the link but not the panel.
 */
export class LibraryPanel extends Construct implements LibraryPanelRef {
  public readonly name: LibraryPanelRef['name'];
  public readonly uid: LibraryPanelRef['uid'];

  constructor(scope: Construct, id: string, props: LibraryPanelProps) {
    super(scope, id);

    this.name = props.name;
    this.uid = props.uid;
  }

  public asRef(): LibraryPanelRef {
    return { uid: this.uid, name: this.name };
  }

  public toJSON(): LibraryPanelRef {
    return this.asRef();
  }
}

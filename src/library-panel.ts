import { Construct } from 'constructs';
import type { LibraryPanelRef } from '@grafana/schema';

type LibraryPanelProps = LibraryPanelRef;

export class LibraryPanel extends Construct implements LibraryPanelRef {
  public readonly name: LibraryPanelRef['name'];
  public readonly uid: LibraryPanelRef['uid'];

  constructor(scope: Construct, id: string, props: LibraryPanelProps) {
    super(scope, id);

    this.name = props.name;
    this.uid = props.uid;
  }

  asRef() {
    return {
      uid: this.uid,
      name: this.name,
    };
  }
}

import type { GridPos } from '@grafana/schema';
import { Construct } from 'constructs';

type GridPositionProps = {
  x?: GridPos['x'];
  y?: GridPos['y'];
  w: GridPos['w'];
  h: GridPos['h'];
  static?: GridPos['static'];
};

export class GridPosition extends Construct {
  public readonly x: GridPos['x'];
  public readonly y: GridPos['y'];
  public readonly w: GridPos['w'];
  public readonly h: GridPos['h'];
  public readonly static: GridPos['static'];

  constructor(scope: Construct, id: string, props: GridPositionProps) {
    super(scope, id);

    this.x = props.x || 0;
    this.y = props.y || 0;
    this.w = props.w;
    this.h = props.h;
    this.static = props.static;
  }
}

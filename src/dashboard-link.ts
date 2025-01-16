import { Construct } from 'constructs';
import type { DashboardLink as IDashboardLink, DashboardLinkType } from '@grafana/schema';

type DashboardLinkProps = {
  asDropdown: boolean;
  icon: string;
  includeVars: boolean;
  keepTime: boolean;
  tags: Array<string>;
  targetBlank: boolean;
  title: string;
  tooltip: string;
  type: DashboardLinkType;
  url?: string;
};

export class DashboardLink extends Construct implements IDashboardLink {
  public readonly asDropdown: boolean;
  public readonly icon: string;
  public readonly includeVars: boolean;
  public readonly keepTime: boolean;
  public readonly tags: Array<string>;
  public readonly targetBlank: boolean;
  public readonly title: string;
  public readonly tooltip: string;
  public readonly type: DashboardLinkType;
  public readonly url?: string;

  constructor(scope: Construct, id: string, props: DashboardLinkProps) {
    super(scope, id);

    this.asDropdown = props.asDropdown;
    this.icon = props.icon;
    this.includeVars = props.includeVars;
    this.keepTime = props.keepTime;
    this.tags = props.tags;
    this.targetBlank = props.targetBlank;
    this.title = props.title;
    this.tooltip = props.tooltip;
    this.type = props.type;
    this.url = props.url;
  }

  toJSON() {
    return JSON.stringify(this);
  }
}

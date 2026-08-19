import type { DashboardLinkType, DashboardLink as IDashboardLink } from '@grafana/schema';
import { Construct } from 'constructs';

export type { DashboardLinkType, IDashboardLink };

export interface DashboardLinkProps {
  /** Text shown on the link. */
  title: string;
  /**
   * `link` points at an arbitrary URL; `dashboards` lists the dashboards
   * carrying every tag in `tags`.
   */
  type: DashboardLinkType;
  /** Required when `type` is `link`. */
  url?: string;
  /** Tags to select dashboards by. Only meaningful when `type` is `dashboards`. */
  tags?: string[];
  /** Collapse a `dashboards` link into a dropdown rather than a row of links. */
  asDropdown?: boolean;
  /** Grafana icon name, e.g. `external link`. */
  icon?: string;
  /** Carry the current template variable values across. */
  includeVars?: boolean;
  /** Carry the current time range across. */
  keepTime?: boolean;
  /** Open in a new tab. */
  targetBlank?: boolean;
  tooltip?: string;
}

/** A link in the dashboard header, or on a panel. */
export class DashboardLink extends Construct {
  public readonly asDropdown: boolean;
  public readonly icon: string;
  public readonly includeVars: boolean;
  public readonly keepTime: boolean;
  public readonly tags: string[];
  public readonly targetBlank: boolean;
  public readonly title: string;
  public readonly tooltip: string;
  public readonly type: DashboardLinkType;
  public readonly url?: string;

  constructor(scope: Construct, id: string, props: DashboardLinkProps) {
    super(scope, id);

    if (props.type === 'link' && !props.url) {
      throw new SyntaxError(`Dashboard link '${props.title}' is of type 'link' but has no url; it would render dead.`);
    }

    this.asDropdown = props.asDropdown ?? false;
    this.icon = props.icon ?? 'external link';
    this.includeVars = props.includeVars ?? false;
    this.keepTime = props.keepTime ?? false;
    this.tags = props.tags ?? [];
    this.targetBlank = props.targetBlank ?? false;
    this.title = props.title;
    this.tooltip = props.tooltip ?? '';
    this.type = props.type;
    this.url = props.url;
  }

  public toJSON(): IDashboardLink {
    return {
      asDropdown: this.asDropdown,
      icon: this.icon,
      includeVars: this.includeVars,
      keepTime: this.keepTime,
      tags: this.tags,
      targetBlank: this.targetBlank,
      title: this.title,
      tooltip: this.tooltip,
      type: this.type,
      ...(this.url === undefined ? {} : { url: this.url }),
    };
  }
}

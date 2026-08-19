# Design notes

Why the constructs are shaped the way they are. Nothing here is needed to use
the package; it is here so the shape is arguable rather than arbitrary.

## The problem this package solves

`@grafana/schema` is a faithful description of the dashboard model, and the
dashboard model is loosely typed in exactly the places where mistakes are
expensive:

- `time.from` and `timeFrom` are `string`, covering both relative markup and ISO
  instants.
- `Panel.targets` is `Array<Record<string, unknown>>` — every data source
  plugin's query shape, unmodelled.
- `Panel.options` is `Record<string, unknown>` — every panel plugin's options,
  unmodelled.
- `DataTransformerConfig.options` and `MatcherConfig.options` are `unknown`,
  keyed by a registry `id` that is a bare `string`.
- `fieldConfig.overrides[].properties[].id` is a `string` that is sometimes a
  `FieldConfig` key and sometimes a `custom.`-prefixed plugin key.

Each of those has the same failure mode: the dashboard imports cleanly, renders,
and is wrong. There is no error to read. This package's job is to move those
failures to compile time, or failing that to `synth()`.

## Values versus constructs

Things with identity in the tree are constructs: dashboards, panels, data
sources, targets, variables. Things that are just data are plain values with
builder functions: time ranges, thresholds, value mappings, field overrides,
transformations.

The line is whether validation needs to see the rest of the tree. A threshold
list is wrong or right on its own, so `thresholds()` throws immediately. Two
panels overlapping is only knowable at the dashboard level, so `GridPosition` is
a construct that registers a validation and `App.synth()` collects them all.

`DataTransformer` used to be a construct. It became a value because an array of
constructs, each needing a unique scope id, is a worse way to express "three
transformations in order" than an array of objects.

## Why layout is the dashboard's job

A panel cannot know its own `x`/`y`: both are relative to its siblings. Making
every caller restate coordinates it could derive is how grids drift out of
alignment — you insert a panel at the top and hand-edit thirty `y` values.

So `gridPos.x`/`y` are optional, and the dashboard flows unpinned panels in the
order they were added, wrapping at 24 columns and clearing the tallest panel of
the previous line. Panels that need a specific arrangement pin both coordinates
and keep them exactly.

The flow is deliberately *not* the gravity solver the Grafana UI runs when you
drag a panel. That solver is stateful, order-dependent and hard to predict from
source; a reading-order flow is neither. The overlap check is what keeps flowed
and pinned panels honest with each other, since they share one coordinate space.

Panel ids work the same way, and for the same reason: unique within a dashboard,
assigned from above the highest explicit id so the two schemes cannot collide.

## Why the grid allocator is a separate thing

Flow covers dashboards that read as equal blocks top to bottom. It cannot
express proportions — "this chart takes two thirds of the row" — because the
flow cursor only knows what it has already placed, not what is still coming.

`Grid` is the other half: you state the split up front and it returns concrete
areas. It is a plain value, not a construct, because it computes coordinates and
has no identity in the tree; and it hands back `GridArea`s rather than mutating
panels, so a grid can be used for part of a dashboard and ignored for the rest.

Two details are load-bearing. Widths are apportioned by largest remainder rather
than rounded per cell, because a fifth of 24 columns is 4.8 and independent
rounding either overflows the row or leaves a one-column hole running down the
dashboard — the sort of thing you only notice in a screenshot. And the return
types are tuples rather than arrays, mapped from the span literal, so
`const [chart, side] = grid.row(8, ['two-thirds', 'third'])` yields `GridArea`
rather than `GridArea | undefined` for anyone building with
`noUncheckedIndexedAccess`. A convenience API that makes you write `!` on every
line is not a convenience.

## Why time boundaries need both a type and a parser

`RelativeTimeString` is a template literal type, which catches `now-6H`,
`now-6hh` and `6h` on a literal — the mistakes people actually make. It cannot
catch everything: `${number}` also admits `now-1e3d`. So `isRelativeTime()`
exists and every constructor runs it.

`AbsoluteTimeString` is nominal because it has to be. A plain `string` in the
union would widen the whole union to `string` and discard every check above.
`absoluteTime()` is the only way to make one, which also means normalisation
happens in exactly one place.

Snapping is modelled by *edge* rather than as a pure string transform because
Grafana resolves the two ends of a range in opposite directions. Without that,
`{from: 'now-1M/M', to: 'now-1M/M'}` — Grafana's own "previous month" preset —
looks like a zero-width range and the ordering check rejects a valid dashboard.
Month arithmetic is calendar arithmetic for the same class of reason: `now-1M`
from 17 March is 17 February, not 30 days earlier.

## Why targets come from their data source

Grafana's JSON repeats a data source reference on the panel and again on every
query. Two copies of the same fact in a hand-written document drift; two copies
produced by `asRef()` on one object cannot.

The factory also gives each plugin somewhere to put its preconditions —
CloudWatch's metric-math id rules, Athena's `resultReuseMaxAgeInMinutes` cap.
Those are all cases where the backend rejects the query and Grafana shows an
empty panel with no explanation, which is the worst kind of error to debug.

`asRef()` on a target exists for the same reason: an expression addressing
`$A` and a query with `refId: 'A'` are the same fact written twice.

## Why panel options are transcribed rather than imported

`@grafana/schema` publishes every building block the per-panel options compose
from — `SingleStatBaseOptions`, `VizLegendOptions`, `TableFieldOptions`,
`GraphFieldConfig` — but not the compositions. Those live in
`packages/grafana-schema/src/raw/composable/<plugin>/panelcfg`, which the npm
package does not ship.

So `src/panels/options.ts` transcribes the composition and imports the parts.
That keeps the transcribed surface small (a dozen interfaces, mostly two or
three fields each) and leaves the large shared types on their upstream
definitions, where they stay current with the dependency.

Every field is optional there, even where the generated schema marks it
required. Grafana fills unset options from the plugin's defaults on load, so
requiring all nine of a stat panel's options in order to set one of them buys
noise and nothing else.

## Why `FieldConfig` has no defaults

It used to seed every panel with `decimals: 1`, a green-to-red threshold at
5000, and `mappings: []`. That is right for one panel — the one it was written
for — and silently wrong everywhere else, because a panel with a threshold you
did not ask for still renders and still looks deliberate.

A default that is wrong and visible is better than a default that is wrong and
plausible. Grafana's own new-panel thresholds are available as
`defaultThresholds()` for anyone who wants them.

## Why `synth()` validates everything before writing anything

A partially written output directory is worse than an empty one, because the
next deploy ships it. So validation walks the whole tree first and `synth()`
throws with every error at once, each prefixed with the offending construct's
path.

The same reasoning covers the filename collision check: two dashboards resolving
to one file used to mean the second silently overwrote the first.

## Serialisation

Every construct implements `toJSON()` returning a plain object in a fixed key
order, and `JSON.stringify` picks those up through the standard hook.

The previous approach serialised the constructs directly with a replacer that
dropped the `node` key. It worked, but it emitted whatever fields happened to be
assigned, in assignment order, and any new field on a construct leaked into the
output. Explicit `toJSON()` means the emitted document is a deliberate mapping,
undefined fields are omitted rather than emitted as `null`, and the snapshots
are stable across refactors of the classes behind them.

## Package layout

`#@/*` resolves to `./src/*` and `#$/*` to `./test/*`, unconditionally. The
checkout therefore runs against sources under any tool, with no flags: plain
`bun test` works, and so does anything else that honours the `imports` map.

The published package needs those same specifiers to point at `./dist`, and it
gets there because `nix/dist.nix` rewrites `imports` (and `exports`) when it
builds the publish artifact. That is one substitution in one place, which is
strictly less machinery than the alternative these paths used to carry: an
`imports` map conditioned on `development`, plus every runner having to opt into
that condition. Bun has no `bunfig.toml` equivalent of `--conditions`, so the
flag had to be threaded through `yarn test` and every `just` recipe — a
convention that only had to be forgotten once, by anyone typing `bun test` out
of habit, to produce a wall of "Cannot find module".

## Why specifiers end in `.ts`

The long-standing TypeScript convention is to import `./foo.js` — the file the
compiler is *going* to emit — because TypeScript never rewrites module
specifiers. That convention is correct for a project whose code only runs after
a build. This one's does not: development, tests and synthesis all execute the
sources in place, and the build exists solely to produce the npm artifact. So
the specifier names the file that exists.

Two compiler options make that work while still emitting:
`allowImportingTsExtensions` permits it, and `rewriteRelativeImportExtensions`
is what permits *that* alongside an emit. The second one does no rewriting here
at all — TypeScript only rewrites **relative** paths, and every specifier in
this package goes through the `imports` map instead. The emitted `dist/*.js` and
`dist/*.d.ts` therefore carry `#@/panel.ts` verbatim, and the published map
keys on `#@/*.ts` to send them to `./dist/*.js`. A consumer resolves it without
knowing any of this — verified by building the artifact and both running and
typechecking against it.

That rewrite lives in a jq expression in `nix/dist.nix`, so renaming a specifier
in `package.json` without updating it there would ship an artifact that resolves
nothing, and neither Bun nor TypeScript would notice. `test/resolution.test.ts`
checks the two maps against each other for that reason.

Worth knowing if you add a **relative** import: `./foo.js` would break under
Node's type stripper, because Node resolves relative specifiers literally and
will not map `.js` to `.ts`. Subpath imports are exempt precisely because the
`imports` map does that mapping. Nothing enforces the convention, so prefer
`#@/*` for new imports and this stays a non-issue.

Note also that the source is **not** erasable: it declares enums, which Node's
type stripper rejects outright (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Bun is a
full transpiler rather than a stripper, so it handles them, which is why "run in
place" here means Bun specifically. Making the source strip-able would mean
replacing every enum with a const-object and union-type pair, loosening those
public types from nominal to structural — deliberately not done.

`exports` does still carry a `development` condition, for one narrow reason:
`docs/snippets` imports the package by name (`@martinjlowm/grafana-cdk`) so the
documented code reads the way a consumer's would, and `tsc` needs somewhere to
resolve that to in a checkout with no `./dist`. It is a type-checking concern
only — nothing executes those snippets — and `tsconfig.json`'s
`customConditions` is what turns it on.

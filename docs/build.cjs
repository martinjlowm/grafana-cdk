// Body of the `docs` devenv script (devenv.nix runs this with node).
//
// Expands `$embed: <relative path>$` markers in every `*.tpl.md` under docs/
// and writes the result next to its template — so every code block in the
// documentation is a real file under docs/snippets, type-checked by
// `tsc -p docs/snippets` rather than drifting out of date in prose.
//
// `docs/README.tpl.md` is the one exception: it renders to the repository root,
// because that is where GitHub and npm look for it.
//
// Extensionless when devenv writes it out, so node loads it as CommonJS —
// `require`, not `import`. Checked in as .cjs for the same reason.
const fs = require('node:fs');
const path = require('node:path');

// The repository root, found by walking up from the working directory rather
// than from __dirname: devenv writes this script's body into the Nix store, so
// __dirname is a store path with no docs/ beside it. DEVENV_ROOT is set inside
// the dev shell; the walk covers everything else.
function repositoryRoot() {
  let directory = path.resolve(process.env.DEVENV_ROOT ?? process.cwd());

  for (;;) {
    if (fs.existsSync(path.join(directory, 'docs', 'README.tpl.md'))) {
      return directory;
    }

    const parent = path.dirname(directory);

    if (parent === directory) {
      throw new Error(`No docs/README.tpl.md above ${process.cwd()}; run this from inside the repository.`);
    }

    directory = parent;
  }
}

const ROOT = repositoryRoot();
const DOCS = path.join(ROOT, 'docs');

function templates(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === 'snippets' ? [] : templates(full);
    }

    return entry.name.endsWith('.tpl.md') ? [full] : [];
  });
}

function expand(template) {
  const source = path.dirname(template);

  return fs.readFileSync(template, 'utf8').replace(/\$embed: (.+)\$/g, (_, snippet) => {
    const target = path.resolve(source, snippet);

    if (!fs.existsSync(target)) {
      throw new Error(`${path.relative(ROOT, template)} embeds ${snippet}, which does not exist`);
    }

    return fs.readFileSync(target, 'utf8').trim();
  });
}

function destination(template) {
  const name = path.basename(template).replace(/\.tpl\.md$/, '.md');

  return template === path.join(DOCS, 'README.tpl.md')
    ? path.join(ROOT, 'README.md')
    : path.join(path.dirname(template), name);
}

// With an argument, behave like the old single-file `snippets` script and write
// to stdout; without one, regenerate every page.
const [, , explicit] = process.argv;

if (explicit) {
  process.stdout.write(expand(path.resolve(explicit)));
} else {
  for (const template of templates(DOCS).sort()) {
    const output = destination(template);
    fs.writeFileSync(output, expand(template));
    process.stderr.write(`${path.relative(ROOT, template)} -> ${path.relative(ROOT, output)}\n`);
  }
}

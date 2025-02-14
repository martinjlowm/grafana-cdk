const fs = require('node:fs');
const path = require('node:path');

module.exports = (request, context) => {
  const options = {
    paths: [context.basedir],
  };

  if (request.startsWith('#')) {
    const { imports } = require('./package.json');

    // TODO: https://github.com/nodejs/node/commit/e85964610cbd3567ddeb740223d9ea29a8da7090
    // conditions are passed correctly with the current stable release of
    // Node.js - the following logic mimics the intended behavior that is coming
    // with a new release

    // options.plugnplay = false;
    // options.conditions = new Set(['development']);

    let filePath;

    for (const pattern in imports) {
      const wildStarIndex = pattern.indexOf('*');
      if (wildStarIndex === -1) {
        continue;
      }

      const subpath = pattern.substring(0, wildStarIndex);

      if (request.startsWith(subpath)) {
        const unprefixedReference = request.replace(subpath, '');
        const subpathConfig = imports[pattern];
        const matchers = subpathConfig.development || subpathConfig.default;

        for (const matcher of Array.isArray(matchers) ? matchers : [matchers]) {
          try {
            const filePathExtensionless = matcher.replace('*', unprefixedReference.replace(/\.[^/.]+$/, ''));

            filePath = require.resolve(filePathExtensionless);
            break;
          } catch {}
        }
      }

      if (filePath) {
        break;
      }
    }

    if (filePath) {
      return require.resolve(filePath, options);
    }
  }

  try {
    const resolved = require.resolve(request, options);
    if (resolved) {
      return resolved;
    }
  } catch {
    const resolved = require.resolve(path.resolve(context.basedir, request).replace(/\.js$/, '.ts'), options);
    if (resolved) {
      return resolved;
    }
  }

  if (fs.existsSync(request)) {
    return request;
  }

  return request;
};

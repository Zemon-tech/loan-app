// Metro config for an Expo app inside an npm-workspaces monorepo.
// Lets Metro find the @app/shared workspace package and the hoisted node_modules
// at the repo root. See https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const sharedRoot = path.resolve(workspaceRoot, 'shared');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so changes in shared/ hot-reload).
config.watchFolders = [workspaceRoot];

// 2. Resolve modules from both the app's and the workspace root's node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. @app/shared resolution (D-SHARED, design §0 fallback).
//    `@app/shared` is the `.ts` source package (package.json main/exports -> ./src/index.ts),
//    and its barrel re-exports with NodeNext `.js` specifiers (`export * from './money.js'`)
//    against `.ts` files. Metro does not map a `.js` request to a sibling `.ts` on its own,
//    so a scoped `resolveRequest` rewrites `.js` -> `.ts` ONLY for relative imports inside
//    `shared/src`. Everything else falls through to Metro's default resolver.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.endsWith('.js') &&
    (moduleName.startsWith('./') || moduleName.startsWith('../')) &&
    context.originModulePath &&
    context.originModulePath.startsWith(sharedRoot)
  ) {
    const candidate = path.resolve(path.dirname(context.originModulePath), moduleName);
    const tsCandidate = candidate.replace(/\.js$/, '.ts');
    if (fs.existsSync(tsCandidate)) {
      return { type: 'sourceFile', filePath: tsCandidate };
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

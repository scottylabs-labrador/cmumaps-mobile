const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const srcRoot = path.resolve(projectRoot, "src");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith("@/")) {
    return context.resolveRequest(context, path.resolve(srcRoot, moduleName.slice(2)), platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

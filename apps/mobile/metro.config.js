import { getDefaultConfig } from "expo/metro-config.js";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

// nativewind/metro is a CJS directory package — use createRequire for ESM compatibility
const require = createRequire(import.meta.url);
const { withNativeWind } = require("nativewind/metro");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Resolve modules from monorepo root node_modules first, then project-local
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// pnpm uses symlinks — enable symlinks support
config.resolver.unstable_enableSymlinks = true;

export default withNativeWind(config, { input: "./global.css" });

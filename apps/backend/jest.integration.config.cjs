/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/src/__integration__"],
  moduleFileExtensions: ["js", "json", "ts", "mjs"],
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    "^@repo/db$": "<rootDir>/../../packages/db/src/index.ts",
    "^@repo/db/(.*)$": "<rootDir>/../../packages/db/src/$1",
    "^@repo/analytics$": "<rootDir>/../../packages/analytics/dist/index.cjs",
    "^@repo/services$": "<rootDir>/../../packages/services/src/index.ts",
    "^@repo/services/(.*)$": "<rootDir>/../../packages/services/src/$1",
    "^@repo/trpc$": "<rootDir>/../../packages/trpc/src/index.ts",
    "^@repo/trpc/(.*)$": "<rootDir>/../../packages/trpc/src/$1",
    "^src/(.*)$": "<rootDir>/src/$1",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transformIgnorePatterns: ["/node_modules/(?!(@repo))"],
  // Integration tests need longer timeouts (containers start-up)
  testTimeout: 60000,
  forceExit: true,
  detectOpenHandles: true,
  // Run integration tests sequentially to avoid container port conflicts
  maxWorkers: 1,
  testRegex: ".*\\.integration\\.spec\\.ts$",
};

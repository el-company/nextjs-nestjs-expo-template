import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/web.ts", "src/mobile.ts"],
  format: ["cjs", "esm"],
  dts: { tsconfig: "tsconfig.dts.json" },
  splitting: false,
  sourcemap: true,
});

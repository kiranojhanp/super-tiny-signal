import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: true,
  bundle: false,
  entry: ["src/**/*.ts"],
  format: ["esm"],
  target: "esnext",
  minify: true,
  outDir: "./dist",
  sourcemap: false,
  splitting: true,
  treeshake: true,
});

import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";

const dev = process.env.ROLLUP_WATCH === "true";

export default {
  input: "src/wled-card.ts",
  output: {
    file: "dist/ha-wled-card.js",
    format: "es",
    sourcemap: dev,
    inlineDynamicImports: true,
  },
  plugins: [resolve(), typescript(), !dev && terser()],
};

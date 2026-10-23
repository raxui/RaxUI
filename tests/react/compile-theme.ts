import * as sass from "sass"

/** Compiles the shared theme with Bootstrap, in the documented order, plus any extra imports. */
export function compileTheme(extraImports: string[] = [], extraLoadPaths: string[] = []) {
  const entry = ['@import "variables";', '@import "bootstrap/scss/bootstrap";', '@import "core";', ...extraImports].join("\n")
  return sass.compileString(entry, {
    loadPaths: ["theme/scss", "node_modules", ...extraLoadPaths],
    // Bootstrap 5.3 itself uses @import and global functions; those warnings are not ours.
    quietDeps: true,
    silenceDeprecations: ["import", "global-builtin", "color-functions", "if-function"],
  }).css
}

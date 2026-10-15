// PostToolUse hook (Write|Edit): prettier --write, then eslint --fix on JS/TS files.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const file = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path;
if (
  !file ||
  !existsSync(file) ||
  /[\\/](node_modules|\.next|\.playwright[^\\/]*)[\\/]/.test(file)
)
  process.exit(0);
// Run the tools' JS entrypoints with node: spawning .cmd shims fails on Windows.
const run = (bin, ...args) =>
  spawnSync(
    process.execPath,
    [join(root, "node_modules", bin), ...args, file],
    { cwd: root, encoding: "utf8" },
  );
run("prettier/bin/prettier.cjs", "--write", "--ignore-unknown");
const ext = extname(file);
if (/^\.(m|c)?[jt]sx?$/.test(ext)) {
  const r = run("eslint/bin/eslint.js", "--fix");
  if (r.status !== 0) {
    // exit 2 feeds stderr back to Claude so it fixes what --fix could not
    console.error(r.stdout + r.stderr);
    process.exit(2);
  }
}
// Drop blank lines so only code remains. Markdown is skipped: blank lines are syntax there.
// ponytail: also strips blank lines inside template literals; use a parser if that ever matters.
if (/^\.(m|c)?[jt]sx?$|^\.(css|json)$/.test(ext)) {
  const src = readFileSync(file, "utf8");
  const out = src.replace(/^[ \t]*\r?\n/gm, "");
  if (out !== src) writeFileSync(file, out);
}

// `npm run deploy:dev` / `npm run deploy:prod`: check, build and install Tomte into Home Assistant.
//
//   dev   builds the current branch as tomte-dev -> /config/www/tomte-dev        (panel /tomte-dev)
//   prod  builds `main` as tomte                -> /config/www/tomte             (panel /tomte)
//
// Both run the same checks first (translations, syntax, a render smoke test), back up the bundle they replace in
// .deploy-backups/<variant>/ and install the loader.js that build.mjs writes next to the bundle: /local is cached for 31 days, the loader
// imports the bundle under its current ETag, so a reload in the browser always gets the new build.
// Other targets: TOMTE_TARGET, or { "dev": "...", "prod": "..." } in deploy.local.json (git-ignored).
// Working over a network share: { "tools": "<local folder>" } there loads jsdom and the esbuild binary from a local disk.
// Roll back with `npm run rollback:dev` / `npm run rollback:prod`.
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const variant = process.argv[2];
if (!["dev", "prod"].includes(variant)) { console.error("usage: node dev/deploy.mjs dev|prod [--force]"); process.exit(1); }
const force = process.argv.includes("--force");
const run = (cmd, opts = {}) => execSync(cmd, { stdio: "inherit", ...opts });
const out = cmd => execSync(cmd, { encoding: "utf8" }).trim();

const local = existsSync("deploy.local.json") ? JSON.parse(readFileSync("deploy.local.json", "utf8")) : {};
if (local.tools) process.env.ESBUILD_BINARY_PATH ||= join(local.tools, "node_modules/@esbuild/win32-x64/esbuild.exe");
const DEFAULT = { dev: "/config/www/tomte-dev", prod: "/config/www/tomte" };
const target = process.env.TOMTE_TARGET || local[variant] || DEFAULT[variant];
if (!existsSync(join(target, ".."))) { console.error(`Target ${target} is not reachable from here. Set TOMTE_TARGET or deploy.local.json.`); process.exit(1); }

const git = (a) => out(`git -c safe.directory='*' ${a}`);
const branch = git("rev-parse --abbrev-ref HEAD"), dirty = git("status --porcelain");
if (variant === "prod" && !force) {
  if (branch !== "main") { console.error(`prod is built from main, you are on ${branch}. Merge first (or --force).`); process.exit(1); }
  if (dirty) { console.error("The working tree has uncommitted changes. Commit them first (or --force).\n" + dirty); process.exit(1); }
}

const dev = variant === "dev", name = dev ? "tomte-dev" : "tomte", tag = dev ? "tomte-panel-dev" : "tomte-panel", dist = dev ? "dist-dev" : "dist";
console.log(`\n[1/4] checks`);
run("node dev/i18n-check.mjs");
console.log(`\n[2/4] build ${variant}`);
run(`node build.mjs${dev ? " --dev" : ""}`);
const bundle = `${dist}/${name}.js`, { version } = JSON.parse(readFileSync(`${dist}/version.json`, "utf8"));
run(`node --check ${bundle}`);
console.log(`\n[3/4] smoke test`);
run(`node dev/smoke.mjs ${bundle} ${tag}`);

console.log(`\n[4/4] install into ${target}`);
mkdirSync(target, { recursive: true });
const backupDir = join(".deploy-backups", variant); mkdirSync(backupDir, { recursive: true });
const current = join(target, `${name}.js`);
if (existsSync(current)) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  copyFileSync(current, join(backupDir, `${stamp}.js`));
  const keep = readdirSync(backupDir).filter(f => f.endsWith(".js")).sort();
  for (const f of keep.slice(0, Math.max(0, keep.length - 10))) rmSync(join(backupDir, f));   // keep the last 10
}
copyFileSync(bundle, current);
copyFileSync(`${dist}/loader.js`, join(target, "loader.js"));   // built next to the bundle by build.mjs
console.log(`deployed ${version} (${branch}${dirty ? ", with uncommitted changes" : ""}) to ${target}; reload the browser`);

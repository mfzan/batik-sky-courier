// Batik Sky Courier — entry program (Node 22, standard library only).
//
// The game lives in game/ as plain static files (game/index.html plus its ES
// modules; no build step, no network request at play time) and its screenshots
// live in screenshots/. This program hands both in: it copies them beside
// this file into the output directory and writes dossier.json there with the
// vendored make.fun library, so the scorer and the judge read exactly what
// the repository holds.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Caps mirror the scorer's own limits: at most 4 screenshots of 256 KiB each,
// game/ at most 993 files and 48 MiB in all, paths at most 1000 bytes, and the
// dossier text capped at 160 KiB so the judge's view stays inside its budget.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Short run summary for the operator: what landed and how big the dossier is.
function countFiles(dir) {
  let files = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    files += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return files;
}
console.log(
  `batik-sky-courier: game/ ${countFiles(join(out, 'game'))} files, ` +
    `screenshots/ ${readdirSync(join(out, 'screenshots')).length} files, ` +
    `dossier.json ${statSync(join(out, 'dossier.json')).size} bytes -> ${out}`,
);

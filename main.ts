import { cpSync as copyTree, mkdirSync as makeDirectory, rmSync as eraseTree, writeFileSync as saveFile } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath as decodeFileUrl } from 'node:url';
import * as dossierLibrary from './vendor/makefun-game.ts';

function chooseDestination(arguments_: string[]): string {
  for (let position = 0; position < arguments_.length; position += 1) {
    const token = arguments_[position]!;
    if (token === '--output') {
      const next = arguments_[position + 1];
      if (next === undefined || next.length === 0 || next.startsWith('--')) throw new Error('--output needs a directory');
      return next;
    }
    if (token.startsWith('--output=')) {
      const value = token.slice('--output='.length);
      if (value.length === 0) throw new Error('--output needs a directory');
      return value;
    }
  }
  return process.env.MAKEFUN_OUTPUT_DIR || '/output';
}

function isInside(parent: string, candidate: string): boolean {
  const distance = relative(parent, candidate);
  return distance === '' || (distance !== '..' && !distance.startsWith(`..${sep}`) && !isAbsolute(distance));
}

const projectDirectory = dirname(decodeFileUrl(import.meta.url));
const outputDir = resolve(chooseDestination(process.argv.slice(2)));
const protectedPaths = [
  'game', 'screenshots', 'vendor', '.git', '.makefun', 'main.ts', 'serve.ts', 'README.md', 'LICENSE', 'shots.json',
].map((name) => join(projectDirectory, name));
if (isInside(outputDir, projectDirectory) || protectedPaths.some((path) => isInside(path, outputDir))) {
  throw new Error('The output directory overlaps the project or one of its protected files');
}

eraseTree(outputDir, { recursive: true, force: true });
makeDirectory(outputDir, { recursive: true });
copyTree(join(projectDirectory, 'game'), join(outputDir, 'game'), { recursive: true });
copyTree(join(projectDirectory, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const { buildDossier } = dossierLibrary;
const dossierBytes = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
saveFile(join(outputDir, 'dossier.json'), dossierBytes);
console.log(`Prepared ${outputDir}: game/, screenshots/, dossier.json`);

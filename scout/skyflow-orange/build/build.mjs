// Bundles the game into one self contained index.html at the repo root.
// Run from this folder: npm install, then npm run build
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const out = await build({
  entryPoints: [join(root, 'src/main.jsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['es2019'],
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  nodePaths: [join(here, 'node_modules')],
  write: false,
  legalComments: 'none'
});

const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(root, 'src/style.css'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="theme-color" content="#cfe6f5">
<meta name="description" content="Run a tower crane and stack crates as high as they will stand before the clock runs out.">
<title>Sky Flow</title>
<style>${css}</style>
</head>
<body>
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;

writeFileSync(join(root, 'index.html'), html);
console.log('index.html written, ' + Math.round(html.length / 1024) + ' KB');

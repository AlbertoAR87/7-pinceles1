import { build } from 'esbuild';
import { mkdir, copyFile, readFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await build({ entryPoints: ['app.js'], bundle: true, minify: true, format: 'esm', target: ['es2022'], outfile: 'dist/app.js', legalComments: 'eof' });
for (const name of ['index.html', 'styles.css', 'logo.svg', 'privacidad.html']) await copyFile(name, `dist/${name}`);
await copyFile('404.html', 'dist/404.html');
await copyFile('CNAME', 'dist/CNAME');
const source = await readFile('app.js', 'utf8');
if (/sb_secret_|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\./.test(source)) throw new Error('Unexpected secret/JWT in frontend');
if (!source.includes('sb_publishable_') || !source.includes('gboifuaaswbqumxxijed')) throw new Error('Unexpected Supabase project/key');
console.log('Build complete: only public assets in dist/.');

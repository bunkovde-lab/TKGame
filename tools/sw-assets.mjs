// Пишет в site/sw.js список файлов для офлайн-кэша и версию кэша.
// Запуск: node tools/sw-assets.mjs [версия]
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const root = new URL('../site/', import.meta.url).pathname;
const skip = /^(legacy\/|test\/|sw\.js$)|(^|\/)version\.txt$|\.md$/;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else files.push(relative(root, full).split('\\').join('/'));
  }
})(root);
const list = files.filter(f => !skip.test(f)).sort()
  .map(f => f.endsWith('index.html') ? f.slice(0, -'index.html'.length) || './' : f)
  .map(f => f === './' ? './' : './' + f);
const version = process.argv[2] || 'dev';
const sw = join(root, 'sw.js');
let src = readFileSync(sw, 'utf8');
src = src.replace(/const ASSETS = \[[^\]]*\];/s, 'const ASSETS = [\n' + list.map(f => '  ' + JSON.stringify(f)).join(',\n') + '\n];');
src = src.replace(/const CACHE = '[^']*';/, `const CACHE = 'mir-raskola-${version}';`);
writeFileSync(sw, src);
console.log(`sw.js: ${list.length} файлов, кэш mir-raskola-${version}`);

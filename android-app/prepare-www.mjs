// Copia la web (carpeta superior) a www/, que es lo que se empaqueta en la app.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, '..');
const www = join(here, 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www);
for (const item of ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets']) {
  cpSync(join(site, item), join(www, item), { recursive: true });
}
console.log('Web copiada en', www);

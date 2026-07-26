// Copies ONLY the runtime files into www/ — the Capacitor webDir.
// webDir must never be "." or cap sync recursively copies the whole project
// (node_modules + android) into the native app.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const www = join(root, 'www');
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const f of ['index.html', 'styles.css', 'manifest.webmanifest']) cpSync(join(root, f), join(www, f));
cpSync(join(root, 'js'), join(www, 'js'), { recursive: true });
cpSync(join(root, 'assets'), join(www, 'assets'), { recursive: true });
console.log('www/ ready');

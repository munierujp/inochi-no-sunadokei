import {readFile,writeFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
const files=['index.html','style.css','app.mjs','time.mjs','pwa.mjs','site.webmanifest','favicon.svg','favicon.ico','apple-touch-icon.png','assets/logo-wordmark-a.png','assets/icon-192.png','assets/icon-512.png','assets/icon-maskable-512.png'];
const template=await readFile(path.join(root,'scripts/sw-template.js'),'utf8');
const hash=createHash('sha256').update(template);
for(const file of files){await access(path.join(dist,file));hash.update(file).update(await readFile(path.join(dist,file)));}
const version=hash.digest('hex').slice(0,16);
const sw=template.replace('__VERSION__',JSON.stringify(version)).replace('__FILES__',JSON.stringify(files));
await writeFile(path.join(dist,'sw.js'),sw);
console.log(`PWA offline shell ready: ${files.length} files, version ${version}`);

import {spawnSync} from 'node:child_process';
import {readdir,writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
const result=spawnSync(process.execPath,['scripts/run-framework.mjs','build'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
const root=path.resolve('dist/client');
async function walk(dir){const out=[];for(const e of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(file));else if(/\.(js|css)$/.test(e.name))out.push('/'+path.relative(root,file).replaceAll(path.sep,'/'));}return out;}
const assets=await walk(path.join(root,'_next'));
await writeFile(path.join(root,'precache.json'),JSON.stringify(assets));
// A build fingerprint ensures a new SW installs after application changes.
const {createHash}=await import('node:crypto');const hash=createHash('sha256');for(const p of assets)hash.update(await readFile(path.join(root,p.slice(1))));
const sw=await readFile(path.join(root,'sw.js'),'utf8');await writeFile(path.join(root,'sw.js'),sw.replace('noor-shell-v1','noor-shell-'+hash.digest('hex').slice(0,12)));
console.log(`Offline shell: ${assets.length} application assets precached.`);

import {build} from 'esbuild';
import {mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
await mkdir('.sites-runtime',{recursive:true});
await build({entryPoints:['tests/core.test.ts'],bundle:true,platform:'node',format:'cjs',target:'node24',outfile:'.sites-runtime/core.test.cjs'});
const result=spawnSync(process.execPath,['--test','.sites-runtime/core.test.cjs'],{stdio:'inherit'});process.exit(result.status||0);

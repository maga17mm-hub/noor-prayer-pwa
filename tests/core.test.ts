import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {createECDH,randomBytes} from 'node:crypto';
import {calculate,nextPrayer,dayInZone,formatTime,qibla,calendar,DEFAULT_SETTINGS,DEFAULT_PLACE} from '../lib/prayers';
import {SURAH_NAMES,SURAH_MEANINGS} from '../lib/surah-names';
import {pushRoutes,safeEndpoint} from '../lib/push-server';

test('Quran contains all 114 surahs and exactly 6236 aligned Arabic/Russian verses',()=>{
 const a=JSON.parse(readFileSync('public/data/arabic.json','utf8')),r=JSON.parse(readFileSync('public/data/russian.json','utf8'));assert.equal(a.length,114);assert.equal(r.length,114);assert.equal(SURAH_NAMES.length,114);assert.equal(SURAH_MEANINGS.length,114);let count=0;const pages=new Set<number>();
 for(let s=0;s<114;s++){assert.equal(a[s].number,s+1);assert.equal(r[s].ayahs.length,a[s].ayahs.length);for(let i=0;i<a[s].ayahs.length;i++){const v=a[s].ayahs[i];assert.equal(v.number,r[s].ayahs[i].number);assert.equal(v.numberInSurah,i+1);assert.ok(v.text.length>0);assert.ok(r[s].ayahs[i].text.length>0);assert.ok(v.page>=1&&v.page<=604);pages.add(v.page);count++;}}assert.equal(count,6236);assert.equal(pages.size,604);assert.ok(a[0].ayahs.every((x:any)=>x.page===1));assert.equal(a[113].ayahs.at(-1).page,604);
});
test('Prayer times remain chronological across diverse coordinates and methods',()=>{for(const p of [DEFAULT_PLACE,{name:'New York',latitude:40.7128,longitude:-74.006,timezone:'America/New_York'},{name:'Tokyo',latitude:35.6762,longitude:139.6503,timezone:'Asia/Tokyo'},{name:'Mecca',latitude:21.4225,longitude:39.8262,timezone:'Asia/Riyadh'}])for(const day of ['2026-01-15','2026-06-15','2026-10-17']){const t=calculate(p,DEFAULT_SETTINGS,day);assert.ok(t.every(x=>Number.isFinite(x.date.getTime())));for(let i=1;i<t.length;i++)assert.ok(t[i].date>t[i-1].date);}});
test('Changing Asr madhab changes Asr without changing Fajr',()=>{const shafi=calculate(DEFAULT_PLACE,DEFAULT_SETTINGS,'2026-10-17'),hanafi=calculate(DEFAULT_PLACE,{...DEFAULT_SETTINGS,madhab:'Hanafi'},'2026-10-17');assert.equal(shafi[0].date.getTime(),hanafi[0].date.getTime());assert.ok(hanafi[3].date>shafi[3].date);});
test('A location date uses its timezone, including midnight and daylight saving',()=>{assert.equal(dayInZone(new Date('2026-01-01T22:30:00Z'),'Europe/Moscow'),'2026-01-02');assert.equal(dayInZone(new Date('2026-01-01T01:30:00Z'),'America/New_York'),'2025-12-31');assert.equal(formatTime(new Date('2026-03-08T06:30:00Z'),'America/New_York'),'01:30');assert.equal(formatTime(new Date('2026-03-08T07:30:00Z'),'America/New_York'),'03:30');});
test('Next prayer after Isha is tomorrow Fajr, not sunrise',()=>{const n=nextPrayer(DEFAULT_PLACE,DEFAULT_SETTINGS,new Date('2026-10-17T21:00:00Z'));assert.equal(n?.id,'fajr');assert.equal(dayInZone(n!.date,DEFAULT_PLACE.timezone),'2026-10-18');});
test('Qibla matches established London and New York bearings',()=>{assert.ok(Math.abs(qibla({name:'London',latitude:51.5074,longitude:-.1278,timezone:'Europe/London'})-119)<1);assert.ok(Math.abs(qibla({name:'New York',latitude:40.7128,longitude:-74.006,timezone:'America/New_York'})-58.5)<1);});
test('Calendar has 150 unique prayer events and 150 display alarms',()=>{const c=calendar(DEFAULT_PLACE,DEFAULT_SETTINGS);assert.equal((c.match(/BEGIN:VEVENT/g)||[]).length,150);assert.equal((c.match(/BEGIN:VALARM/g)||[]).length,150);assert.equal(new Set(c.split('\r\n').filter(x=>x.startsWith('UID:'))).size,150);assert.ok(!c.includes('Invalid Date'));assert.ok(c.endsWith('END:VCALENDAR'));});
test('Push endpoints reject SSRF destinations and accept supported browser services',()=>{for(const endpoint of ['http://fcm.googleapis.com/x','https://localhost/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:pass@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x'])assert.equal(safeEndpoint(endpoint),false);for(const endpoint of ['https://fcm.googleapis.com/fcm/send/test','https://web.push.apple.com/QABC','https://updates.push.services.mozilla.com/wpush/v2/test'])assert.equal(safeEndpoint(endpoint),true);});

function memoryD1(){const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync('drizzle/0000_busy_killraven.sql','utf8').replaceAll('--> statement-breakpoint',''));const prepare=(sql:string)=>{const statement=sqlite.prepare(sql);let args:any[]=[];const obj={bind(...v:any[]){args=v;return obj;},async first(){return statement.get(...args)||null;},async all(){return {results:statement.all(...args)};},async run(){const r=statement.run(...args);return {success:true,meta:{changes:Number(r.changes)}};}};return obj;};return {prepare,batch:async (items:any[])=>Promise.all(items.map(x=>x.run()))} as unknown as D1Database;}
function req(path:string,body?:unknown,user='alice',origin?:string){return new Request('https://noor.test/api/push/'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(user?{'oai-authenticated-user-id':user}:{}),...(origin?{origin}:{})},body:body===undefined?undefined:JSON.stringify(body)});}
test('Push registration enforces identity, origin, ownership, real encryption and delivery deduplication',async t=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-17T02:08:00Z')});const db=memoryD1();
 assert.equal((await pushRoutes(req('subscribe',{},''),db))?.status,401);
 assert.equal((await pushRoutes(req('subscribe',{},'alice','https://evil.test'),db))?.status,403);
 const keyResponse=await pushRoutes(req('key'),db);const {publicKey}=await keyResponse!.json() as any;assert.equal(Buffer.from(publicKey,'base64url').length,65);
 const ec=createECDH('prime256v1');ec.generateKeys();const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/noor-unit-test',keys:{p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
 const body={subscription,place:DEFAULT_PLACE,settings:DEFAULT_SETTINGS};assert.equal((await pushRoutes(req('subscribe',body),db))?.status,200);
 assert.equal((await pushRoutes(req('subscribe',body,'bob'),db))?.status,403);
 assert.equal((await pushRoutes(req('unsubscribe',{endpoint:subscription.endpoint},'bob'),db))?.status,403);
 const requests:any[]=[];t.mock.method(globalThis,'fetch',async (url:any,init:any)=>{requests.push({url,init});return new Response('',{status:201});});
 const first=await (await pushRoutes(req('dispatch',{}),db))!.json() as any;assert.equal(first.sent,1);assert.equal(requests.length,1);assert.equal(requests[0].init.headers['Content-Encoding'],'aes128gcm');assert.ok(requests[0].init.headers.Authorization||requests[0].init.headers.authorization);assert.ok(requests[0].init.body.length>100);
 const second=await (await pushRoutes(req('dispatch',{}),db))!.json() as any;assert.equal(second.sent,0);assert.equal(requests.length,1);
 const status=await (await pushRoutes(req('status'),db))!.json() as any;assert.equal(status.scheduler,true);
 assert.equal((await pushRoutes(req('unsubscribe',{endpoint:subscription.endpoint}),db))?.status,200);
});

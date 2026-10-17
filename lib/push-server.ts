import webpush from 'web-push';
import {calculate,dayInZone,shiftDay,formatTime,DEFAULT_SETTINGS,METHODS,type Place,type Settings} from './prayers';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function safeEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname.endsWith('.push.apple.com')||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.notify.windows.com'));}catch{return false;}}
async function hash(text:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
async function keys(db:D1Database){let row=await db.prepare("SELECT value FROM noor_config WHERE key='vapid'").first<{value:string}>();if(!row){const generated=webpush.generateVAPIDKeys();await db.prepare("INSERT OR IGNORE INTO noor_config(key,value) VALUES('vapid',?)").bind(JSON.stringify(generated)).run();row=await db.prepare("SELECT value FROM noor_config WHERE key='vapid'").first<{value:string}>();}if(!row)throw Error('Key initialization failed');return JSON.parse(row.value) as {publicKey:string;privateKey:string};}
function validPlace(p:any):p is Place{try{return typeof p.name==='string'&&p.name.length<=200&&typeof p.latitude==='number'&&Math.abs(p.latitude)<=90&&typeof p.longitude==='number'&&Math.abs(p.longitude)<=180&&typeof p.timezone==='string'&&!!new Intl.DateTimeFormat('en',{timeZone:p.timezone});}catch{return false;}}
function cleanSettings(s:any):Settings{if(!s||!METHODS.some(x=>x.id===s.method)||!['Shafi','Hanafi'].includes(s.madhab)||!Number.isInteger(s.adjustment)||Math.abs(s.adjustment)>30||![0,5,10,15].includes(s.reminder)||!Array.isArray(s.enabledPrayers)||s.enabledPrayers.some((x:string)=>!DEFAULT_SETTINGS.enabledPrayers.includes(x)))throw Error('Invalid settings');return {...DEFAULT_SETTINGS,method:s.method,madhab:s.madhab,adjustment:s.adjustment,reminder:s.reminder,enabledPrayers:s.enabledPrayers};}
function owner(request:Request){const u=new URL(request.url);return request.headers.get('oai-authenticated-user-id')||(['127.0.0.1','localhost'].includes(u.hostname)?'local-preview':null);}
async function send(subscription:any,payload:unknown,k:{publicKey:string;privateKey:string}){if(!safeEndpoint(subscription.endpoint))return 400;const details=webpush.generateRequestDetails(subscription,JSON.stringify(payload),{vapidDetails:{subject:'https://noor-prayer-companion.genialdegu129.chatgpt.site',...k},TTL:600,urgency:'high',contentEncoding:'aes128gcm'});const r=await fetch(details.endpoint,{method:'POST',headers:details.headers as HeadersInit,body:details.body as any,signal:AbortSignal.timeout(15000),redirect:'error'});return r.status;}
export async function pushRoutes(request:Request,db?:D1Database):Promise<Response|null>{
const url=new URL(request.url),path=url.pathname;if(!path.startsWith('/api/push/'))return null;
if(!db)return json({configured:false,scheduler:false},path==='/api/push/status'?200:503);
try{
 if(path==='/api/push/status'&&request.method==='GET'){const beat=await db.prepare("SELECT value FROM noor_config WHERE key='heartbeat'").first<{value:string}>();return json({configured:true,scheduler:!!beat&&Date.now()-Number(beat.value)<15*60000});}
 if(path==='/api/push/key'&&request.method==='GET'){const k=await keys(db);return json({publicKey:k.publicKey});}
 // This endpoint is protected by the owner-private Sites service-access boundary.
 // It must remain private; public deployments must add independent cron auth.
 if(path==='/api/push/dispatch'&&request.method==='POST')return await dispatch(db);
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 const user=owner(request);if(!user)return json({error:'Authentication required'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Cross-origin write rejected'},403);
 if(Number(request.headers.get('content-length')||0)>16384)return json({error:'Payload too large'},413);
 const raw=await request.text();if(raw.length>16384)return json({error:'Payload too large'},413);const body=JSON.parse(raw);
 if(path==='/api/push/subscribe'){
  const s=body.subscription;if(!s||typeof s.endpoint!=='string'||!safeEndpoint(s.endpoint)||typeof s.keys?.p256dh!=='string'||typeof s.keys?.auth!=='string'||!validPlace(body.place))return json({error:'Invalid subscription'},400);
  const p256=Buffer.from(s.keys.p256dh,'base64url'),auth=Buffer.from(s.keys.auth,'base64url');if(p256.length!==65||auth.length!==16)return json({error:'Invalid subscription keys'},400);
  const settings=cleanSettings(body.settings),id=await hash(s.endpoint),existing=await db.prepare('SELECT owner FROM noor_subscriptions WHERE id=?').bind(id).first<{owner:string}>();if(existing&&existing.owner!==user)return json({error:'Forbidden'},403);
  await db.prepare('INSERT INTO noor_subscriptions(id,owner,subscription,place,settings,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription,place=excluded.place,settings=excluded.settings,updated=excluded.updated').bind(id,user,JSON.stringify(s),JSON.stringify(body.place),JSON.stringify(settings),Date.now()).run();return json({subscribed:true});
 }
 if(path==='/api/push/unsubscribe'||path==='/api/push/test'){
  if(typeof body.endpoint!=='string')return json({error:'Invalid endpoint'},400);const id=await hash(body.endpoint);const row=await db.prepare('SELECT subscription,owner FROM noor_subscriptions WHERE id=?').bind(id).first<{subscription:string;owner:string}>();if(!row)return json({error:'Subscription not found'},404);if(row.owner!==user)return json({error:'Forbidden'},403);
  if(path.endsWith('unsubscribe')){await db.prepare('DELETE FROM noor_subscriptions WHERE id=? AND owner=?').bind(id,user).run();return json({unsubscribed:true});}
  const status=await send(JSON.parse(row.subscription),{title:'Нур · Уведомления работают',body:'Это настоящее push-уведомление с сервера. Время для главного — всегда рядом.',tag:'noor-test',url:'/#today'},await keys(db));if(status===404||status===410)await db.prepare('DELETE FROM noor_subscriptions WHERE id=?').bind(id).run();return json({sent:status>=200&&status<300,status},status>=200&&status<300?200:502);
 }
 return json({error:'Not found'},404);
}catch(error){console.error('Noor push operation failed',error instanceof Error?error.message:'unknown');return json({error:'Unable to complete push operation'},500);}}

export async function dispatch(db:D1Database){
const now=new Date(),rows=await db.prepare('SELECT id,subscription,place,settings FROM noor_subscriptions WHERE updated>? LIMIT 500').bind(Date.now()-90*86400000).all<{id:string;subscription:string;place:string;settings:string}>();let sent=0,failed=0,expired=0;
const k=rows.results.length?await keys(db):null;
for(const row of rows.results){try{const place=JSON.parse(row.place) as Place,settings=JSON.parse(row.settings) as Settings,today=dayInZone(now,place.timezone);const times=[...calculate(place,settings,shiftDay(today,-1)),...calculate(place,settings,today),...calculate(place,settings,shiftDay(today,1))];for(const p of times){if(!settings.enabledPrayers.includes(p.id)||!Number.isFinite(p.date?.getTime()))continue;const due=p.date.getTime()-settings.reminder*60000;if(due>now.getTime()||due<now.getTime()-10*60000)continue;const deliveryId=`${row.id}:${p.id}:${p.date.toISOString()}:${settings.reminder}`;const claim=await db.prepare('INSERT OR IGNORE INTO noor_deliveries(id,sent) VALUES(?,?)').bind(deliveryId,now.getTime()).run();if(!claim.meta.changes)continue;
 try{const status=await send(JSON.parse(row.subscription),{title:`Нур · ${p.name}`,body:settings.reminder?`До намаза ${settings.reminder} мин. ${place.name} · ${formatTime(p.date,place.timezone)}`:`Наступило время намаза. ${place.name} · ${formatTime(p.date,place.timezone)}`,tag:deliveryId,url:'/#today'},k!);if(status>=200&&status<300)sent++;else if(status===404||status===410){await db.prepare('DELETE FROM noor_subscriptions WHERE id=?').bind(row.id).run();expired++;}else{failed++;await db.prepare('DELETE FROM noor_deliveries WHERE id=?').bind(deliveryId).run();}}catch{failed++;await db.prepare('DELETE FROM noor_deliveries WHERE id=?').bind(deliveryId).run();}
}}catch{failed++;}}
await db.batch([db.prepare("INSERT INTO noor_config(key,value) VALUES('heartbeat',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(String(Date.now())),db.prepare('DELETE FROM noor_deliveries WHERE sent<?').bind(Date.now()-7*86400000),db.prepare('DELETE FROM noor_subscriptions WHERE updated<?').bind(Date.now()-90*86400000)]);
return json({ok:true,checked:rows.results.length,sent,failed,expired,timestamp:new Date().toISOString()});
}

import {createRedisTransport} from './rest.mjs';
import {DEFAULT_LIMITS} from './store.mjs';
// Build-only, one read, no state reads, writes, resets, retries or public endpoint.
export async function inspectBudget(env=process.env,{now=Date.now(),transport}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse'||env.CAT_CAFE_REDIS_DIAGNOSTIC!=='budget-readonly'||env.CAT_CAFE_REALTIME_ENABLED==='1')throw Error('Inspection scope denied');
 const client=transport??createRedisTransport({url:env.CAT_CAFE_REDIS_REST_URL,token:env.CAT_CAFE_REDIS_REST_TOKEN,maxBytes:131072});
 const raw=await client.command(['GET','cat-cafe:resource-budget:v1']);
 if(typeof raw!=='string')throw Error('Budget missing');
 const b=JSON.parse(raw);if(b.version!==1)throw Error('Budget schema mismatch');
 const date=new Date(now),dayKey=String(Math.floor(now/86400000)),monthKey=`${date.getUTCFullYear()}-${date.getUTCMonth()+1}`;
 const pick=(source,keys)=>Object.fromEntries(keys.map(key=>{const value=source?.[key]??0;if(!Number.isSafeInteger(value)||value<0)throw Error('Invalid budget counter');return[key,value];}));
 return {kind:'budget-readonly',observedAt:new Date(now).toISOString(),present:{day:Object.hasOwn(b.days??{},dayKey),month:Object.hasOwn(b.months??{},monthKey)},current:{day:pick(b.days?.[dayKey],['ops','bytes','activeMs']),month:pick(b.months?.[monthKey],['ops','bytes'])},limits:DEFAULT_LIMITS,resetAt:{day:(Number(dayKey)+1)*86400000,month:Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)},inspectionCommands:1,caveat:'App accounting before this GET; not provider billing or guaranteed remaining playtime'};
}

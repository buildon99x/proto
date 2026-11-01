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

export async function inspectStateHealth(env=process.env,{now=Date.now(),transport}={}){
 if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='codex/cat-cafe-metaverse'||env.CAT_CAFE_REDIS_DIAGNOSTIC!=='state-health-readonly'||env.CAT_CAFE_REALTIME_ENABLED==='1')throw Error('Inspection scope denied');
 const client=transport??createRedisTransport({url:env.CAT_CAFE_REDIS_REST_URL,token:env.CAT_CAFE_REDIS_REST_TOKEN,maxBytes:131072});
 const raw=await client.command(['GET','cat-cafe:preview:v1']);if(typeof raw!=='string')throw Error('State missing');
 const state=JSON.parse(raw);if(![1,2].includes(state.version))throw Error('State schema mismatch');
 const presence=Object.values(state.presence??{}).filter(Number.isFinite);
 const commands={};for(const c of Object.values(state.queue??{})){const type=['join','move','action','leave','disconnect','presence'].includes(c.type)?c.type:'unknown';commands[type]=(commands[type]??0)+1;}
 let checkpoint={status:'absent'};
 if(state.checkpoint){
  try{
   const value=JSON.parse(state.checkpoint);const {importWorld}=await import('../state-codec.mjs');
   const world=importWorld(value,{clock:()=>now});
   checkpoint={status:'valid',ageMs:now-value.savedAt,storedPlayers:value.players.length,storedMembers:value.members.length,recoveredPlayers:world.tokens.size,recoveredMembers:world.members.size,reservations:[...world.tokens.values()].filter(p=>!p.connection).length};
  }catch(error){checkpoint={status:'invalid',code:error?.code==='INVALID_CHECKPOINT'?'INVALID_CHECKPOINT':'DECODE_ERROR'};}
 }
 return{kind:'state-health-readonly',observedAt:new Date(now).toISOString(),revision:Number.isSafeInteger(state.revision)?state.revision:null,active:state.active===true,lease:{held:Boolean(state.owner),remainingMs:Number.isFinite(state.deadline)?state.deadline-now:null},presence:{count:presence.length,oldestAgeMs:presence.length?now-Math.min(...presence):null},commands,checkpoint,inspectionCommands:1};
}

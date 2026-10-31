export function serverURL(value){try{const u=new URL(value);if(!['ws:','wss:'].includes(u.protocol)||u.username||u.password)return null;u.pathname=u.pathname==='/'?'/ws':u.pathname;u.hash='';return u.href;}catch{return null;}}
export function movement(keys,touch,yaw){let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touch.x;let z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+touch.z;const n=Math.max(1,Math.hypot(x,z));x/=n;z/=n;return{x:x*Math.cos(yaw)+z*Math.sin(yaw),z:z*Math.cos(yaw)-x*Math.sin(yaw)};}
export function acceptState(s,seq,room){return s&&s.room===room&&Number.isInteger(s.seq)&&s.seq>seq&&Array.isArray(s.players)&&Array.isArray(s.cats);}
export function canInteract(player,cat){return !!player&&!!cat&&Math.hypot(player.x-cat.x,player.z-cat.z)<=2.8;}
export function decodeState(s){if(s?.schema!=='packed-v1')return s;return{...s,players:(s.players||[]).map(([id,name,x,z,yaw,color])=>({id,name,x,z,yaw,color})),cats:(s.cats||[]).map(([id,name,x,z,yaw,skin,mode,owner,until])=>({id,name,x,z,yaw,skin,mode,owner,until})),toys:(s.toys||[]).map(([id,x,z,owner])=>({id,x,z,owner}))};}
export function nearestCat(player,cats){if(!player||!cats?.length)return null;return cats.reduce((best,c)=>!best||Math.hypot(c.x-player.x,c.z-player.z)<Math.hypot(best.x-player.x,best.z-player.z)?c:best,null);}
export function createConnectionGate(){let generation=0;return{advance:()=>++generation,current:value=>value===generation};}
// Every authoritative visitor is represented. Only the local avatar has separate meshes.
export function crowdPlan(players,localId){return{local:players.find(p=>p.id===localId)||null,remote:players.filter(p=>p.id!==localId),remoteBatches:2};}

import {World} from '../world.mjs';
import {exportWorld,importWorld} from '../state-codec.mjs';
export function createCoordinator({store,ownerId,limits={}}){
 let pending=null,lastFence=null;
 async function run(commands,retry=true){
  const view=await store.open({ownerId,commands});
  if(!view.availability.ok||!view.leader)return view;
  lastFence=view.fence;
  const now=view.serverTime;
  const world=view.checkpoint?importWorld(view.checkpoint,{clock:()=>now}):new World({clock:()=>now});
  const presence={...view.presence},retired={...view.retired},results={};
  for(const [connectionId,lastSeen] of Object.entries(presence)){
   const disconnectedAt=lastSeen+(limits.presenceMs??10000);
   if(disconnectedAt<=now){
    const player=world.members.get(connectionId);
    world.disconnect(connectionId);
    // Recovery may run long after the owner vanished. Never grant a fresh
    // reservation window merely because no coordinator was running to expire it.
    if(player)player.expires=disconnectedAt+world.reservationMs;
    delete presence[connectionId];retired[connectionId]=now+60000;
   }
  }
  world.clean(); // Capacity includes only reservations still valid at Redis time.
  for(const command of view.commands){
   const {id,connectionId,type}=command;
   const reply=payload=>{results[id]={connectionId,...payload};};
   if(now-command.issuedAt>30000){reply({type:'error',reason:'COMMAND_EXPIRED'});continue;}
   if(retired[connectionId]>now){reply({type:'error',reason:'SESSION_EXPIRED'});continue;}
   if(type==='join'){
    const born=Number(connectionId.split(':')[0]);
    if(!world.members.has(connectionId)&&(!Number.isSafeInteger(born)||born>now+1000||now-born>30000)){reply({type:'error',reason:'SESSION_EXPIRED'});continue;}
    const existing=world.members.get(connectionId)||world.tokens.get(command.token);
    if(!existing&&world.tokens.size>=(limits.capacity??6)){reply({type:'error',reason:'BETA_FULL'});continue;}
    const joined=world.join(connectionId,command.room,command.token);
    if(joined.ok){presence[connectionId]=now;reply({type:'welcome',...joined});}
    else reply({type:'error',reason:joined.reason});
   }else if(type==='presence'){
    if(world.members.has(connectionId))presence[connectionId]=now;else reply({type:'error',reason:'SESSION_EXPIRED'});
   }else if(type==='disconnect'||type==='leave'){
    world.disconnect(connectionId,type==='leave');delete presence[connectionId];retired[connectionId]=now+60000;
   }else if(type==='move'){
    const result=world.move(connectionId,{seq:command.inputSeq,x:command.x,z:command.z});if(!result.ok)reply({type:'error',reason:result.reason});
   }else if(type==='action')reply({type:'actionResult',requestId:command.requestId,...world.action(connectionId,command)});
   else reply({type:'error',reason:'UNKNOWN_MESSAGE'});
  }
  const elapsed=Math.max(0,now-(view.lastTick??now));
  const steps=world.members.size===0?0:(!view.lastTick||elapsed>250?1:Math.min(4,Math.floor(elapsed/50)));
  for(let i=0;i<steps;i++)world.tick();
  // Preserve sub-50ms remainder only during normal cadence, never outage debt.
  const nextTick=steps?now-(elapsed<=250?elapsed%50:0):(view.lastTick??now);
  const snapshots=Object.fromEntries([...world.rooms].filter(([,value])=>value.players.size>0).map(([room])=>[room,world.snapshot(room)]));
  const committed=await store.commit({ownerId,fence:view.fence,revision:view.revision,checkpoint:exportWorld(world),presence,retired,results,snapshots,consumed:view.commands.map(c=>c.id),lastTick:nextTick,active:world.members.size>0});
  if(retry&&committed.availability?.reason==='STALE_OWNER')return run([],false);
  return committed;
 }
 return {
  pump(commands=[]){
   if(pending)return Promise.reject(Object.assign(Error('Concurrent pump rejected'),{code:'PUMP_BUSY'}));
   pending=run(commands).finally(()=>{pending=null;});return pending;
  },
  async stop(){if(pending)await pending;pending=store.release({ownerId,fence:lastFence}).finally(()=>{pending=null;});await pending;}
 };
}

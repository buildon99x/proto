// Frozen deployed v1 authority gate (0bcac65); build migration verification only.
// Server-only Lua source imported as text; never emit a public static asset.
export const LEGACY_V1_SCRIPT=String.raw`-- Two durable keys: shared budgets and this compatible authority epoch.
-- No network output is authoritative until this script stores the commit.
local operation=ARGV[1]
local request=cjson.decode(ARGV[2])
local stamp=redis.call('TIME')
local now=tonumber(stamp[1])*1000+math.floor(tonumber(stamp[2])/1000)
local rawBudget=redis.call('GET',KEYS[1])
local rawState=redis.call('GET',KEYS[2])
local function unavailable(reason) return cjson.encode({availability={ok=false,reason=reason},serverTime=now}) end
if operation=='bootstrap' then
 if rawBudget or rawState then return unavailable('BOOTSTRAP_CONFLICT') end
 local b={version=1,createdAt=now,bootstrapOps=8,days={},months={}}
 local s={version=1,revision=0,fence=0,owner='',deadline=0,queue={},dedup={},results={},presence={},retired={},lastTick=0,active=false}
 redis.call('SET',KEYS[1],cjson.encode(b),'NX')
 redis.call('SET',KEYS[2],cjson.encode(s),'NX')
 return cjson.encode({availability={ok=true},serverTime=now})
end
if not rawBudget or not rawState then return unavailable('STORE_NOT_INITIALIZED') end
local b=cjson.decode(rawBudget)
local s=cjson.decode(rawState)
if b.version~=1 or s.version~=1 then return unavailable('SCHEMA_MISMATCH') end
-- Calendar conversion from Unix days (Gregorian civil date algorithm).
local day=math.floor(now/86400000)
local z=day+719468
local era=math.floor(z/146097)
local doe=z-era*146097
local yoe=math.floor((doe-math.floor(doe/1460)+math.floor(doe/36524)-math.floor(doe/146096))/365)
local year=yoe+era*400
local doy=doe-(365*yoe+math.floor(yoe/4)-math.floor(yoe/100))
local mp=math.floor((5*doy+2)/153)
local month=mp+(mp<10 and 3 or -9)
if month<=2 then year=year+1 end
local monthKey=tostring(year)..'-'..tostring(month)
local dayKey=tostring(day)
if b.dayThrough and b.dayThrough>=day and not b.days[dayKey] then return unavailable('BUDGET_STATE_MISSING') end
if b.monthThrough and b.monthThrough>=year*12+month and not b.months[monthKey] then return unavailable('BUDGET_STATE_MISSING') end
local d=b.days[dayKey] or {ops=0,bytes=0,activeMs=0}
local m=b.months[monthKey] or {ops=0,bytes=0}
local limits=cjson.decode(ARGV[3])
local operations=8+(b.bootstrapOps or 0)
local elapsed=0
b.accounted=b.accounted or {}
local accounted=b.accounted[KEYS[2]] or s.accountedAt
if s.active and accounted then elapsed=math.max(0,math.min(now,s.deadline)-accounted) end
local function finish(value,saveState)
 local encoded=cjson.encode(value)
 if string.len(encoded)>131072 then return unavailable('STATE_TOO_LARGE') end
 local bytes=tonumber(ARGV[4])+string.len(encoded)
 if operation=='commit' then bytes=bytes+request.egressBytes end
 local daily=d.ops+operations>limits.dayOps or d.bytes+bytes>limits.dayBytes or d.activeMs+elapsed>limits.activeMs
 local monthly=m.ops+operations>limits.monthOps or m.bytes+bytes>limits.monthBytes
 if daily or monthly then
  -- Month end calculated by advancing at most31 UTC days using the same civil algorithm.
  local reset=(day+1)*86400000
  if monthly then
   local leap=(year%4==0 and (year%100~=0 or year%400==0))
   local days={31,leap and 29 or 28,31,30,31,30,31,31,30,31,30,31}
   local dom=doy-math.floor((153*mp+2)/5)+1
   reset=(day+days[month]-dom+1)*86400000
  end
  return cjson.encode({availability={ok=false,reason='BUDGET_EXHAUSTED',scope=monthly and 'month' or 'day',resetAt=reset},serverTime=now})
 end
 d.ops=d.ops+operations;m.ops=m.ops+operations;d.bytes=d.bytes+bytes;m.bytes=m.bytes+bytes;d.activeMs=d.activeMs+elapsed
 b.days[dayKey]=d;b.months[monthKey]=m;b.bootstrapOps=0;b.dayThrough=day;b.monthThrough=year*12+month
 s.accountedAt=now;b.accounted[KEYS[2]]=now
 redis.call('SET',KEYS[1],cjson.encode(b))
 if saveState then redis.call('SET',KEYS[2],cjson.encode(s)) end
 return encoded
end
local function reject(reason) return finish({availability={ok=false,reason=reason},serverTime=now},false) end
for id,expiry in pairs(s.dedup) do if expiry<=now then s.dedup[id]=nil;s.results[id]=nil end end
for id,expiry in pairs(s.retired) do if expiry<=now then s.retired[id]=nil end end
local function count(t) local n=0;for _ in pairs(t) do n=n+1 end;return n end
local function output(leader)
 local value={availability={ok=true},serverTime=now,budget={dayOps=d.ops,monthOps=m.ops,dayBytes=d.bytes,monthBytes=m.bytes,activeMs=d.activeMs},leader=leader,revision=s.revision,fence=s.fence,checkpoint=leader and s.checkpoint or nil,presence=s.presence,retired=s.retired,commands=leader and s.queue or {},lastTick=s.lastTick}
 -- The leader consumes recovery data then publishes commit output, not this view.
 if not leader then value.results=s.results;value.snapshots=s.snapshots or {} end
 return finish(value,true)
end
if operation=='check' then
 return finish({availability={ok=true},serverTime=now,budget={dayOps=d.ops,monthOps=m.ops,dayBytes=d.bytes,monthBytes=m.bytes,activeMs=d.activeMs}},false)
elseif operation=='open' then
 local commands=request.commands or {}
 if #commands>128 then return reject('QUEUE_FULL') end
 for _,command in ipairs(commands) do
  if command.issuedAt>now+1000 or command.issuedAt<now-30000 then return reject('COMMAND_EXPIRED') end
    local ephemeral=command.type=='move' or command.type=='presence'
  if ephemeral or not s.dedup[command.id] then
   if #s.queue>=1000 or (not ephemeral and count(s.dedup)>=512) then return reject('QUEUE_FULL') end
   if not ephemeral then s.dedup[command.id]=now+60000 end
   local replaced=false
   if ephemeral then
    for i=#s.queue,1,-1 do
     if s.queue[i].connectionId==command.connectionId then
      if s.queue[i].type==command.type then s.queue[i]=command;replaced=true end
      break
     end
    end
   end
   if not replaced then table.insert(s.queue,command) end
  end
 end
 if s.owner==request.ownerId or s.deadline<=now then
  if s.owner~=request.ownerId or s.deadline<=now then s.fence=s.fence+1 end
  s.owner=request.ownerId;s.deadline=now+5000
 end
 return output(s.owner==request.ownerId)
elseif operation=='commit' then
 if s.owner~=request.ownerId or s.fence~=request.fence or s.revision~=request.revision or s.deadline<=now then return reject('STALE_OWNER') end
 local consumed={};for _,id in ipairs(request.consumed) do consumed[id]=true end
 local queue={};for _,command in ipairs(s.queue) do if not consumed[command.id] then table.insert(queue,command) end end
 s.queue=queue;s.checkpoint=request.checkpoint;s.presence=request.presence;s.retired=request.retired or {};s.snapshots=request.snapshots;s.lastTick=request.lastTick;s.active=request.active;s.revision=s.revision+1
 for id,result in pairs(request.results) do
  if not s.dedup[id] then
   if count(s.dedup)>=512 then return reject('QUEUE_FULL') end
   s.dedup[id]=now+60000
  end
  s.results[id]=result
 end
 if not s.active and #s.queue==0 then s.owner='';s.deadline=now end
 return output(false)
elseif operation=='release' then
 if s.owner==request.ownerId and s.fence==request.fence then s.owner='';s.deadline=now end
 return output(false)
end
return unavailable('INVALID_OPERATION')
`;

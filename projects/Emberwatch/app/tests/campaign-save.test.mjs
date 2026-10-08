import test from 'node:test';
import assert from 'node:assert/strict';
import {CAMPAIGN_SAVE,CAMPAIGN_CLASSES,CAMPAIGN_SLOTS,createCampaignSave,createCampaignStore,createCampaignSession,validateCampaignSave} from '../src/campaign/save.js';
function memory(initial={}){const data=new Map(Object.entries(initial));return {data,fail:null,getItem:k=>data.get(k)??null,setItem(k,v){if(this.fail===k)throw new Error('quota');data.set(k,v);}};}
test('only the three new class IDs and seven equipment slots are accepted',()=>{
 for(const id of CAMPAIGN_CLASSES){const s=createCampaignSave(id);assert(validateCampaignSave(s).ok);assert.deepEqual(Object.keys(s.character.equipment),CAMPAIGN_SLOTS);}
 assert.throws(()=>createCampaignSave('paladin'));assert.throws(()=>createCampaignSave('gunner'));assert(!validateCampaignSave({version:1,classId:'warrior',run:{}}).ok);
});
test('legacy raw data is backed up verbatim without conversion or deletion, including malformed legacy JSON',()=>{
 for(const raw of ['{"version":1,"classId":"warrior","gold":999}', 'not-json']){const storage=memory({[CAMPAIGN_SAVE.legacy]:raw}),store=createCampaignStore(storage);assert(store.save(createCampaignSave()).ok);assert.equal(storage.getItem(CAMPAIGN_SAVE.legacy),raw);assert.equal(JSON.parse(storage.getItem(CAMPAIGN_SAVE.legacyBackup)).raw,raw);assert.equal(store.load().save.gold,0);}
});
test('campaign changes persist together and survive a fresh store instance',()=>{
 const storage=memory(),store=createCampaignStore(storage),s=createCampaignSave();assert(store.save(s).ok);s.gold=25;s.world.questFlags.lost_tool='completed';s.world.openedShortcuts.push('forest_gate');s.character.skills.shield_charge=2;s.character.equipment.mainHand='mace-1';s.inventory.equipmentInstances.push({id:'mace-1'});assert(store.save(s,{expectedRevision:1}).ok);const loaded=createCampaignStore(storage).load();assert.deepEqual(loaded.save,s);assert.equal(loaded.revision,2);
});
test('interrupted slot write keeps the previous committed snapshot',()=>{
 const storage=memory(),store=createCampaignStore(storage),s=createCampaignSave();store.save(s);storage.fail=CAMPAIGN_SAVE.slots[1];s.gold=50;assert.equal(store.save(s).code,'WRITE_FAILED');assert.equal(store.load().save.gold,0);assert.equal(store.load().revision,1);
});
test('interrupted commit does not promote an uncommitted staging slot when the previous head is valid',()=>{
 const storage=memory(),store=createCampaignStore(storage),s=createCampaignSave();store.save(s);storage.fail=CAMPAIGN_SAVE.head;s.gold=50;assert.equal(store.save(s).code,'WRITE_FAILED');assert.equal(createCampaignStore(storage).load().save.gold,0);
});
test('a damaged active snapshot recovers the intact previous slot without touching legacy',()=>{
 const storage=memory({[CAMPAIGN_SAVE.legacy]:'legacy'}),store=createCampaignStore(storage),s=createCampaignSave();store.save(s);s.gold=50;store.save(s);storage.data.set(CAMPAIGN_SAVE.slots[1],'broken');const loaded=store.load();assert(loaded.ok&&loaded.recovered);assert.equal(loaded.save.gold,0);assert.equal(storage.getItem(CAMPAIGN_SAVE.legacy),'legacy');
});
test('total corruption is reported and cannot silently become a fresh campaign',()=>{
 const storage=memory({[CAMPAIGN_SAVE.slots[0]]:'broken'}),store=createCampaignStore(storage);assert.equal(store.load().code,'CORRUPT');assert.equal(store.save(createCampaignSave()).code,'CORRUPT');assert.equal(storage.getItem(CAMPAIGN_SAVE.slots[0]),'broken');
});
test('a failed required legacy backup blocks the campaign write and preserves the original',()=>{
 const storage=memory({[CAMPAIGN_SAVE.legacy]:'legacy'});storage.fail=CAMPAIGN_SAVE.legacyBackup;const store=createCampaignStore(storage);assert.equal(store.save(createCampaignSave()).code,'LEGACY_BACKUP_FAILED');assert.equal(storage.getItem(CAMPAIGN_SAVE.legacy),'legacy');assert.equal(storage.getItem(CAMPAIGN_SAVE.head),null);
});
test('stale writers cannot overwrite a newer revision',()=>{
 const storage=memory(),a=createCampaignStore(storage),b=createCampaignStore(storage),s=createCampaignSave();a.save(s);s.gold=30;b.save(s,{expectedRevision:1});s.gold=1;assert.equal(a.save(s,{expectedRevision:1}).code,'CONFLICT');assert.equal(a.load().save.gold,30);
});
test('invalid snapshots and oversized records are rejected before any write',()=>{
 const storage=memory(),store=createCampaignStore(storage),s=createCampaignSave();s.character.skillPoints=-1;assert.equal(store.save(s).code,'INVALID');s.character.skillPoints=0;s.memo='x'.repeat(CAMPAIGN_SAVE.maxBytes);assert.equal(store.save(s).code,'TOO_LARGE');assert.equal(storage.data.size,0);
});
test('export is a non-destructive complete campaign copy',()=>{const storage=memory(),store=createCampaignStore(storage),s=createCampaignSave();store.save(s);const count=storage.data.size;assert.deepEqual(JSON.parse(store.exportSave().json),s);assert.equal(storage.data.size,count);});
test('a failed first head commit never becomes a successful load',()=>{const storage=memory();storage.fail=CAMPAIGN_SAVE.head;const store=createCampaignStore(storage);assert.equal(store.save(createCampaignSave()).code,'WRITE_FAILED');assert.equal(store.load().code,'CORRUPT');});
test('a corrupt head recovers the last proven commit, not an uncommitted staging slot',()=>{const storage=memory(),store=createCampaignStore(storage),s=createCampaignSave();store.save(s);s.gold=7;store.save(s);s.gold=99;storage.fail=CAMPAIGN_SAVE.head;store.save(s);storage.data.set(CAMPAIGN_SAVE.head,'broken');assert.equal(store.load().save.gold,7);});
test('nonfinite, unsupported, deeply nested and cyclic data cannot be silently changed by JSON',()=>{for(const value of [NaN,Infinity,undefined,()=>0,new Date(),1n,Array(2)]){const storage=memory(),s=createCampaignSave();s.inventory.materials.bad=value;assert.equal(createCampaignStore(storage).save(s).code,'INVALID');assert.equal(storage.data.size,0);}const s=createCampaignSave();s.self=s;assert(!validateCampaignSave(s).ok);const deep=createCampaignSave();let node=deep;for(let i=0;i<82;i++){node.next={};node=node.next;}assert(!validateCampaignSave(deep).ok);});
test('browser commits serialize across tabs and stale writers lose without overwriting',async()=>{const storage=memory();let queue=Promise.resolve();const locks={request(name,options,callback){assert.equal(name,'emberwatch-campaign.v2.writer');assert.equal(options.mode,'exclusive');const result=queue.then(callback);queue=result.catch(()=>{});return result;}};const a=createCampaignSession(storage,locks),b=createCampaignSession(storage,locks);await a.save(createCampaignSave(),{expectedRevision:0});const s=createCampaignSave();s.gold=4;const [first,second]=await Promise.all([a.save(s,{expectedRevision:1}),b.save(createCampaignSave(),{expectedRevision:1})]);assert(first.ok);assert.equal(second.code,'CONFLICT');assert.equal(a.load().save.gold,4);assert.equal((await createCampaignSession(storage,null).save(s)).code,'LOCKS_UNAVAILABLE');});

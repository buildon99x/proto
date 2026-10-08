/* Explicit app-owned test isolation. No profile copies or gameplay overrides. */
(function(root){
'use strict';
const TEST_PREFIX='deadfreight-test:local-qa:';
const OWNED_KEYS=Object.freeze(['deadfreight-best','deadfreight-backup-v2','deadfreight-backup-v3','deadfreight-settings']);
function parse(search=''){
 const query=new URLSearchParams(search),names=[...query.keys()].filter(k=>k.toLowerCase()==='testprofile');
 if(names.length===0)return Object.freeze({ok:true,id:'default',isTest:false});
 const values=query.getAll('testProfile');
 if(names.length!==1||names[0]!=='testProfile'||values.length!==1||values[0]!=='local-qa')return Object.freeze({ok:false,reason:'invalid-test-profile'});
 return Object.freeze({ok:true,id:'local-qa',isTest:true});
}
function keyFor(profile,key){
 if(!profile?.ok||!['default','local-qa'].includes(profile.id)||profile.isTest!==(profile.id==='local-qa'))throw new Error('Invalid storage profile');
 if(!OWNED_KEYS.includes(key))throw new Error('Unowned storage key');
 return (profile.isTest?TEST_PREFIX:'')+key;
}
function bind(storage,profile){
 keyFor(profile,OWNED_KEYS[0]);
 return Object.freeze({getItem:key=>storage.getItem(keyFor(profile,key)),setItem:(key,value)=>storage.setItem(keyFor(profile,key),value),removeItem:key=>storage.removeItem(keyFor(profile,key))});
}
const api=Object.freeze({TEST_PREFIX,OWNED_KEYS,parse,keyFor,bind});
root.DFStorageProfile=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

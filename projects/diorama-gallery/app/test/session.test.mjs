import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../src/session.js';
test('switching from thumbnail to world disposes previous runtime before mounting',()=>{
 const events=[]; const session=createSession((name)=>{events.push(`mount ${name}`);return {dispose(){events.push(`dispose ${name}`);}};});
 session.open('thumbnail'); session.open('harbor'); session.close(); session.close();
 assert.deepEqual(events,['mount thumbnail','dispose thumbnail','mount harbor','dispose harbor']);
});
test('unavailable renderer remains closable and can be retried',()=>{
 const session=createSession(()=>null); assert.equal(session.open('harbor'),null); assert.doesNotThrow(()=>session.close());
});
test('failed mount leaves no stale runtime',()=>{
 let disposed=0; const session=createSession(name=>{if(name==='bad')throw Error('bad');return {dispose(){disposed++;}}});
 session.open('good');assert.throws(()=>session.open('bad'));session.close();assert.equal(disposed,1);
});
test('thumbnail capture renders still before releasing the sole runtime',async()=>{
 const {captureThumbnail}=await import('../src/session.js');const events=[];
 const runtime={seek(t){events.push(['seek',t]);},dispose(){events.push(['dispose']);}};
 const result=captureThumbnail(runtime,8,()=>{events.push(['capture']);return 'data:image/png;base64,scene';});
 assert.equal(result,'data:image/png;base64,scene');assert.deepEqual(events,[['seek',8],['capture'],['dispose']]);
});

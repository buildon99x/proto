from pathlib import Path
import shutil,hashlib,json
source=Path('/workspace/shared/emberwatch-r14a17-scene-cache-project/app/src');out=Path('/workspace/shared/r14a17-save-input-diagnosis/instrumented');assert not out.exists();out.mkdir();(out/'package.json').write_text('{"type":"module"}\n');rows=[]
for p in source.rglob('*.js'):
 q=out/p.relative_to(source);q.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,q);rows.append({'path':str(p.relative_to(source)),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
for name,functions in [('state.js',[('export function validateState(state) {','export function validateState(...args){return phase(\'state.validateState\',()=>validateStateImpl(...args),args[0]);}\nfunction validateStateImpl(state) {'),('export function migrateState(state){','export function migrateState(...args){return phase(\'state.migrateState\',()=>migrateStateImpl(...args),args[0]);}\nfunction migrateStateImpl(state){'),('export function reduceRuntime(state, command, context = {}) {','export function reduceRuntime(...args){return phase(\'state.reduceRuntime\',()=>reduceRuntimeImpl(...args),args[0]);}\nfunction reduceRuntimeImpl(state, command, context = {}) {')]),('save.js',[('function decode(raw) {','function decode(raw){return phase(\'save.decode\',()=>decodeImpl(raw));}\nfunction decodeImpl(raw) {'),('  function load() {','  function load(){return phase(\'store.load\',()=>loadImpl());}\n  function loadImpl() {'),('  function save(state, {expectedRevision} = {}) {','  function save(...args){return phase(\'store.save\',()=>saveImpl(...args),args[0]);}\n  function saveImpl(state, {expectedRevision} = {}) {')])]:
 p=out/name;s=p.read_text();s="import {phase} from './diagnostic-phase.js';\n"+s
 for old,new in functions:assert s.count(old)==1,(name,old);s=s.replace(old,new)
 p.write_text(s)
(out/'diagnostic-phase.js').write_text("""let current=null,serial=0,ids=new WeakMap();
export function recordPhases(rows){current=rows;serial=0;ids=new WeakMap();}
const stack=[];
export function phase(name,fn,state){if(!current)return fn();let identity=null;if(state&&typeof state==='object'){if(!ids.has(state))ids.set(state,++serial);identity=ids.get(state);}const parent=stack.at(-1)??null,row={name,identity,depth:stack.length,inclusiveMs:0,exclusiveMs:0},start=performance.now();current.push(row);stack.push(row);try{return fn();}finally{row.inclusiveMs=performance.now()-start;row.exclusiveMs+=row.inclusiveMs;stack.pop();if(parent)parent.exclusiveMs-=row.inclusiveMs;}}
""")
(out/'instrumentation-manifest.json').write_text(json.dumps({'purpose':'Isolated synchronous-phase wrappers only; no live/candidate edits','source':str(source),'files':rows,'instrumented':['state.js','save.js'],'extra':['diagnostic-phase.js','package.json']},indent=2)+'\n');print(len(rows),'JS source copies prepared, no benchmark run')

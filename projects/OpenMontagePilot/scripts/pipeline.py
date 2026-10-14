"""Run reviewed OpenMontage tools through the registry; author revisions remain explicit."""
import os,sys,json,dataclasses,subprocess
from pathlib import Path
P=Path(__file__).resolve().parents[1]
OM=Path(os.environ.get('OPENMONTAGE_ROOT','/workspace/OpenMontage-source'))
sys.path.insert(0,str(OM))
from tools.tool_registry import registry
registry.discover()
A=P/'artifacts';A.mkdir(exist_ok=True)
def write(n,obj): (A/f'{n}.json').write_text(json.dumps(obj,ensure_ascii=False,indent=2))
def call(n,args):
 r=registry._tools[n].execute(args)
 write('receipt_'+n,dataclasses.asdict(r))
 if not r.success:raise RuntimeError(r.error)
 return r.data
write('approval_policy',{'category':'approval_policy','source':'delegated user instruction','policy':'Full local production, package installation, quality iteration, commit/push explicitly authorized; no paid API, keys, publishing, deployment, main merge.'})
write('decision_log',{'entries':[{'category':'approval_policy','subject':'Local full-run authorization','selected':'complete local production and QA based on delegated user request'},{'category':'render_runtime_selection','subject':'Composition runtime','selected':'hyperframes','options_considered':[{'name':'HyperFrames','reason':'SVG/GSAP native; installed Apache-2.0 CLI for local render'},{'name':'Remotion','rejected_because':'not installed; React adds no benefit for this bespoke SVG rig'},{'name':'FFmpeg','rejected_because':'post-processing only; cannot implement character acting'}]},{'category':'composition_mode','subject':'Authoring mode','selected':'bespoke atelier','reason':'Original square-headed peach/navy rig and narrative acting; default bounce/blink renderer excluded from final'}]})
write('research_brief',{'techniques':[{'name':'SVG articulated pivots','source':'OpenMontage character-rigging/SKILL.md','application':'Head/torso/arms maintain joint contact'},{'name':'GSAP paused finite timeline','source':'OpenMontage svg-character-animation/SKILL.md','application':'seekable deterministic slump, tap and startle'},{'name':'pose holds and anticipation','source':'OpenMontage pose-library-design/SKILL.md','application':'slump anticipation, readable 6-hour shock, return-to-start'}],'fit':'high','limitations':'Local rigged animation, not traditional frame-by-frame drawing; no viral performance promise'})
scenes=[{'id':'slump','start_seconds':0,'end_seconds':2,'description':'Anticipate then slump on sofa; eyes shut; 딱 5분만.'},{'id':'snooze','start_seconds':2,'end_seconds':6,'description':'Five increasingly fast thumb taps, head nods, +5분, accelerated clock and nightfall'},{'id':'reveal','start_seconds':6,'end_seconds':11,'description':'Camera cut, clock glance, double take, 21:00→03:00, arms startle and 6시간?!','hero_moment':True},{'id':'loop','start_seconds':11,'end_seconds':15,'description':'Weary settle, promise, restore first pose/caption by 14.6s'}]
write('scene_plan',{'scenes':scenes,'render_runtime':'hyperframes','fps':30,'duration_seconds':15})
design=call('character_spec_generator',{'characters':[{'id':'peach','display_name':'복숭이','role':'sleepy protagonist','body_type':'peach square head and navy pajamas','required_emotions':['sleepy','surprised','determined'],'required_actions':['slump','thumb_tap','startle','settle'],'required_views':['front'],'constraints':['Original character; no famous-character imitation']}],'style':{'visual_style':'original warm editorial cartoon'},'output_path':str(A/'character_design.json')})['character_design']
rig=call('svg_rig_builder',{'character_design':design,'output_path':str(A/'rig_plan.json')})['rig_plan']
poses=call('pose_library_builder',{'rig_plan':rig,'output_path':str(A/'pose_library.json')})['pose_library']
# Revise estimated tool pivots to actual SVG artwork coordinate space.
pivots={'body':[540,1200],'head':[544,1040],'arm_left':[465,1084],'arm_right':[618,1083],'leg_left':[540,1222],'leg_right':[540,1222],'eye_left':[486,927],'eye_right':[596,927],'pupil_left':[486,927],'pupil_right':[596,927],'mouth':[543,982]}
for part,pivot in pivots.items():rig['characters'][0]['joints'][part]['pivot']=pivot
for part in ['body','head','arm_left','arm_right']:rig['characters'][0]['joints'][part]['rotation']=[-80,95]
write('rig_plan',rig)
for name,parts in {'slump':{'body':{'rotation':-58,'y':29},'head':{'rotation':-14}},'thumb_tap':{'arm_right':{'rotation':74}},'startle':{'body':{'y':-80},'arm_right':{'rotation':-72},'arm_left':{'rotation':72},'mouth':{'shape':'small_o'}},'settle':{'body':{'rotation':0,'y':0}}}.items():poses['characters'][0]['poses'][name]={'parts':parts,'hold_frames':18,'description':name,'transition':'power2.inOut'}
write('pose_library',poses)
time=call('action_timeline_compiler',{'scene_plan':{'scenes':scenes},'character_ids':['peach'],'fps':30,'output_path':str(A/'action_timeline_draft.json')})['action_timeline']
acts=[[(.18,.22,'anticipation','idle'),(.4,.38,'drop','slump'),(.78,1.22,'hold','slump')],[(t,.37,'thumb_tap','thumb_tap') for t in [2.15,3.2,4.05,4.75,5.3]],[(6.5,.3,'glance','look_right'),(7.15,.16,'double_take','look_left'),(7.65,.2,'startle','startle'),(7.85,3.15,'hold','surprised')],[(11,.5,'settle','settle'),(12,.5,'promise','idle'),(14.3,.3,'loop_reset','idle')]]
for scene,actions in zip(time['scenes'],acts):scene['actions']=[{'at_seconds':at,'duration_seconds':dur,'character_id':'peach','action':act,'pose':pose,'easing':'power2.inOut'} for at,dur,act,pose in actions]
write('action_timeline',time)
# Execute real renderer, retain its handoff as tooling evidence only.
# Its generic bounce output is intentionally not the authored final.
call('character_rig_renderer',{'rig_plan':rig,'pose_library':poses,'action_timeline':time,'output_path':str(P/'assets/characters/tool-draft-preview.html'),'workspace_path':str(P/'assets/characters/tool-draft-hyperframes'),'duration_seconds':15,'fps':30,'render_video':False})
write('asset_manifest',{'assets':[{'id':'peach-svg','path':'hyperframes/index.html','source_tool':'bespoke original SVG/GSAP authoring; OpenMontage rig/pose data revised'},{'id':'sfx','path':'hyperframes/assets/sfx.wav','source_tool':'original additive synthesis'},{'id':'font','path':'hyperframes/assets/NotoSansKR.ttf','license':'SIL OFL 1.1'}],'total_cost_usd':0})
write('edit_decisions',{'render_runtime':'hyperframes','composition_mode':'atelier','workspace_path':str(P/'hyperframes'),'cuts':scenes,'notes':'Final is bespoke acting. Renderer draft excluded; CLI lint/validate/inspect plus decoded-frame QA required.'})
write('upstream',{'url':'https://github.com/calesthio/OpenMontage','commit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=OM,text=True).strip(),'license':'AGPL-3.0','hyperframes_version':'0.8.157','hyperframes_license':'Apache-2.0','gsap_version':'3.15.0','gsap_license':'GSAP Standard no charge license'})
print('Executed 5 OpenMontage tools; retained separate generic draft and authored final artifacts.')

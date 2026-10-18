"""Fifteen authored, seekable editorial scenes. Voice availability is explicit."""
from pathlib import Path
import json,re,shutil,wave,math,array,hashlib
P=Path(__file__).resolve().parents[1];script=json.loads((P/'artifacts/script.json').read_text());voice=P/'assets/voice/narration.wav';voice_ok=voice.is_file()
if voice_ok:
 with wave.open(str(voice)) as w:voice_ok=w.getnframes()/w.getframerate()>30
if voice_ok:shutil.copy2(voice,P/'hyperframes/assets/narration.wav')
labels=['자동 수락','거절이 어려운 순간','초대 거절 연구','예상과 반응','관계마다 다른 상황','작은 부탁부터','새로운 부탁','확인할 시간','수락 전에 잠깐','내 일정 확인','짧게 거절하기','같은 말을 짧게','여유가 있다면','범위를 정하기','다음 부탁엔']
heads=[['싫은데,','또 “응”.'],['미움받을까 봐.'],['초대를 거절할 때'],['예상은 더 크게.'],['모든 관계는','같지 않아요.'],['작은 부탁부터.'],['“오늘 이것도?”'],['“일정 보고','답할게.”'],['즉답 말고, 확인.'],['내 시간과 여유.'],['“오늘은','맡기 어려워.”'],['짧게. 같은 말로.'],['도울 여유가 있다면'],['선택사항:','십 분만 돕기.'],['다음 부탁엔,','이 한 문장.']]
caps=[['싫은데 또','“응” 했나요?'],['거절하면','미움받을 것 같죠.'],['그런데 초대 거절','연구에선,'],['상대의 실망을','더 크게 예상했어요.'],['물론 모든 관계가','같진 않아요.'],['그래서 작은 부탁부터','연습해요.'],['“오늘 이것도','해줄래?”'],['“일정 보고','답할게.”'],['바로 수락하지 말고','확인해요.'],['내 시간과','여유가 있는지.'],['어렵다면,','“오늘은 맡기 어려워.”'],['계속 부탁해도','같은 말을 짧게.'],['도울 여유가 있다면','범위를 정해요.'],['“전부는 어렵고,','십 분은 도와줄게.”'],['다음 부탁엔,','“일정 보고 답할게.”']]
styles='''@font-face{font-family:Korean;src:url('assets/NotoSansKR.ttf')}*{box-sizing:border-box}body{margin:0;background:#172538;color:#f3eddc;font-family:Korean,sans-serif}#root{position:relative;width:1080px;height:1920px;overflow:hidden}.base{position:absolute;inset:0;background:#172538}.scene{position:absolute;inset:0;opacity:0}.chapter{position:absolute;top:82px;left:66px;font-size:27px;color:#e5ff3e;letter-spacing:3px}.head{position:absolute;top:161px;left:62px;width:956px;font-size:77px;line-height:1.2;font-weight:900;letter-spacing:-4px}.head div+div{color:#e5ff3e}.art{position:absolute;left:20px;top:354px;width:1040px;height:1120px;border:2px solid #60727d;border-radius:28px;overflow:hidden;background:#f3eddc}.art svg{display:block;width:1040px;height:1120px}.caption{position:absolute;left:54px;top:1534px;width:972px;font-size:62px;font-weight:900;letter-spacing:-2px;line-height:1.3;text-align:center}.caption>div{max-width:972px}.note{position:absolute;left:56px;top:1751px;max-width:968px;font-size:24px;color:#c8d3cb;line-height:1.45;text-align:center;width:968px}.draft{position:absolute;left:56px;top:1850px;color:#e5ff3e;font-size:25px;letter-spacing:1px}.progress{position:absolute;left:56px;top:1820px;width:968px;height:4px;background:#e5ff3e;transform-origin:left center}.footer{position:absolute;right:56px;top:1850px;font-size:24px;color:#c8d3cb}.thumb{position:relative;width:1080px;height:1920px;overflow:hidden}.thumb svg{width:1080px;height:1920px;display:block}'''
html='<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>싫은데 또 응 했다면</title><script src="assets/gsap.min.js"></script><style>'+styles+'</style></head><body><div id="root" data-composition-id="boundary50" data-width="1080" data-height="1920" data-duration="50"><div class="base"></div>'
anim=[]
for i,b in enumerate(script['beats'],1):
 a=b['start'];end=b['end'];prefix=f'b{i}-'
 svg=(P/'assets/illustrations'/f'beat-{i:02d}.svg').read_text();ids=re.findall(r'id="([^"]+)"',svg)
 for old in ids:svg=svg.replace(f'id="{old}"',f'id="{prefix}{old}"').replace(f'url(#{old})',f'url(#{prefix}{old})')
 svg=svg.replace('viewBox="0 0 1080 1530"','viewBox="0 330 1080 1200"')
 note='이야기 속 예시 · 일반적인 자기표현 연습'
 if i in [3,4]:note='Givi & Kirk (2024) · 즐거운 사회활동 초대 연구'
 if i==4:note+=' · 그림은 반응의 시각적 비유'
 if i==5:note='초대 연구를 직장·위협 관계나 모든 관계로 일반화하지 않아요.'
 if i in [11,12,13,14]:note='실천 참고: CCI · Mayo Clinic / 도울 마음과 여유가 있을 때만'
 if i==15:note='위협·보복이 있는 관계에서는 자신의 안전과 도움을 우선하세요.'
 html+=f'<section id="scene-{i}" class="scene clip" data-start="{a}" data-duration="{end-a}" data-track-index="0"><div class="chapter">{i:02d} / {labels[i-1]}</div><div class="head">'+''.join(f'<div>{line}</div>' for line in heads[i-1])+f'</div><div class="art">{svg}</div><div class="caption">'+''.join(f'<div>{line}</div>' for line in caps[i-1])+f'</div><div class="note">{note}</div></section>'
 anim.append(f"tl.to('#scene-{i}',{{opacity:1,duration:.08}},{a});tl.fromTo('#scene-{i} .head',{{y:22}},{{y:0,duration:.32,ease:'power3.out',immediateRender:false}},{a});tl.to('#scene-{i}',{{opacity:0,duration:.07}},{end-.07});")
 def appear(node,dt=.2,x=0,y=50,d=.5):anim.append(f"tl.fromTo('#{prefix}{node}',{{opacity:0,x:{x},y:{y}}},{{opacity:1,x:0,y:0,duration:{d},ease:'power3.out',immediateRender:false}},{a+dt});")
 if i==1:
  appear('ping',.18,75,0);appear('ping2',.6,-80,0);appear('ping3',1.0,70,0)
  anim.append(f"tl.set('#{prefix}hero-right',{{svgOrigin:'85 -165'}},{a});tl.to('#{prefix}hero-right',{{rotation:-8,duration:.4,ease:'power2.inOut'}},{a+.4});tl.to('#{prefix}hero-head',{{y:8,duration:.6}},{a+1.3});")
 elif i==2:
  appear('thought',.12,0,70);anim.append(f"tl.fromTo('#{prefix}thought',{{scale:.92,transformOrigin:'center'}},{{scale:1.03,duration:1.1,ease:'power2.inOut',immediateRender:false}},{a+.5});")
 elif i==3:
  appear('invite',.4,70,0);anim.append(f"tl.set('#{prefix}inviter-right',{{svgOrigin:'85 -165'}},{a});tl.to('#{prefix}inviter-right',{{rotation:-12,duration:.5}},{a+.3});")
 elif i==4:
  appear('expected',.12,0,0);anim.append(f"tl.to('#{prefix}expected',{{scale:.86,transformOrigin:'center',duration:.7,ease:'power2.inOut'}},{a+1.2});");appear('response',1.6,60,30)
 elif i==5:
  appear('boundary',.2,0,0);appear('caution',.1,0,40)
 elif i==6:
  anim.append(f"tl.to('#{prefix}friend',{{x:'-=20',duration:.6,ease:'power2.out'}},{a+.2});")
 elif i==7:
  appear('request',.2,0,70)
 elif i==8:
  appear('request',.08,0,20);appear('reply',.5,0,100)
 elif i==9:
  appear('pause-symbol',.3,0,20);anim.append(f"tl.set('#{prefix}hero-right',{{svgOrigin:'85 -165'}},{a});tl.to('#{prefix}hero-right',{{rotation:-12,duration:.6,ease:'power2.out'}},{a+.1});")
 elif i==10:
  appear('check',.3,0,60);anim.append(f"tl.fromTo('#{prefix}clock',{{rotation:-9,transformOrigin:'center'}},{{rotation:0,duration:.6,ease:'power2.out',immediateRender:false}},{a+.1});")
 elif i==11:
  appear('no',.35,90,0);anim.append(f"tl.set('#{prefix}hero-right',{{svgOrigin:'85 -165'}},{a});tl.to('#{prefix}hero-right',{{rotation:-8,duration:.5,ease:'power2.out'}},{a+.2});")
 elif i==12:
  appear('ask1',.1,-70,0);appear('ask2',.55,70,0);appear('ask3',1.0,-70,0);appear('steady',.3,0,55)
 elif i==13:
  appear('optional',.2,0,55);anim.append(f"tl.set('#{prefix}hero-right',{{svgOrigin:'85 -165'}},{a});tl.to('#{prefix}hero-right',{{rotation:-10,duration:.6,ease:'power2.out'}},{a+.7});")
 elif i==14:
  anim.append(f"tl.fromTo('#{prefix}ten-clock',{{scale:.9,transformOrigin:'center'}},{{scale:1,duration:.55,ease:'power2.out',immediateRender:false}},{a+.1});")
 else:
  appear('last-reply',.25,0,65);anim.append(f"tl.to('#{prefix}space',{{scaleX:1.12,transformOrigin:'center',duration:.8,ease:'sine.inOut'}},{a+.1});")
html+='<div id="progress" class="progress"></div>'+('' if voice_ok else '<div class="draft">내레이션 대기 · 제작 미리보기</div>')+'<div class="footer">나를 지키는 말 연습</div>'
if voice_ok:html+='<audio id="voice" src="assets/narration.wav" data-start="0" data-duration="50" data-track-index="10"></audio>'
html+='</div><script>window.__timelines={};const tl=gsap.timeline({paused:true});'+''.join(anim)+"tl.fromTo('#progress',{scaleX:0},{scaleX:1,duration:50,ease:'none'},0);window.__timelines['boundary50']=tl;</script></body></html>"
(P/'hyperframes/index.html').write_text(html)
thumb=(P/'assets/illustrations/thumbnail.svg').read_text();(P/'hyperframes/thumbnail.html').write_text('<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>'+styles+'</style></head><body><div class="thumb">'+thumb+'</div></body></html>')
(P/'artifacts/font-characters.txt').write_text(html+thumb)
(P/'artifacts/authoring-status.json').write_text(json.dumps({'voice_available':voice_ok,'status':'ready_for_voiced_QA' if voice_ok else 'visual_preview_only_narration_blocked','duration_seconds':50,'beats':15,'scene_source':'original authored SVG/GSAP','no_medical_causal_claim':True,'completed_videos_preserved':True},ensure_ascii=False,indent=2))
print('Authored15 scenes; narration available:',voice_ok)

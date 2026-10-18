"""Bespoke vertical support layer around unmodified, full-viewport gameplay."""
from pathlib import Path
import json,math,wave,array,random
P=Path(__file__).resolve().parents[1]
scenes=[(0,3,'결정의 순간','이 한 장,','지금 쓸까?','buff','한 장의 선택이','다음 수를 바꾼다.'),(3,8,'카드와 대상','카드를 고르고,','목표를 찍는다.','card','비용과 효과를 보고','직접 대상을 조준.'),(8,11,'가문의 선택','불꽃으로 갈까,','번개로 갈까?','pyrren','하우스 파이렌','불꽃의 계승자'),(11,14,'가문의 선택','불꽃으로 갈까,','번개로 갈까?','volgrim','하우스 볼그림','번개의 계승자'),(14,16,'분기 맵','갈 길도,','받을 카드도.','map','갈림길 앞에서','다음 경로를 고른다.'),(16,19,'카드 보상','갈 길도,','받을 카드도.','reward','보상 카드 3장 중','나의 덱에 한 장.'),(19,26,'이어지는 선택','막는 순서가,','때리는 힘이 된다.','synergy','방어한 다음,','공격을 강화한다.'),(26,30,'YOUR NEXT DECK','이 덱빌딩,','해보고 싶어?','combat','DRAGONBLOOD','로그라이크 덱빌딩')]
head='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=1080,height=1920"><title>DRAGONBLOOD — 이 한 장, 지금 쓸까?</title><script src="assets/gsap.min.js"></script><style>
@font-face{font-family:Korean;src:url('assets/NotoSansKR.ttf')}*{box-sizing:border-box}body{margin:0;background:#0b1322;font-family:Korean,sans-serif;color:#fff4dd}#root{position:relative;width:1080px;height:1920px;overflow:hidden}.back{position:absolute;inset:0;background:radial-gradient(ellipse at 85% 20%,#253250 0%,#101a2b 46%,#080e19 100%)}.rail{position:absolute;left:60px;right:60px;height:2px;background:#766141;opacity:.8}.brand{position:absolute;left:60px;top:108px;font-size:36px;letter-spacing:7px;font-weight:900}.brand span{color:#d7b77c;font-size:23px;letter-spacing:3px;margin-left:20px}.dev{position:absolute;right:60px;top:119px;color:#d7b77c;font-size:23px;letter-spacing:2px}.chapter{position:absolute;left:64px;top:211px;color:#d7b77c;font-size:28px;letter-spacing:4px}.headline{position:absolute;left:58px;top:284px;font-size:88px;line-height:1.21;letter-spacing:-5px;font-weight:900;margin:0}.headline div{color:#f0cc88}.scene{position:absolute;inset:0;opacity:0}.frame{position:absolute;left:24px;top:635px;width:1032px;height:584px;border:2px solid #b3935a;border-radius:8px;background:#040811;box-shadow:0 24px 64px #0007}.clip.game{position:absolute;left:28px;top:639px;width:1024px;height:576px;object-fit:contain;z-index:3;background:#040811}.screenlabel{position:absolute;left:60px;top:1250px;color:#d0bb92;font-size:25px;letter-spacing:1px}.detail{position:absolute;left:60px;top:1331px;width:308px;height:366px;object-fit:contain;background:#0d1728;border:1px solid #887552;border-radius:10px}.detail.wide{width:454px;object-fit:contain}.copy{position:absolute;left:422px;top:1400px;font-size:43px;font-weight:800;line-height:1.55;letter-spacing:-2px}.copy.wide{left:563px;font-size:39px;max-width:450px}.copy small{display:block;font-size:27px;color:#d7b77c;letter-spacing:1px;margin-top:22px}.bottom{position:absolute;left:60px;right:60px;top:1787px;display:flex;justify-content:space-between;font-size:24px;color:#bda98b;letter-spacing:1px}.progress{position:absolute;left:60px;top:1748px;width:960px;height:4px;background:#d7b77c;transform-origin:left center}.fullnote{position:absolute;right:60px;top:1250px;color:#bda98b;font-size:23px}.pair{position:absolute;top:1342px;width:220px;height:355px;object-fit:contain;background:#101a2b;border:1px solid #887552;border-radius:10px}.pair.left{left:60px}.pair.right{left:306px}.comparison{position:absolute;left:60px;top:1302px;width:470px;font-size:23px;color:#d7b77c;display:flex;justify-content:space-around}.synergytext{position:absolute;left:575px;top:1372px;width:430px}.number{font-size:87px;letter-spacing:-3px;color:#f0cc88;font-weight:900}.synergytext .description{font-size:34px;line-height:1.55;letter-spacing:-1px;color:#fff4dd}.eyebrow{font-size:24px;letter-spacing:1px;color:#d7b77c}.accent{position:absolute;left:60px;top:570px;width:88px;height:7px;background:#d7b77c}
</style></head><body><div id="root" data-composition-id="dragonblood30" data-width="1080" data-height="1920" data-duration="30"><div class="back"></div><div class="rail" style="top:186px"></div><div class="brand">DRAGONBLOOD<span>DECK / CHOICE / SYNERGY</span></div><div class="dev">개발 중 화면</div><div class="frame"></div><video id="game" class="clip game" src="assets/gameplay.mp4" data-start="0" data-duration="30" data-track-index="0" muted playsinline></video><audio id="score" src="assets/editorial-score.wav" data-start="0" data-duration="30" data-track-index="9"></audio><div class="screenlabel">실제 게임 플레이 · 전체 화면 비율 유지</div><div class="fullnote">아래: 실제 화면 확대</div><div class="progress" id="progress"></div><div class="bottom"><span>30 SECONDS / FIRST IMPRESSION</span><span>개발 중 · 영상용 사운드</span></div>'''
sections=[];anim=[]
for i,(a,b,chapter,line1,line2,detail,copy1,copy2) in enumerate(scenes):
 sid=f'beat-{i}'
 s=f'<section id="{sid}" class="scene clip" data-start="{a}" data-duration="{b-a}" data-track-index="1"><div class="chapter">{i+1:02d} / {chapter}</div><h1 class="headline">{line1}<div>{line2}</div></h1><div class="accent"></div>'
 if detail=='synergy':
  s+='<div class="comparison"><span>사용 전</span><span>소풍 사용 후</span></div><img class="pair left" src="assets/detail-before.png"><img class="pair right" src="assets/detail-after.png"><div class="synergytext"><div class="eyebrow">같은 카드의 표시 피해</div><div class="number">6 → 9</div><div class="description">소풍으로 방어,<div>다음 공격 강화.</div></div></div>'
 else:
  wide=detail in ['map','reward'];cl=' wide' if wide else ''
  s+=f'<img class="detail{cl}" src="assets/detail-{detail}.png"><div class="copy{cl}">{copy1}<div>{copy2}</div><small>{"원본 UI 확대" if detail in ["card","buff","map","reward"] else "실제 게임 화면 확대"}</small></div>'
 s+='</section>';sections.append(s)
 anim.append(f"tl.to('#{sid}',{{opacity:1,duration:0.08}},{a});tl.fromTo('#{sid} .headline',{{y:20}},{{y:0,duration:.32,ease:'power3.out',immediateRender:false}},{a});tl.to('#{sid}',{{opacity:0,duration:.06}},{b-.06});")
# Exact root timing controls media; all animations are finite and seek-driven.
js="<script>window.__timelines={};const tl=gsap.timeline({paused:true});"+''.join(anim)+"tl.fromTo('#progress',{scaleX:0},{scaleX:1,duration:30,ease:'none'},0);window.__timelines['dragonblood30']=tl;</script>"
html=head+''.join(sections)+'</div>'+js+'</body></html>'
# Short display lines are separate block elements; avoid forced line breaks.
html=html.replace('방어를 얻고,<br>다음 공격을 강화.','방어를 얻고,<div>다음 공격을 강화.</div>')
(P/'hyperframes/index.html').write_text(html)
# Original edit-only score: no game audio or external recording is represented.
sr=48000;N=30*sr;out=[0.0]*N;rng=random.Random(7731)
def tone(at,dur,f,gain,end=None):
 for j in range(int(dur*sr)):
  t=j/sr;phase=2*math.pi*(f*t+((end-f)*t*t/(2*dur) if end else 0));env=min(1,t/.012)*max(0,1-t/dur)**1.6;ix=int(at*sr)+j
  if 0<=ix<N:out[ix]+=gain*env*(math.sin(phase)+.12*math.sin(phase*2))
def snap(at,gain):
 for j in range(int(.095*sr)):
  ix=int(at*sr)+j
  if ix<N:out[ix]+=gain*(rng.random()*2-1)*(1-j/(.095*sr))**3
for beat in range(50):
 t=beat*.6
 tone(t,.24,88,.13,end=39)
 if beat%2:snap(t,.045)
 tone(t+.3,.1,1174,.012)
 if beat%4==0:
  for f in [146.832,220,293.665]:tone(t,.95,f,.024)
for t in [0,3,8,11,14,16,19,22,26]:tone(t,.5,100,.16,end=38);snap(t,.05)
for t in [1.0,5.1,20.1,23.2,28.1]:snap(t,.15);tone(t,.24,180,.13,end=54)
# Gentle end fade; no abrupt waveform cut or claims of listening.
for j in range(N):out[j]*=min(1,j/(.02*sr),(N-j-1)/(.7*sr))
peak=max(map(abs,out));scale=.72/max(.72,peak);samples=array.array('h')
for x in out:
 v=int(max(-1,min(1,x*scale))*32767);samples.extend([v,v])
with wave.open(str(P/'hyperframes/assets/editorial-score.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(samples.tobytes())
(P/'artifacts/audio-provenance.json').write_text(json.dumps({'source':'new original deterministic additive synthesis + seeded noise authored for this edit','author':'project production session','license':'Original project work; no third-party recording or melody copied','game_audio':False,'on_screen_label':'개발 중 · 영상용 사운드','duration_seconds':30,'sample_rate':sr,'peak_linear':peak*scale,'actual_listening':'not performed'},ensure_ascii=False,indent=2))
(P/'artifacts/script.json').write_text(json.dumps({'audio_architecture':'original edit score; Korean on-screen copy; no narration','beats':[{'start':x[0],'end':x[1],'chapter':x[2],'headline':[x[3],x[4]],'source_detail':x[5]} for x in scenes],'claims':'All feature claims map to actual captured cards/targets/house selection/map/reward/buff preview. No transformation or new character-art completion claim.'},ensure_ascii=False,indent=2))
print('Authored bespoke source-led HyperFrames project and original editorial score.')

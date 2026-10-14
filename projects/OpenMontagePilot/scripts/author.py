from pathlib import Path
import math, wave, array, json
P=Path(__file__).resolve().parents[1]
html='''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>5분 자동 연장</title>
<script src="assets/gsap.min.js"></script><style>
@font-face{font-family:Korean;src:url('assets/NotoSansKR.ttf')}*{box-sizing:border-box}body{margin:0;background:#201b2c;font-family:Korean,sans-serif}#root{width:1080px;height:1920px;position:relative;overflow:hidden}.clip{position:absolute;inset:0}svg{width:1080px;height:1920px}.ink{stroke:#242037;stroke-width:12;stroke-linecap:round;stroke-linejoin:round}text{font-family:Korean,sans-serif;font-weight:900}.caption{position:absolute;top:330px;left:80px;width:920px;text-align:center;color:#fff7ed;font-size:98px;letter-spacing:-5px;line-height:1.25;opacity:0}.tiny{position:absolute;left:90px;top:150px;color:#fdd69b;font-size:28px;letter-spacing:5px}.sub{font-size:42px;letter-spacing:-2px;color:#f5d1c0;margin-top:22px}.pill{display:inline-block;background:#fdd69b;color:#272037;padding:15px 35px;border-radius:24px;font-size:72px;letter-spacing:-3px}.shout{font-size:154px;letter-spacing:-8px;color:#ffce80}.footer{position:absolute;left:80px;bottom:140px;width:920px;text-align:center;color:#f5d1c0;font-size:28px;letter-spacing:2px}
</style></head><body><div id="root" data-composition-id="five-minutes" data-width="1080" data-height="1920" data-duration="15">
<div class="clip" id="picture" data-start="0" data-duration="15" data-track-index="0">
<svg viewBox="0 0 1080 1920" role="img" aria-label="복숭아색 사각 머리 캐릭터가 소파에서 졸다가 시간을 보고 놀라는 코미디">
<defs><linearGradient id="wall" x2="0" y2="1"><stop stop-color="#3d304e"/><stop offset="1" stop-color="#715166"/></linearGradient><linearGradient id="windowfill" x2="0" y2="1"><stop stop-color="#332651"/><stop offset="1" stop-color="#e39b83"/></linearGradient></defs>
<rect width="1080" height="1920" fill="url(#wall)"/><rect y="1380" width="1080" height="540" fill="#302639"/><path d="M0 1380H1080" stroke="#a07577" stroke-width="6"/>
<g id="night" opacity="0"><rect width="1080" height="1390" fill="#241c3d"/></g>
<rect x="100" y="655" width="255" height="355" rx="110" fill="url(#windowfill)" stroke="#a97979" stroke-width="15"/><path d="M225 657V1010M103 830H351" stroke="#a97979" stroke-width="12"/>
<g id="stars" fill="#ffdeb0" opacity="0"><circle cx="175" cy="736" r="6"/><circle cx="275" cy="787" r="5"/><path d="M260 690a43 43 0 1 0 50 53 40 40 0 0 1-50-53"/></g>
<g id="clock"><circle cx="822" cy="780" r="113" fill="#fbe4ce" class="ink"/><circle cx="822" cy="780" r="93" fill="none" stroke="#dfbba9" stroke-width="4"/><path d="M822 685V700M822 860V875M727 780H742M902 780H917" stroke="#302639" stroke-width="9"/><path id="hour" d="M822 780H770" stroke="#302639" stroke-width="13" stroke-linecap="round"/><path id="minute" d="M822 780V712" stroke="#302639" stroke-width="9" stroke-linecap="round"/><circle cx="822" cy="780" r="10" fill="#d97965"/></g>
<g id="room"><ellipse cx="555" cy="1420" rx="422" ry="43" fill="#1e1928" opacity=".5"/>
<rect x="117" y="1060" width="845" height="289" rx="76" fill="#bb7877" class="ink"/><rect x="160" y="1070" width="373" height="236" rx="54" fill="#d18b86"/><rect x="546" y="1070" width="372" height="236" rx="54" fill="#c78382"/><rect x="165" y="1250" width="750" height="111" rx="40" fill="#e39f92" class="ink"/><rect x="130" y="1330" width="52" height="90" rx="16" fill="#2a2437"/><rect x="870" y="1330" width="52" height="90" rx="16" fill="#2a2437"/>
<g id="actor">
<g id="legs"><path d="M493 1222L484 1330L397 1337" fill="none" stroke="#27375f" stroke-width="70" stroke-linecap="round"/><path d="M586 1222L640 1320L737 1320" fill="none" stroke="#27375f" stroke-width="70" stroke-linecap="round"/><path d="M395 1337h-18M738 1320h23" stroke="#f4bc9e" stroke-width="52" stroke-linecap="round"/></g>
<g id="upper"><rect x="452" y="1031" width="180" height="219" rx="62" fill="#293961" class="ink"/><path d="M487 1050L541 1110L598 1050M541 1110V1238" stroke="#7590ba" stroke-width="7" fill="none"/><circle cx="563" cy="1140" r="5" fill="#d9cce0"/><circle cx="563" cy="1184" r="5" fill="#d9cce0"/>
<g id="leftarm"><path d="M465 1084L410 1164L465 1200" stroke="#293961" stroke-width="57" fill="none" stroke-linecap="round"/><circle cx="466" cy="1200" r="29" fill="#f4bc9e" class="ink"/></g>
<g id="rightarm"><path d="M618 1083L683 1140L745 1172" stroke="#293961" stroke-width="57" fill="none" stroke-linecap="round"/><rect x="724" y="1087" width="91" height="148" rx="20" fill="#242037" stroke="#f9cfad" stroke-width="5"/><rect x="737" y="1105" width="65" height="100" rx="9" fill="#ffce80"/><path d="M753 1155h32M769 1139v32" stroke="#282039" stroke-width="7"/><circle cx="745" cy="1172" r="29" fill="#f4bc9e" class="ink"/><path id="thumb" d="M740 1170l34 7" stroke="#f4bc9e" stroke-width="24" stroke-linecap="round"/></g>
<g id="head"><rect x="425" y="814" width="238" height="231" rx="54" fill="#ffc0a5" class="ink"/><path d="M451 841q42-24 70-8" stroke="#ffdbc1" stroke-width="16" fill="none" stroke-linecap="round"/>
<g id="awake"><ellipse cx="486" cy="927" rx="16" ry="24" fill="#282039"/><ellipse cx="596" cy="927" rx="16" ry="24" fill="#282039"/><path id="brows" d="M467 883l35 7M577 890l35-7" stroke="#282039" stroke-width="9" fill="none" stroke-linecap="round"/></g>
<g id="sleep" opacity="0"><path d="M466 927q20 18 40 0M576 927q20 18 40 0" stroke="#282039" stroke-width="9" fill="none" stroke-linecap="round"/></g>
<path id="mouth" d="M516 984q25 9 49 0" stroke="#282039" stroke-width="9" fill="none" stroke-linecap="round"/><ellipse id="gasp" cx="543" cy="982" rx="25" ry="33" fill="#282039" opacity="0"/>
<ellipse cx="459" cy="970" rx="20" ry="11" fill="#ed8c86"/><ellipse cx="627" cy="970" rx="20" ry="11" fill="#ed8c86"/></g></g></g>
<rect x="90" y="1160" width="88" height="216" rx="40" fill="#bd7775" class="ink"/><rect x="901" y="1160" width="88" height="216" rx="40" fill="#bd7775" class="ink"/></g>
<g id="zz" opacity="0" fill="#ffe7c9"><text x="731" y="1010" font-size="72" transform="rotate(12 731 1010)">z</text><text x="830" y="1050" font-size="45">z</text></g>
<g id="button"><rect x="270" y="1505" width="540" height="137" rx="46" fill="#1f1d32" stroke="#ae858d" stroke-width="4"/><rect id="buttonface" x="290" y="1486" width="500" height="135" rx="43" fill="#ffce80" stroke="#272037" stroke-width="8"/><text x="540" y="1577" text-anchor="middle" font-size="64" fill="#272037">+5분 연장</text></g>
<g id="tap" opacity="0" stroke="#ffd890" stroke-width="12"><path d="M795 1450l37-33M833 1500l51-5M752 1425l6-40"/></g>
<g id="time21"><rect x="340" y="600" width="400" height="113" rx="28" fill="#282039"/><text x="540" y="681" text-anchor="middle" font-size="65" fill="#fff0df">밤 9:00</text></g>
<g id="time03" opacity="0"><rect x="290" y="600" width="500" height="125" rx="28" fill="#ffce80"/><text x="540" y="689" text-anchor="middle" font-size="72" fill="#282039">새벽 3:00</text></g>
</svg></div>
<div class="tiny">소파의 법칙 · 01</div>
<div id="c1" class="caption">딱 <span style="color:#ffce80">5분</span>만.<div class="sub">눕는 순간, 시작됐다.</div></div>
<div id="c2" class="caption"><span class="pill">+5분</span><div class="sub">한 번만 더… 한 번만 더…</div></div>
<div id="c3" class="caption">잠깐. 지금 몇 시?</div>
<div id="c4" class="caption"><span class="shout">6시간?!</span><div class="sub">5분이 자동 연장되었습니다.</div></div>
<div id="c5" class="caption">이번엔 진짜…<div class="sub">딱 5분만.</div></div>
<div class="footer">5분 자동 연장</div>
<audio id="sfx" class="clip" src="assets/sfx.wav" data-start="0" data-duration="15" data-track-index="9"></audio>
</div><script>
window.__timelines={};const tl=gsap.timeline({paused:true});gsap.set("#c1",{opacity:1});
const origins={actor:'540 1240',upper:'540 1200',head:'544 1040',leftarm:'465 1084',rightarm:'618 1083',legs:'540 1222',hour:'822 780',minute:'822 780',clock:'822 780',button:'540 1560',room:'540 1240'};
for(const [id,p] of Object.entries(origins))gsap.set('#'+id,{svgOrigin:p});
gsap.set('#clock',{x:60});
function cap(id,a,b){tl.to('#'+id,{opacity:1,duration:0.12},a);tl.to('#'+id,{opacity:0,duration:0.1},b-0.1)}
cap('c1',0,2);cap('c2',2,6);cap('c3',6,7.6);cap('c4',7.6,11);cap('c5',11,14.5);cap('c1',14.5,15.2);
// Anticipate, drop into cushions, head and arm follow-through.
tl.to('#upper',{y:-25,rotation:7,duration:.22,ease:'power2.out'},.18)
.to('#upper',{y:36,rotation:-64,duration:.38,ease:'power3.in'},.4)
.to('#head',{rotation:-14,duration:.26,ease:'sine.in'},.58)
.to('#rightarm',{rotation:42,duration:.34,ease:'power2.in'},.5)
.to('#legs',{rotation:8,duration:.3},.5)
.to('#upper',{y:29,rotation:-58,duration:.27,ease:'power2.out'},.78)
.to('#sleep',{opacity:1,duration:.1},.7).to('#awake',{opacity:0,duration:.1},.7)
.to('#zz',{opacity:1,duration:.25},1.2);
// Repeated deliberate snooze taps, each with reach, contact and return.
for(const t of [2.15,3.2,4.05,4.75,5.3]){
 tl.to('#thumb',{y:-16,duration:.1},t+.08).to('#thumb',{y:0,duration:.12},t+.18);
 tl.to('#rightarm',{rotation:74,duration:.15,ease:'power2.in'},t)
 .to('#rightarm',{rotation:42,duration:.22,ease:'power2.out'},t+.15)
 .to('#button',{y:12,duration:.08},t+.15).to('#button',{y:0,duration:.16},t+.23)
 .to('#tap',{opacity:1,duration:.04},t+.15).to('#tap',{opacity:0,duration:.2},t+.2)
 .to('#head',{rotation:-22,duration:.16},t+.1).to('#head',{rotation:-14,duration:.24},t+.26);
}
tl.to('#minute',{rotation:2160,duration:3.65,ease:'power2.in'},2.05)
.to('#hour',{rotation:180,duration:3.65,ease:'power2.in'},2.05)
.to('#night',{opacity:.65,duration:3},3).to('#stars',{opacity:1,duration:2},4);
tl.set('#room',{scale:1.12},6).set('#clock',{scale:1.25},6).set('#room',{scale:1.06},7.6).set('#clock',{scale:1},7.6).set('#room',{scale:1},11);
// Hard narrative cut, clock hold, then awake double-take and reaction pose.
tl.to('#zz',{opacity:0,duration:.05},6)
.to('#sleep',{opacity:0,duration:.06},6.5).to('#awake',{opacity:1,duration:.06},6.5)
.to('#head',{rotation:9,duration:.2,ease:'power2.out'},6.5)
.to('#upper',{rotation:0,y:0,duration:.3,ease:'back.out(1.4)'},6.8)
.to('#head',{rotation:-9,duration:.16},7.15)
.to('#time21',{opacity:0,duration:.08},7.4).to('#time03',{opacity:1,duration:.08},7.4)
.to('#upper',{y:-80,rotation:5,duration:.16,ease:'power3.out'},7.65)
.to('#head',{rotation:0,duration:.15},7.65)
.to('#rightarm',{rotation:-72,duration:.18,ease:'power3.out'},7.65)
.to('#leftarm',{rotation:72,duration:.18,ease:'power3.out'},7.65)
.to('#legs',{rotation:-7,duration:.18},7.65)
.to('#mouth',{opacity:0,duration:.06},7.65).to('#gasp',{opacity:1,duration:.06},7.65)
.to('#upper',{y:-48,rotation:0,duration:.24,ease:'power2.in'},7.85)
.to('#room',{x:-12,duration:.06,repeat:5,yoyo:true},7.7);
// Resolution: weary exhale, determined promise, returns to identical opening hold.
tl.to('#upper',{y:0,duration:.5,ease:'sine.inOut'},11)
.to('#rightarm',{rotation:0,duration:.45},11).to('#leftarm',{rotation:0,duration:.45},11)
.to('#legs',{rotation:0,duration:.4},11)
.to('#gasp',{opacity:0,duration:.1},11).to('#mouth',{opacity:1,duration:.1},11)
.to('#head',{rotation:12,duration:.3},11.4).to('#head',{rotation:0,duration:.35},12)
.to('#upper',{rotation:-10,duration:.28},12.6).to('#upper',{rotation:0,duration:.45},13)
.to('#night',{opacity:0,duration:.3},14).to('#stars',{opacity:0,duration:.3},14)
.to('#time03',{opacity:0,duration:.1},14.3).to('#time21',{opacity:1,duration:.1},14.3)
.to('#minute',{rotation:0,duration:.2},14.25).to('#hour',{rotation:0,duration:.2},14.25)
.to('#room',{x:0,duration:.1},14.3);
window.__timelines['five-minutes']=tl;
</script></body></html>'''
(P/'hyperframes/index.html').write_text(html)
# Original synthesized cues: padded stereo, deterministic, no licensed recording.
sr=48000;n=15*sr;buf=[0.0]*n
def tone(at,dur,freq,gain,kind='sine',end=None):
 for j in range(int(dur*sr)):
  t=j/sr;f=freq+(end-freq)*t/dur if end else freq
  phase=2*math.pi*(freq*t+((end-freq)*t*t/(2*dur) if end else 0))
  env=min(1,t/.008)*max(0,1-t/dur)**2
  v=math.sin(phase) if kind=='sine' else math.sin(phase)+.28*math.sin(phase*2)
  ix=int(at*sr)+j
  if ix<n:buf[ix]+=gain*env*v
# Slump, tiny click + upward notification every tap, accelerating clock ticks.
tone(.72,.28,130,.26,end=42)
for t in [2.3,3.35,4.2,4.9,5.45]:
 tone(t,.035,1600,.12);tone(t+.045,.15,540,.13,end=900)
for j in range(23):tone(2.2+3.45*(j/23)**.62,.027,1150,.055)
tone(7.42,.13,650,.16);tone(7.64,.6,90,.26,end=42)
for a,f in [(7.68,440),(7.8,554.37),(7.92,659.25)]:tone(a,.5,f,.11)
tone(11.1,.3,280,.08,end=130);tone(12.6,.12,450,.08,end=560)
# Keep boundary 0.0s and last 0.5s silent for seamless repeated playback.
peak=max(map(abs,buf));scale=min(1,.7/(peak*1.9))*1.9
samples=array.array('h')
for v in buf:
 s=int(v*scale*32767);samples.extend([s,s])
with wave.open(str(P/'hyperframes/assets/sfx.wav'),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(samples.tobytes())
(P/'artifacts/audio_source.json').write_text(json.dumps({'source':'original deterministic additive synthesis','sample_rate':sr,'peak_linear':peak*scale,'duration':15,'listening':'not performed'},indent=2))

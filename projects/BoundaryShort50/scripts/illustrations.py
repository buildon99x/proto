"""Original editorial SVG illustrations. No external character, stock or medical imagery."""
from pathlib import Path
import random
P=Path(__file__).resolve().parents[1]
INK='#172538';Y='#e5ff3e';CREAM='#f3eddc';ORANGE='#f4a372';TEAL='#7ca8aa'
def text(x,y,s,size=44,fill=INK,anchor='start',weight=800):return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{s}</text>'
def rect(x,y,w,h,fill=CREAM,r=28,stroke=INK,sw=6):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>'
def bubble(x,y,w,h,lines,fill=CREAM,fs=44,fg=INK,id=''):
 body=rect(x,y,w,h,fill,30)+f'<path d="M{x+w*.2} {y+h}l-15 28 57-28" fill="{fill}" stroke="{INK}" stroke-width="6" stroke-linejoin="round"/>'
 for i,line in enumerate(lines):body+=text(x+w/2,y+55+i*(fs*1.3),line,fs,fg,'middle')
 return f'<g {f"id={chr(34)+id+chr(34)}" if id else ""}>{body}</g>'
def person(x,y,s=1,pose='tired',color=ORANGE,id='hero',face=True):
 # Data-driven adult silhouette, shoulders/head/hands at stable local pivots.
 tired=pose=='tired';tilt=-12 if tired else 0
 hair=f'<path d="M-79-250Q-96-354 0-359Q99-355 78-244L50-215H-58Z" fill="{INK}"/>'
 faceart=f'<ellipse cx="0" cy="-281" rx="65" ry="79" fill="#eeb798" stroke="{INK}" stroke-width="6"/><path d="M-66-309Q-48-365 24-348Q61-337 67-299L38-312Q-8-291-43-314Z" fill="{INK}"/>'
 if tired:faceart+='<path d="M-35-272l23 2M16-271l23-2M-36-261q10 6 19 0M20-261q10 6 18 0" stroke="#493e43" stroke-width="6" fill="none"/><path d="M-12-236q14-8 29-1" stroke="#493e43" stroke-width="5" fill="none"/>'
 else:faceart+='<path d="M-37-283l24-5M16-286l24 4" stroke="#493e43" stroke-width="5"/><circle cx="-25" cy="-270" r="5" fill="#172538"/><circle cx="28" cy="-270" r="5" fill="#172538"/><path d="M-12-235q15 10 30-1" stroke="#493e43" stroke-width="5" fill="none"/>'
 faceart+='<path d="M4-268l-5 18 9 1" stroke="#a36c5b" stroke-width="4" fill="none"/>'
 torso=f'<path d="M-115-180Q-86-224-44-219L0-191 44-219Q92-213 118-174L91 28H-89Z" fill="{color}" stroke="{INK}" stroke-width="7"/><path d="M0-189V24M-44-219l40 48 47-48M-86-89H-42M45-89H87" fill="none" stroke="#734b4c" stroke-width="4"/>'
 legs=f'<path d="M-62 26L-76 241-27 246 3 49 32 247 83 241 60 26" fill="#40566b" stroke="{INK}" stroke-width="7"/><path d="M-77 242l-23 23h73v-21M30 245v21h81l-32-26" fill="{INK}" stroke="{INK}" stroke-width="8" stroke-linejoin="round"/>'
 # Separate articulated groups for phone, pause palm, and helping gesture.
 left=f'<g id="{id}-left"><path d="M-89-165Q-150-82-140-5L-68 15" fill="none" stroke="{INK}" stroke-width="43" stroke-linecap="round"/><path d="M-89-165Q-150-82-140-5L-68 15" fill="none" stroke="{color}" stroke-width="30" stroke-linecap="round"/><ellipse cx="-62" cy="15" rx="23" ry="18" fill="#eeb798" stroke="{INK}" stroke-width="5"/></g>'
 right=f'<g id="{id}-right"><path d="M86-167L137-94 83-58" fill="none" stroke="{INK}" stroke-width="43" stroke-linecap="round"/><path d="M86-167L137-94 83-58" fill="none" stroke="{color}" stroke-width="30" stroke-linecap="round"/>'+rect(44,-152,64,105,'#fff6e7',12,INK,5)+f'<path d="M56-132h40M56-116h26" stroke="#9eaab1" stroke-width="5"/><ellipse cx="85" cy="-62" rx="24" ry="19" fill="#eeb798" stroke="{INK}" stroke-width="5"/></g>'
 if pose=='pause':right=f'<g id="{id}-right"><path d="M85-165l73 58 18-78" fill="none" stroke="{INK}" stroke-width="43" stroke-linecap="round"/><path d="M85-165l73 58 18-78" fill="none" stroke="{color}" stroke-width="30" stroke-linecap="round"/><path d="M162-183v-44q0-11 7-11t7 11v17-30q0-12 7-12t7 12v31-22q0-11 7-11t7 11v37l9-13q7-11 14-4t-1 15l-21 34q-25 16-43-21Z" fill="#eeb798" stroke="{INK}" stroke-width="5"/></g>'
 if pose=='help':right=f'<g id="{id}-right"><path d="M85-165l65 73 79-18" fill="none" stroke="{INK}" stroke-width="43" stroke-linecap="round"/><path d="M85-165l65 73 79-18" fill="none" stroke="{color}" stroke-width="30" stroke-linecap="round"/><path d="M220-127q38-16 48-4t-18 20q23 0 24 11-32 20-53 6Z" fill="#eeb798" stroke="{INK}" stroke-width="5"/></g>'
 head=f'<g id="{id}-head" transform="rotate({tilt} 0 -215)">{hair}{faceart}</g>' if face else f'<ellipse cx="0" cy="-284" rx="68" ry="81" fill="{color}" stroke="{INK}" stroke-width="6"/>'
 return f'<g id="{id}" transform="translate({x} {y}) scale({s})">{legs}{torso}{left}{right}{head}</g>'
def crowd():
 out=''
 for i,(x,y,s) in enumerate([(68,875,.95),(1008,840,1.1),(248,725,.8),(812,704,.85),(380,575,.7),(660,555,.7),(540,467,.6),(40,540,.62),(1050,510,.63),(176,1100,1.2),(920,1100,1.25)]):
  out+=person(x,y,s,pose='calm',color=['#82969b','#a1a9a6','#6d828e'][i%3],id=f'crowd-{i}',face=False)
 return out

def phone(x=247,y=402,w=586,h=940):
 return rect(x,y,w,h,'#ecede5',52,INK,12)+rect(x+18,y+19,w-36,111,INK,32,INK,0)+text(x+w/2,y+90,'친구',42,CREAM,'middle')+f'<circle cx="{x+w-64}" cy="{y+67}" r="9" fill="{Y}"/>'+rect(x+25,y+h-126,w-50,93,'#fffaf0',28,'#bdc7c1',3)+text(x+49,y+h-66,'메시지',30,'#84958e')
def calendar():
 out=rect(175,495,730,718,CREAM,32)+rect(175,495,730,113,TEAL,32)+text(540,573,'내 일정',53,INK,'middle')
 for col in range(6):
  for row in range(4):out+=rect(212+col*111,647+row*122,92,100,'#f9f5e8',10,'#c2c4b5',2)
 for j,(x,y) in enumerate([(220,657),(553,657),(331,779),(664,901),(220,1023)]):out+=rect(x,y,83,82,['#b3c5c3',ORANGE,'#d3cfae'][j%3],10,INK,2)
 out+=rect(441,897,93,100,Y,10,INK,4)+text(487,964,'?',51,INK,'middle')
 return out

def make(beat):
 common='<path d="M0 1370H1080" stroke="#c5c8b8" stroke-width="6"/><ellipse cx="540" cy="1400" rx="350" ry="40" fill="#d3d6c7"/>'
 if beat==1:
  return crowd()+person(540,1133,1.06,'tired',id='hero')+bubble(555,419,430,130,['이것도 부탁해!'],Y,36,id='ping')+bubble(75,526,342,135,['잠깐만 도와줘'],CREAM,31,id='ping2')+bubble(668,797,310,120,['오늘 가능해?'],CREAM,32,id='ping3')+rect(330,1335,420,105,INK,28)+text(540,1405,'응…',65,Y,'middle')
 if beat==2:
  return common+person(538,1109,1.15,'tired')+bubble(105,380,870,238,['거절하면…','나를 싫어할까?'],CREAM,59,id='thought')+f'<path d="M540 640v102" stroke="{INK}" stroke-width="5" stroke-dasharray="12 14"/>'
 if beat==3:
  out=rect(125,443,830,615,CREAM,36)+rect(125,443,830,115,TEAL,36)+text(540,525,'즐거운 모임의 초대',48,INK,'middle')
  out+=person(350,1089,.76,'calm',color=ORANGE,id='invitee')+person(751,1089,.76,'calm',color=TEAL,id='inviter')+bubble(548,683,345,142,['같이 갈래?'],Y,43,id='invite')
  return out+rect(149,1294,781,106,INK,22)+text(540,1365,'연구의 범위: 즐거운 사회활동 초대',32,Y,'middle')
 if beat==4:
  return common+person(305,1154,.87,'tired',id='worried')+person(824,1154,.87,'calm',color=TEAL,id='friend')+bubble(80,405,740,255,['엄청 실망하겠지…'],CREAM,51,id='expected')+text(125,375,'내가 예상한 반응',34,INK)+bubble(635,855,365,140,['알겠어.'],Y,50,id='response')+text(540,1455,'반응의 시각적 비유',25,INK,'middle')
 if beat==5:
  return person(540,1126,1.05,'calm')+f'<circle id="boundary" cx="540" cy="1070" r="355" fill="none" stroke="{INK}" stroke-width="8" stroke-dasharray="14 20"/>'+bubble(80,405,920,170,['모든 관계가 같지는 않다'],Y,54,id='caution')+text(540,1470,'상황·관계·안전을 함께 생각해요',36,INK,'middle')
 if beat==6:
  out=person(335,1107,1.02,'calm',id='hero')+person(790,1210,.9,'calm',color=TEAL,id='friend')
  out+=rect(520,501,430,345,CREAM,26)+text(735,572,'작은 부탁부터',49,INK,'middle')
  for j,s in enumerate(['한 번에 하나씩','짧은 말로','무리하지 않게']):out+=f'<circle cx="570" cy="{639+j*78}" r="13" fill="{Y}" stroke="{INK}" stroke-width="4"/>'+text(607,651+j*78,s,33)
  return out
 if beat==7:
  return phone()+bubble(296,637,480,218,['오늘 이것도','해줄래?'],CREAM,52,id='request')+rect(509,1122,273,99,Y,22)+text(644,1189,'응',61,INK,'middle')+text(540,1425,'늘 하던 답이 떠오르는 순간',37,INK,'middle')
 if beat==8:
  return phone()+bubble(296,607,480,179,['오늘 이것도 해줄래?'],CREAM,36,id='request')+bubble(320,882,455,223,['일정 보고','답할게.'],Y,58,id='reply')+text(540,1425,'즉답 대신, 잠깐의 여유',37,INK,'middle')
 if beat==9:
  return common+person(333,1158,1.08,'pause')+rect(582,566,367,412,CREAM,30)+text(765,646,'잠깐 확인',47,INK,'middle')+f'<g id="pause-symbol"><rect x="673" y="726" width="57" height="144" rx="7" fill="{INK}"/><rect x="787" y="726" width="57" height="144" rx="7" fill="{INK}"/></g>'+text(760,1067,'수락 버튼을 누르기 전에',30,INK,'middle')
 if beat==10:
  return calendar()+bubble(188,1245,704,138,['시간도, 여유도 괜찮을까?'],Y,43,id='check')+f'<g id="clock"><circle cx="890" cy="464" r="95" fill="{Y}" stroke="{INK}" stroke-width="7"/><path d="M890 404V464L927 488" stroke="{INK}" stroke-width="9" fill="none" stroke-linecap="round"/></g>'
 if beat==11:
  return common+person(402,1148,1.17,'pause')+bubble(425,480,580,252,['오늘은','맡기 어려워.'],Y,61,id='no')+text(712,873,'짧고 분명하게',40,INK,'middle')
 if beat==12:
  return person(499,1173,1.05,'pause')+bubble(73,433,350,137,['한 번만?'],CREAM,43,id='ask1')+bubble(692,573,320,137,['잠깐이면 돼'],CREAM,35,id='ask2')+bubble(74,798,340,137,['그래도 안 될까?'],CREAM,31,id='ask3')+bubble(380,1129,620,213,['오늘은 맡기 어려워.'],Y,45,id='steady')
 if beat==13:
  return common+person(310,1170,1,'help')+person(821,1210,.82,'calm',color=TEAL,id='friend')+bubble(120,429,840,170,['도울 여유가 있다면'],Y,54,id='optional')+rect(582,640,371,220,CREAM,27)+text(765,716,'가능한 범위',43,INK,'middle')+text(765,790,'내가 정할 수 있어요',30,INK,'middle')+text(765,900,'선택사항',31,INK,'middle')
 if beat==14:
  return rect(133,438,814,832,CREAM,44)+text(540,530,'도울 수 있는 만큼만',49,INK,'middle')+f'<g id="ten-clock"><circle cx="540" cy="855" r="230" fill="{Y}" stroke="{INK}" stroke-width="9"/><path d="M540 655v48M733 745l-39 24M733 965l-39-24M540 1055v-48M347 965l39-24M347 745l39 24" stroke="{INK}" stroke-width="11" fill="none" stroke-linecap="round"/></g>'+text(540,886,'10분',100,INK,'middle')+text(540,1194,'“전부는 어렵고, 이만큼은 가능해.”',33,INK,'middle')+text(540,1390,'도울 마음과 여유가 있을 때만',34,INK,'middle')
 if beat==15:
  return crowd()+f'<ellipse id="space" cx="540" cy="1331" rx="245" ry="85" fill="{Y}" stroke="{INK}" stroke-width="7"/>'+person(540,1112,1.07,'calm')+bubble(95,399,890,220,['일정 보고 답할게.'],Y,65,id='last-reply')+text(540,1453,'자동 수락 대신, 내 일정부터.',39,INK,'middle')

for i in range(1,16):
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1530" viewBox="0 0 1080 1530"><defs><pattern id="paper" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="4" cy="8" r="1" fill="#172538" opacity=".065"/></pattern></defs><rect width="1080" height="1530" fill="{CREAM}"/><rect width="1080" height="1530" fill="url(#paper)"/><style>text{{font-family:Korean,sans-serif}}path{{stroke-linejoin:round;stroke-linecap:round}}</style>{make(i)}</svg>'
 (P/'assets/illustrations'/f'beat-{i:02d}.svg').write_text(svg)
# Thumbnail is original SVG, not a third-party or medical image.
thumb=f'<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill="{INK}"/><style>text{{font-family:Korean,sans-serif}}path{{stroke-linejoin:round;stroke-linecap:round}}</style><g transform="translate(0 220)"><rect y="160" width="1080" height="1260" fill="#aebbb2"/>{crowd()}<ellipse cx="540" cy="1370" rx="235" ry="72" fill="{Y}"/>{person(540,1133,1.12,"tired",id="thumb-hero")}{bubble(664,455,346,146,["부탁 하나만…"],CREAM,33)}{bubble(30,578,348,135,["오늘 가능해?"],CREAM,35)}</g><rect x="0" y="0" width="1080" height="440" fill="{INK}"/>{text(70,181,"싫은데",146,Y)}{text(70,365,"또 ‘응’?",146,Y)}<rect y="1660" width="1080" height="260" fill="{INK}"/>{text(540,1772,"자동 수락을 멈추는 한 문장",47,CREAM,"middle")}{text(540,1850,"일정 보고 답할게.",58,Y,"middle")}</svg>'
(P/'assets/illustrations/thumbnail.svg').write_text(thumb)
print('Authored15 original editorial SVG scenes plus thumbnail.')

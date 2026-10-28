#!/usr/bin/env python3
"""Render a source-backed navigation diagram. This is not a game screenshot."""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
data=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./app/world.js').definition))"],cwd=root))
image=Image.new('RGB',(1400,1120),'#0b1018');d=ImageDraw.Draw(image)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
f=lambda n,b=False:ImageFont.truetype(bold if b else font,n)
d.text((50,32),'DEAD FREIGHT / BLACK PINES',font=f(34,True),fill='#e3e8eb')
d.text((52,81),'0.6  ·  Connected extraction region  ·  340 × 340 m',font=f(19),fill='#aebdcb')
left,top,size=50,144,906
pos=lambda x,z:(left+(x+170)/340*size,top+(z+170)/340*size)
d.rectangle((left,top,left+size,top+size),fill='#111b26',outline='#5b6a7b',width=2)
for val in range(-150,151,50):
 x,y=pos(val,val);d.line((x,top,x,top+size),fill='#1d2a38');d.line((left,y,left+size,y),fill='#1d2a38')
for tree in data['trees']:
 x,y=pos(tree['x'],tree['z']);r=tree['crown']*size/340;d.ellipse((x-r,y-r,x+r,y+r),fill='#243442')
for route in data['routes']:
 points=[pos(p['x'],p['z']) for p in route['points']];d.line(points,fill='#718295',width=max(3,round(route['width']*size/340)),joint='curve')
for wall in data['walls']:
 if wall['kind'] in ('trunk','boundary'):continue
 x,y=pos(wall['x']-wall['w']/2,wall['z']-wall['d']/2);xx,yy=pos(wall['x']+wall['w']/2,wall['z']+wall['d']/2)
 d.rectangle((x,y,xx,yy),fill='#b9c2c8' if wall['kind'] in ('steel','concrete') else '#8a7569',outline='#151d29')
for item in data['pickups']:
 if item['type']=='barrel':continue
 x,y=pos(item['x'],item['z']);r=4 if item['type']=='cargo' else 2;d.rectangle((x-r,y-r,x+r,y+r),fill='#d9c28f' if item['type']=='cargo' else '#cbd9df')
for enemy in data['enemies']:
 x,y=pos(enemy['x'],enemy['z']);r=6 if enemy['boss'] else 3;d.ellipse((x-r,y-r,x+r,y+r),fill='#da8e9e')
for ex in data['extractionZones']:
 x,y=pos(ex['x'],ex['z']);r=ex['radius']*size/340;d.ellipse((x-r,y-r,x+r,y+r),outline='#a2d6cc',width=3)
for number,landmark in enumerate(data['landmarks']):
 x,y=pos(landmark['x'],landmark['z']);txt=f"{number+1:02d} {landmark['short']}";bounds=d.textbbox((0,0),txt,font=f(15,True));tw=bounds[2]+14;yy=y-58
 d.rectangle((x-tw/2,yy-4,x+tw/2,yy+24),fill='#0c131ded',outline='#7f92a2')
 d.text((x-tw/2+7,yy),txt,font=f(15,True),fill='#ecf0f2')
x,y=pos(data['spawn']['x'],data['spawn']['z']);d.polygon([(x,y-9),(x-7,y+6),(x+7,y+6)],fill='white')
d.text((73,164),'N ↑',font=f(21,True),fill='#f2f3ef')
rx=998
def line(text,y,n=19,color='#c6d0da',b=False):d.text((rx,y),text,font=f(n,b),fill=color)
line('CHOOSE YOUR ROUTE',160,19,'#e5eaed',True)
for y,title,copy in [(212,'01  South LZ','Insertion, supplies, practice'),(292,'02  Timber camp','Breachable logs, supply hut'),(372,'03  Freight depot','Cargo lanes, gantry cover'),(452,'04  Stone quarry','Rock routes, valuable salvage'),(532,'05  North relay','Contract target, bounty token')]:
 line(title,y,20,'#dfe6eb',True);line(copy,y+31,15)
line('EXTRACTION LOOP',633,19,'#e5eaed',True)
for i,t in enumerate(['Scout and gather supplies.','Eliminate the relay target.','Recover its bounty token.','Reach either extraction site.','Send E signal; hold for 6 s.','Leaving cancels the pickup.']):line(t,674+i*30,17)
line('○  Two extraction sites',886,17,'#a2d6cc')
line('●  Encounter / target',918,17,'#da8e9e')
line('■  Optional cargo',950,17,'#d9c28f')
line('340 m across · 0.116 km²',998,17)
d.text((51,1075),'SOURCE-DATA NAVIGATION DIAGRAM · NOT A GAMEPLAY SCREENSHOT · Browser/WebGL acceptance pending',font=f(15),fill='#96a8b9')
out=root/'assets/diagnostics/region-layout-0.6.png';image.save(out);print(out)

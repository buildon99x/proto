// Deterministic offscreen scene review. This does not execute browser controls,
// quests or combat, and the reused citadel environment is temporary outdoors.
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {ART} from '../src/art.js';
import {createVisualRenderer,projectWorld,ISO} from '../src/visual.js';
import {createCampaignLevel} from '../src/campaign/levels.js';
import {WORLD_CONTENT} from '../src/campaign/world-content.js';
const {createCanvas,loadImage,GlobalFonts}=createRequire(import.meta.url)('@napi-rs/canvas');
GlobalFonts.registerFromPath(new URL('../../assets/fonts/EmberwatchKorean-Regular.otf',import.meta.url).pathname,'EmberwatchKorean');
const output=new URL('../../assets/screenshots/campaign-spaces/',import.meta.url);await mkdir(output,{recursive:true});
const images={motion:{hero:await loadImage(new URL('../src/assets/motion-hero.png',import.meta.url).pathname)}};
for(const key of ['environment','hero','enemy'])images[key]=await loadImage(new URL('../src/'+ART[key].file,import.meta.url).pathname);
const scenes=[['ash_hamlet','hamlet_square','화로와 마을의 다섯 역할'],['pine_reach','pine_canal','도구를 얻은 뒤 돌아오는 수로'],['sunken_hall_2','water_valves','수문 퍼즐과 귀환 지름길']];
const width=1280,height=800,contact=createCanvas(1280,3*800),contactContext=contact.getContext('2d');
for(let index=0;index<scenes.length;index++){
 const [regionId,nodeId,subtitle]=scenes[index],map=createCampaignLevel(regionId),p={...map.anchors[nodeId],x:map.anchors[nodeId].x-50,hp:55,mana:40,angle:.5,classId:'warrior',walk:0};
 const canvas=createCanvas(width,height),ctx=canvas.getContext('2d'),renderer=createVisualRenderer(ctx,ART,images,{createCanvas});
 const objects=[];for(const room of map.rooms){objects.push({type:'torch',x:(room.x+1.5)*32,y:(room.y+1.5)*32});objects.push({type:'torch',x:(room.x+room.w-2)*32,y:(room.y+room.h-2)*32});}
 for(const interaction of WORLD_CONTENT.interactions.filter(item=>map.anchors[item.nodeId])){const a=map.anchors[interaction.nodeId];objects.push({type:interaction.kind==='chest'?'chest':interaction.kind==='clue'?'shrine':'exit',x:a.x+64,y:a.y,open:false,used:false});}
 if(regionId==='ash_hamlet'){for(const [i,npc]of WORLD_CONTENT.npcs.filter(n=>n.nodeId===nodeId).entries())objects.push({type:'shrine',x:p.x-190+i*78,y:p.y-145});objects.push({type:'torch',x:p.x+65,y:p.y+65});}
 renderer.render({width,height,map,p,objects,entities:[],shots:[],effects:[],loot:[],floaters:[],time:3,stats:{hp:55,mana:40},classId:'warrior',cleanView:true});
 ctx.fillStyle='#111827e8';ctx.fillRect(0,0,width,94);ctx.fillStyle='#e9d0a4';ctx.font='bold 25px EmberwatchKorean';ctx.fillText(WORLD_CONTENT.regions.find(r=>r.id===regionId).name,32,40);ctx.fillStyle='#aebfbd';ctx.font='16px EmberwatchKorean';ctx.fillText(subtitle,32,72);ctx.textAlign='right';ctx.font='13px EmberwatchKorean';ctx.fillText('캠페인 공간 검토 · 오프스크린 렌더',width-28,35);ctx.fillStyle='#caaf91';ctx.fillText('전투·상호작용 미연결 / 야외 환경 아트 임시',width-28,62);ctx.textAlign='left';
 const mx=1000,my=548,scale=Math.min(236/map.w,206/map.h);ctx.fillStyle='#101722ed';ctx.fillRect(mx-16,my-40,280,280);ctx.fillStyle='#d5c49f';ctx.font='14px EmberwatchKorean';ctx.fillText('손제작 지역 지도',mx,my-15);
 for(let y=0;y<map.h;y++)for(let x=0;x<map.w;x++)if(map.tiles[y][x]){ctx.fillStyle='#466564';ctx.fillRect(mx+x*scale,my+y*scale,scale+.2,scale+.2);}
 for(const room of map.rooms){const a=map.anchors[room.id];ctx.fillStyle=room.id===nodeId?'#efc88c':'#83c1bb';ctx.beginPath();ctx.arc(mx+a.x/32*scale,my+a.y/32*scale,3,0,Math.PI*2);ctx.fill();}
 const a=projectWorld(p.x,p.y),anchor=map.anchors[nodeId],b=projectWorld(anchor.x+64,anchor.y);ctx.fillStyle='#101722dd';ctx.fillRect(width/2+(b.x-a.x)*ISO.zoom-96,height*.55+(b.y-a.y)*ISO.zoom-77,192,30);ctx.fillStyle='#efc88c';ctx.textAlign='center';ctx.font='14px EmberwatchKorean';ctx.fillText(WORLD_CONTENT.nodes.find(n=>n.id===nodeId).name,width/2+(b.x-a.x)*ISO.zoom,height*.55+(b.y-a.y)*ISO.zoom-56);ctx.textAlign='left';
 await writeFile(new URL(`${regionId}.png`,output),canvas.toBuffer('image/png'));contactContext.drawImage(canvas,0,index*800);
}
await writeFile(new URL('campaign-spaces-review.png',output),contact.toBuffer('image/png'));console.log(new URL('campaign-spaces-review.png',output).pathname);

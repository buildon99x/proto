// Deterministic renderer evidence, NOT a browser screenshot or a gameplay test.
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {ART} from '../src/art.js';import {createVisualRenderer,projectWorld,screenToWorld,screenMovement,spriteDirection} from '../src/visual.js';import {createMap} from '../src/data.js';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
const output=new URL('../../assets/screenshots/visual-0.3.0/',import.meta.url);
const images={};for(const key of ['environment','hero','enemy'])images[key]=await loadImage(new URL('../src/'+ART[key].file,import.meta.url).pathname);
const map=createMap(803214,2,2),room=map.rooms[5],p={x:(room.cx+.5)*32,y:(room.cy+.5)*32,angle:.7,hp:150,mana:80,attack:0,walk:0,invuln:0,moving:false},seen=Array.from({length:map.h},(_,y)=>Array.from({length:map.w},(_,x)=>Math.hypot(x-p.x/32,y-p.y/32)<17));
const objects=[];for(const r of map.rooms){objects.push({type:'torch',x:(r.x+1)*32,y:(r.y+1)*32},{type:'torch',x:(r.x+r.w-2)*32,y:(r.y+1)*32});if(r.index%3===1)objects.push({type:'chest',x:(r.cx+2)*32,y:r.cy*32});if(r.index%3===2)objects.push({type:'barrel',x:(r.x+2)*32,y:(r.y+r.h-2)*32});}
objects.push({type:'shrine',x:p.x-160,y:p.y-40},{type:'relic',x:p.x+65,y:p.y-140},{type:'exit',x:p.x+210,y:p.y+120});
const entities=[{type:'skeleton',x:p.x+150,y:p.y+30,hp:65,max:65,angle:-2.2,walk:1,state:'idle',active:true},{type:'knight',x:p.x-110,y:p.y+160,hp:90,max:90,angle:-.7,walk:0,state:'idle',active:true}];
const state={map,p,objects,entities,seen,shots:[],effects:[],floaters:[],loot:[],time:3.5,shake:0,stats:{hp:150,mana:80},cleanView:true};
fs.mkdirSync(output,{recursive:true});for(const [name,width,height] of [['portrait',736,1313],['landscape',1280,800]]){let c=createCanvas(width,height),r=createVisualRenderer(c.getContext('2d'),ART,images);let metrics=r.render({...state,width,height});fs.writeFileSync(new URL(`renderer-${name}.png`,output),c.toBuffer('image/png'));console.log(name,metrics);}
let sheet=createCanvas(720,420),sctx=sheet.getContext('2d');sctx.fillStyle='#20243a';sctx.fillRect(0,0,720,420);for(let row=0;row<4;row++)for(let col=0;col<4;col++){let r=ART.hero.frames[row*4+col],k=.30,x=80+col*170,y=90+row*100;sctx.strokeStyle='#536874';sctx.beginPath();sctx.moveTo(x-50,y);sctx.lineTo(x+50,y);sctx.stroke();sctx.drawImage(images.hero,r.x,r.y,r.w,r.h,x-r.ax*k,y-r.ay*k,r.w*k,r.h*k);}fs.writeFileSync(new URL('hero-anchor-check.png',output),sheet.toBuffer('image/png'));

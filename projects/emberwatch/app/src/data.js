export const CLASSES = [
{id:'warrior',name:'Warrior',glyph:'⚔',color:'#bd735b',hp:150,mana:70,damage:19,speed:158,range:65,rate:.42,kind:'melee',q:'Whirling Axes',e:'War Cry',desc:'A relentless frontline fighter. Sweeping strikes and crushing shockwaves.',specs:['Berserker','Sentinel','Warlord']},
{id:'paladin',name:'Paladin',glyph:'✧',color:'#d4bf79',hp:165,mana:85,damage:17,speed:146,range:60,rate:.48,kind:'melee',q:'Consecration',e:'Judgment',desc:'An armored protector. Healing light and a radiant hammer.',specs:['Templar','Crusader','Lightbringer']},
{id:'ranger',name:'Ranger',glyph:'➶',color:'#8eac79',hp:110,mana:85,damage:17,speed:177,range:410,rate:.4,kind:'arrow',q:'Volley',e:'Snarefield',desc:'A nimble hunter. Long-range arrows, piercing volleys and slowing traps.',specs:['Marksman','Pathfinder','Beastkeeper']},
{id:'wizard',name:'Wizard',glyph:'✦',color:'#8a9bca',hp:95,mana:130,damage:23,speed:155,range:360,rate:.58,kind:'fire',q:'Frost Nova',e:'Meteor',desc:'A master of the elements. Explosive fire and crowd-controlling frost.',specs:['Pyromancer','Cryomancer','Arcanist']},
{id:'rogue',name:'Rogue',glyph:'†',color:'#ac86af',hp:105,mana:80,damage:16,speed:194,range:56,rate:.27,kind:'melee',q:'Fan of Knives',e:'Shadowstep',desc:'Fast blades and lethal precision. Unlocked by defeating the first guardian.',specs:['Assassin','Duelist','Shadow'],unlock:1},
{id:'warlock',name:'Warlock',glyph:'☽',color:'#87b0a0',hp:115,mana:115,damage:21,speed:158,range:330,rate:.52,kind:'soul',q:'Soul Harvest',e:'Plague',desc:'A wielder of dark magic. Drain enemies and spread corruption.',specs:['Necromancer','Hexblade','Reaper'],unlock:2},
{id:'sorcerer',name:'Sorcerer',glyph:'ϟ',color:'#7ebed0',hp:100,mana:130,damage:18,speed:168,range:380,rate:.39,kind:'spark',q:'Chain Lightning',e:'Thunderstorm',desc:'Storms made flesh. Chaining bolts and sustained lightning.',specs:['Stormcaller','Invoker','Tempest'],unlock:3}
];
export const BIOMES=[
{name:'Pinewild',sub:'The forgotten road',floor:'#303d32',alt:'#354337',wall:'#28332c',top:'#435540',light:'#eec080',enemy:['rat','bandit','archer'],resource:'wood',boss:'The Thornwarden',bossColor:'#9f9a58'},
{name:'Sunken Vaults',sub:'Beneath the old abbey',floor:'#343b44',alt:'#39424c',wall:'#222934',top:'#566075',light:'#75c4c5',enemy:['skeleton','archer','mage'],resource:'stone',boss:'The Bellkeeper',bossColor:'#929ec0'},
{name:'Ember Citadel',sub:'At the heart of the hollow crown',floor:'#403139',alt:'#4a373c',wall:'#28232e',top:'#6e4e58',light:'#ea8a57',enemy:['knight','mage','imp'],resource:'iron',boss:'The Hollow King',bossColor:'#c67861'}
];
export const RELICS=[
{id:'fang',name:'Wolf Fang',text:'+20% attack damage',stat:'damage',value:.2},
{id:'heart',name:'Amber Heart',text:'+35 maximum health; restores 35 health',stat:'hp',value:35},
{id:'boots',name:'Windstep Thread',text:'+15% movement speed',stat:'speed',value:.15},
{id:'eye',name:'Hawk Eye',text:'+12% critical chance',stat:'crit',value:.12},
{id:'vial',name:'Sanguine Vial',text:'Restore 2 health on every kill',stat:'lifekill',value:2},
{id:'hourglass',name:'Cracked Hourglass',text:'Skills recover 20% faster',stat:'cooldown',value:.2},
{id:'crystal',name:'Azure Crystal',text:'+35 mana and +2 mana regeneration',stat:'mana',value:35},
{id:'coin',name:'Prospector’s Coin',text:'+40% gold collected',stat:'gold',value:.4},
{id:'thorn',name:'Briar Crown',text:'Damage nearby enemies when hit',stat:'thorns',value:14},
{id:'flame',name:'Kindled Ember',text:'Attacks burn enemies for 3 seconds',stat:'burn',value:4},
{id:'ice',name:'Winterglass',text:'Attacks slow enemies by 35%',stat:'slow',value:.35},
{id:'wing',name:'Mothwing Cloak',text:'Dodge recharges 30% faster',stat:'dodge',value:.3},
{id:'shield',name:'Stone Sigil',text:'+4 armor',stat:'armor',value:4},
{id:'echo',name:'Echo Bell',text:'+25% attack speed',stat:'haste',value:.25},
{id:'star',name:'Fallen Star',text:'+35% ability damage',stat:'spell',value:.35},
{id:'phoenix',name:'Phoenix Feather',text:'Survive one lethal hit at half health',stat:'revive',value:1},
{id:'magnet',name:'Lodestone',text:'Draw loot from much farther away',stat:'magnet',value:100},
{id:'venom',name:'Mossfang',text:'Critical hits deal 3× damage',stat:'critpower',value:1}
];
export const BUILDINGS=[
{id:'training',name:'Training Grounds',icon:'⚔',text:'Unlock the next skill rank: tiers 3, 4, then 5',max:3,cost:45,wood:3,stone:2},
{id:'guild',name:'Guild Hall',icon:'⌂',text:'Unlock higher upgrade tiers and specializations',max:3,cost:70,wood:6,stone:3},
{id:'forge',name:'Blacksmith',icon:'⚒',text:'+8% permanent attack damage per level',max:6,cost:55,wood:2,stone:5},
{id:'chapel',name:'Chapel',icon:'✧',text:'+15 maximum health and 5% less revival loss per level',max:6,cost:50,wood:5,stone:2},
{id:'apothecary',name:'Apothecary',icon:'⚗',text:'Stronger potions; +1 potion at level 2 and 4',max:4,cost:65,wood:4,stone:2},
{id:'enchanter',name:'Enchanter',icon:'✦',text:'+10 mana and +5% skill damage per level',max:5,cost:65,wood:3,stone:4},
{id:'treasury',name:'Treasury',icon:'◈',text:'Protect 2.5% more carried resources on death',max:5,cost:75,wood:4,stone:4}
];
export const GEAR_NAMES={weapon:['Iron edge','Ashwood staff','Hunter’s oath','Dusk blade','Emberfang','Kingsbane'],armor:['Padded coat','Scale hauberk','Pilgrim’s vest','Warden plate','Runic mantle','Crownward'],charm:['Copper token','Moonstone','Amber seal','Raven charm','Cinder jewel','Dawnstone']};
export function seeded(seed){let a=seed|0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function createLegacyMap(seed,floor){const rand=seeded(seed+floor*731),w=65,h=49,tiles=Array.from({length:h},()=>Array(w).fill(0)),rooms=[];
 const carve=(x,y,rw,rh)=>{for(let j=y;j<y+rh;j++)for(let i=x;i<x+rw;i++)tiles[j][i]=1;};
 for(let gy=0;gy<3;gy++)for(let gx=0;gx<4;gx++){let rw=9+Math.floor(rand()*4),rh=9+Math.floor(rand()*3),x=3+gx*15+Math.floor(rand()*3),y=3+gy*15+Math.floor(rand()*3);let r={x,y,w:rw,h:rh,cx:x+Math.floor(rw/2),cy:y+Math.floor(rh/2),index:rooms.length};carve(x,y,rw,rh);rooms.push(r);}
 for(let n=1;n<rooms.length;n++){let a=rooms[n-1],b=rooms[n];if(n%4===0)a=rooms[n-4];for(let x=Math.min(a.cx,b.cx);x<=Math.max(a.cx,b.cx);x++)carve(x,a.cy-1,1,3);for(let y=Math.min(a.cy,b.cy);y<=Math.max(a.cy,b.cy);y++)carve(b.cx-1,y,3,1);}
 // Extra cross-links allow flanking and prevent single-path mazes.
 for(let n=0;n<8;n++){let a=rooms[n],b=rooms[n+4];if(rand()<.55)for(let y=a.cy;y<=b.cy;y++)carve(a.cx-1,y,3,1);}
 const boss=floor%2===1; if(boss){let b=rooms[11];carve(b.x-1,b.y-1,b.w+2,b.h+2);}
 return {w,h,tiles,rooms,seed,boss};}
export function defaultSave(){return {version:1,classId:'warrior',gold:0,wood:0,stone:0,iron:0,buildings:{guild:0,forge:0,chapel:0,apothecary:0,enchanter:0,treasury:0},heroes:{},gear:[],equipped:{weapon:null,armor:null,charm:null},bosses:0,wins:0,runs:0,totalKills:0,bestFloor:0,settings:{sound:false,reduced:false},run:null};}
export function sanitizeSave(raw){const base=defaultSave();if(!raw||raw.version!==1)return base;return {...base,...raw,buildings:{...base.buildings,...raw.buildings},settings:{...base.settings,...raw.settings},equipped:{...base.equipped,...raw.equipped},heroes:raw.heroes||{},gear:Array.isArray(raw.gear)?raw.gear:[]};}

export function createMap(seed,floor,version=2){if(version===1)return createLegacyMap(seed,floor);const rand=seeded(seed+floor*9173),w=65,h=49,tiles=Array.from({length:h},()=>Array(w).fill(0)),rooms=[],layout=['Braided woodland','Broken ring','Forked cloisters','Flooded crypt','Siege halls','Crownward maze'][floor%6];
 const carve=(x,y,rw,rh)=>{for(let j=Math.max(1,y);j<Math.min(h-1,y+rh);j++)for(let i=Math.max(1,x);i<Math.min(w-1,x+rw);i++)tiles[j][i]=1;};
 for(let gy=0;gy<3;gy++)for(let gx=0;gx<4;gx++){let rw=8+Math.floor(rand()*6),rh=7+Math.floor(rand()*6),x=2+gx*15+Math.floor(rand()*3),y=2+gy*15+Math.floor(rand()*3),r={x,y,w:rw,h:rh,cx:x+Math.floor(rw/2),cy:y+Math.floor(rh/2),index:rooms.length,kind:['patrol','swarm','ambush','cache','elite'][Math.floor(rand()*5)]};carve(x,y,rw,rh);if(floor<2){for(let yy=y;yy<y+rh;yy++)for(let xx=x;xx<x+rw;xx++)if((xx===x||xx===x+rw-1)&&(yy<y+2||yy>y+rh-3))tiles[yy][xx]=0;}else if(r.index>0&&r.index!==11&&rw>10&&rh>9){for(let [px,py] of [[x+2,y+2],[x+rw-3,y+rh-3]])tiles[py][px]=0;}rooms.push(r);}
 const neighbors=i=>[i%4?i-1:-1,i%4<3?i+1:-1,i>=4?i-4:-1,i<8?i+4:-1].filter(i=>i>=0),visited=new Set([0]),stack=[0],edges=[],connected=new Set();
 const link=(a,b)=>{let key=[a,b].sort((a,b)=>a-b).join(':');if(connected.has(key))return;connected.add(key);edges.push([a,b]);};
 while(stack.length){let a=stack.at(-1),opts=neighbors(a).filter(i=>!visited.has(i));if(!opts.length){stack.pop();continue;}let b=opts[Math.floor(rand()*opts.length)];link(a,b);visited.add(b);stack.push(b);}
 // Woodland is braided; crypt is a tight maze; citadel has long crossing halls.
 let chance=floor===0?.65:floor===1?.5:floor===3?.08:.28;for(let a=0;a<12;a++)for(let b of neighbors(a))if(rand()<chance)link(a,b);
 for(let [a,b] of edges){let r=rooms[a],q=rooms[b],width=floor===3?2:floor===4?4:3,offset=Math.floor(width/2);if(rand()<.5){for(let x=Math.min(r.cx,q.cx);x<=Math.max(r.cx,q.cx);x++)carve(x,r.cy-offset,1,width);for(let y=Math.min(r.cy,q.cy);y<=Math.max(r.cy,q.cy);y++)carve(q.cx-offset,y,width,1);}else{for(let y=Math.min(r.cy,q.cy);y<=Math.max(r.cy,q.cy);y++)carve(r.cx-offset,y,width,1);for(let x=Math.min(r.cx,q.cx);x<=Math.max(r.cx,q.cx);x++)carve(x,q.cy-offset,1,width);}}
 const boss=floor%2===1;if(boss){let r=rooms[11];carve(r.x-1,r.y-1,r.w+2,r.h+2);}return {w,h,tiles,rooms,seed,boss,layout,edges};}

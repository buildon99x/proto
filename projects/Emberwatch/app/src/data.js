export const CLASSES = [
{id:'warrior',name:'전사',glyph:'⚔',color:'#bd735b',hp:150,mana:70,damage:19,speed:158,range:65,rate:.42,kind:'melee',q:'회전 도끼',e:'전장의 함성',desc:'최전선을 지키는 불굴의 전사. 넓게 휘두르는 무기와 강력한 충격파로 적을 제압합니다.',specs:['광전사','수호자','전쟁군주']},
{id:'paladin',name:'성기사',glyph:'✧',color:'#d4bf79',hp:165,mana:85,damage:17,speed:146,range:60,rate:.48,kind:'melee',q:'신성한 터전',e:'심판',desc:'갑옷을 두른 수호자. 치유의 빛으로 버티며 빛나는 망치로 적을 심판합니다.',specs:['성당 기사','성전사','빛의 인도자']},
{id:'ranger',name:'사냥꾼',glyph:'➶',color:'#8eac79',hp:110,mana:85,damage:17,speed:177,range:410,rate:.4,kind:'arrow',q:'일제 사격',e:'덫 지대',desc:'민첩한 사냥꾼. 멀리서 관통 화살을 쏘고 덫으로 적의 발을 묶습니다.',specs:['명사수','길잡이','야수지기']},
{id:'wizard',name:'마법사',glyph:'✦',color:'#8a9bca',hp:95,mana:130,damage:23,speed:155,range:360,rate:.58,kind:'fire',q:'서리 폭발',e:'유성 낙하',desc:'원소를 다루는 마법사. 폭발하는 불꽃과 차가운 서리로 몰려드는 적을 제압합니다.',specs:['화염술사','빙결술사','비전술사']},
{id:'rogue',name:'도적',glyph:'†',color:'#ac86af',hp:105,mana:80,damage:16,speed:194,range:56,rate:.27,kind:'melee',q:'칼날 난사',e:'그림자 걸음',desc:'빠른 칼날과 치명적인 일격. 첫 번째 수호자를 쓰러뜨리면 해금됩니다.',specs:['암살자','결투가','그림자'],unlock:1},
{id:'warlock',name:'흑마법사',glyph:'☽',color:'#87b0a0',hp:115,mana:115,damage:21,speed:158,range:330,rate:.52,kind:'soul',q:'영혼 수확',e:'역병',desc:'어둠의 힘을 다루는 마법사. 적의 생명력을 흡수하고 부패를 퍼뜨립니다.',specs:['강령술사','저주검사','사신'],unlock:2},
{id:'sorcerer',name:'마도사',glyph:'ϟ',color:'#7ebed0',hp:100,mana:130,damage:18,speed:168,range:380,rate:.39,kind:'spark',q:'연쇄 번개',e:'뇌우',desc:'폭풍을 품은 마도사. 적을 타고 흐르는 번개와 거센 뇌우를 불러냅니다.',specs:['폭풍 소환사','기원술사','폭풍의 화신'],unlock:3}
];
export const BIOMES=[
{name:'솔바람 숲',sub:'잊힌 길',floor:'#514d34',alt:'#585136',wall:'#2e3130',top:'#646050',light:'#eec080',enemy:['rat','bandit','archer'],resource:'wood',boss:'가시 수호자',bossColor:'#9f9a58'},
{name:'침수된 지하전당',sub:'옛 수도원 아래',floor:'#343b44',alt:'#39424c',wall:'#222934',top:'#566075',light:'#75c4c5',enemy:['skeleton','archer','mage'],resource:'stone',boss:'종지기',bossColor:'#929ec0'},
{name:'잿불 성채',sub:'공허한 왕관의 심장부',floor:'#403139',alt:'#4a373c',wall:'#28232e',top:'#6e4e58',light:'#ea8a57',enemy:['knight','mage','imp'],resource:'iron',boss:'공허의 왕',bossColor:'#c67861'}
];
export const RELICS=[
{id:'fang',name:'늑대 송곳니',text:'공격력 +20%',stat:'damage',value:.2},
{id:'heart',name:'호박석 심장',text:'최대 체력 +35, 체력 35 회복',stat:'hp',value:35},
{id:'boots',name:'바람걸음 실타래',text:'이동 속도 +15%',stat:'speed',value:.15},
{id:'eye',name:'매의 눈',text:'치명타 확률 +12%',stat:'crit',value:.12},
{id:'vial',name:'선혈의 약병',text:'적 처치 시 체력 2 회복',stat:'lifekill',value:2},
{id:'hourglass',name:'금 간 모래시계',text:'기술 재사용 대기시간 20% 감소',stat:'cooldown',value:.2},
{id:'crystal',name:'푸른 수정',text:'최대 마나 +35, 초당 마나 회복 +2',stat:'mana',value:35},
{id:'coin',name:'탐광꾼의 동전',text:'획득 골드 +40%',stat:'gold',value:.4},
{id:'thorn',name:'가시나무 왕관',text:'피격 시 주변 적에게 피해',stat:'thorns',value:14},
{id:'flame',name:'타오르는 잿불',text:'공격 시 적을 3초간 불태움',stat:'burn',value:4},
{id:'ice',name:'겨울 유리',text:'공격 시 적 이동 속도 35% 감소',stat:'slow',value:.35},
{id:'wing',name:'나방날개 망토',text:'회피 재사용 대기시간 30% 감소',stat:'dodge',value:.3},
{id:'shield',name:'돌의 인장',text:'방어력 +4',stat:'armor',value:4},
{id:'echo',name:'메아리 종',text:'공격 속도 +25%',stat:'haste',value:.25},
{id:'star',name:'떨어진 별',text:'기술 피해 +35%',stat:'spell',value:.35},
{id:'phoenix',name:'불사조 깃털',text:'치명상을 한 번 버티고 최대 체력의 50%로 회복',stat:'revive',value:1},
{id:'magnet',name:'자철석',text:'더 먼 곳의 전리품을 끌어당김',stat:'magnet',value:100},
{id:'venom',name:'이끼 송곳니',text:'치명타 피해 3배',stat:'critpower',value:1}
];
export const BUILDINGS=[
{id:'training',name:'훈련장',icon:'⚔',text:'단계마다 기술 3, 4, 5등급 차례로 해금',max:3,cost:45,wood:3,stone:2},
{id:'guild',name:'길드 회관',icon:'⌂',text:'상위 건물 강화 단계와 전문화 해금',max:3,cost:70,wood:6,stone:3},
{id:'forge',name:'대장간',icon:'⚒',text:'단계마다 영구 공격력 +8%',max:6,cost:55,wood:2,stone:5},
{id:'chapel',name:'예배당',icon:'✧',text:'단계마다 최대 체력 +15, 사망 시 자원 보존율 +5%',max:6,cost:50,wood:5,stone:2},
{id:'apothecary',name:'연금술 공방',icon:'⚗',text:'물약 효과 증가, 2·4단계에서 물약 수 +1',max:4,cost:65,wood:4,stone:2},
{id:'enchanter',name:'마법 부여소',icon:'✦',text:'단계마다 최대 마나 +10, 기술 피해 +5%',max:5,cost:65,wood:3,stone:4},
{id:'treasury',name:'금고',icon:'◈',text:'단계마다 사망 시 자원 보존율 +2.5%',max:5,cost:75,wood:4,stone:4}
];
export const GEAR_NAMES={weapon:['철제 칼날','물푸레나무 지팡이','사냥꾼의 맹세','황혼의 검','잿불 송곳니','왕의 파멸'],armor:['누비옷','비늘 갑옷','순례자의 조끼','수호자의 판금갑옷','룬 망토','왕관의 수호'],charm:['구리 증표','월장석','호박석 인장','까마귀 부적','잿불 보석','새벽돌']};
// Display-only compatibility for gear names stored by the English catalog.
const LEGACY_GEAR_NAMES={weapon:['Iron edge','Ashwood staff','Hunter’s oath','Dusk blade','Emberfang','Kingsbane'],armor:['Padded coat','Scale hauberk','Pilgrim’s vest','Warden plate','Runic mantle','Crownward'],charm:['Copper token','Moonstone','Amber seal','Raven charm','Cinder jewel','Dawnstone']};
export function legacyGearName(name,slot){const slots=Object.hasOwn(LEGACY_GEAR_NAMES,slot)?[slot]:Object.keys(LEGACY_GEAR_NAMES);for(const key of slots){const index=LEGACY_GEAR_NAMES[key].indexOf(name);if(index!==-1)return GEAR_NAMES[key][index];}return name;}
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

export function createMap(seed,floor,version=2){if(version===1)return createLegacyMap(seed,floor);const rand=seeded(seed+floor*9173),w=65,h=49,tiles=Array.from({length:h},()=>Array(w).fill(0)),rooms=[],layout=['엇갈린 숲길','무너진 고리','갈라진 회랑','물에 잠긴 납골당','공성 전당','왕관 수호의 미궁'][floor%6];
 const carve=(x,y,rw,rh)=>{for(let j=Math.max(1,y);j<Math.min(h-1,y+rh);j++)for(let i=Math.max(1,x);i<Math.min(w-1,x+rw);i++)tiles[j][i]=1;};
 for(let gy=0;gy<3;gy++)for(let gx=0;gx<4;gx++){let rw=8+Math.floor(rand()*6),rh=7+Math.floor(rand()*6),x=2+gx*15+Math.floor(rand()*3),y=2+gy*15+Math.floor(rand()*3),r={x,y,w:rw,h:rh,cx:x+Math.floor(rw/2),cy:y+Math.floor(rh/2),index:rooms.length,kind:['patrol','swarm','ambush','cache','elite'][Math.floor(rand()*5)]};carve(x,y,rw,rh);if(floor<2){for(let yy=y;yy<y+rh;yy++)for(let xx=x;xx<x+rw;xx++)if((xx===x||xx===x+rw-1)&&(yy<y+2||yy>y+rh-3))tiles[yy][xx]=0;}else if(r.index>0&&r.index!==11&&rw>10&&rh>9){for(let [px,py] of [[x+2,y+2],[x+rw-3,y+rh-3]])tiles[py][px]=0;}rooms.push(r);}
 const neighbors=i=>[i%4?i-1:-1,i%4<3?i+1:-1,i>=4?i-4:-1,i<8?i+4:-1].filter(i=>i>=0),visited=new Set([0]),stack=[0],edges=[],connected=new Set();
 const link=(a,b)=>{let key=[a,b].sort((a,b)=>a-b).join(':');if(connected.has(key))return;connected.add(key);edges.push([a,b]);};
 while(stack.length){let a=stack.at(-1),opts=neighbors(a).filter(i=>!visited.has(i));if(!opts.length){stack.pop();continue;}let b=opts[Math.floor(rand()*opts.length)];link(a,b);visited.add(b);stack.push(b);}
 // Woodland is braided; crypt is a tight maze; citadel has long crossing halls.
 let chance=floor===0?.65:floor===1?.5:floor===3?.08:.28;for(let a=0;a<12;a++)for(let b of neighbors(a))if(rand()<chance)link(a,b);
 for(let [a,b] of edges){let r=rooms[a],q=rooms[b],width=floor===3?2:floor===4?4:3,offset=Math.floor(width/2);if(rand()<.5){for(let x=Math.min(r.cx,q.cx);x<=Math.max(r.cx,q.cx);x++)carve(x,r.cy-offset,1,width);for(let y=Math.min(r.cy,q.cy);y<=Math.max(r.cy,q.cy);y++)carve(q.cx-offset,y,width,1);}else{for(let y=Math.min(r.cy,q.cy);y<=Math.max(r.cy,q.cy);y++)carve(r.cx-offset,y,width,1);for(let x=Math.min(r.cx,q.cx);x<=Math.max(r.cx,q.cx);x++)carve(x,q.cy-offset,1,width);}}
 const boss=floor%2===1;if(boss){let r=rooms[11];carve(r.x-1,r.y-1,r.w+2,r.h+2);}return {w,h,tiles,rooms,seed,boss,layout,edges};}

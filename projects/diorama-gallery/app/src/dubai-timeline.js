export const TIMELAPSE_DURATION=72;
export const PHASES=Object.freeze([{time:0,label:'해안과 모래'},{time:12,label:'지형과 인공섬'},{time:23,label:'도로와 기반 시설'},{time:35,label:'도시가 자라는 시간'},{time:49,label:'정원과 일상'},{time:60,label:'완성된 도시'},{time:68,label:'시간 되감기'}]);
const smooth=x=>(x=Math.max(0,Math.min(1,x)))*x*(3-2*x);
export function constructionTime(t){const p=((t%72)+72)%72;return p<=66?p:66*(1-smooth((p-66)/6));}
export function progressAt(t,start,end){return smooth((t-start)/(end-start));}
export function pieceProgress(t,window){return window[2]==='building'?Math.max(0,Math.min(1,(t-window[0])/(window[1]-window[0]))):progressAt(t,window[0],window[1]);}
// Artistic sequence, intentionally not dated historical reconstruction.
export function constructionWindow(names,box){
 const text=names.join('/'),x=(box.min.x+box.max.x)/2,z=(box.min.z+box.max.z)/2;
 const building=(base,speed)=>[base+box.min.y*speed,base+Math.max(box.min.y+.001,box.max.y)*speed,'building'];
 if(text.includes('engraved-dubai-map'))return[-2,-1,'permanent'];
 if(text.includes('palm-jumeirah')){
  if(text.includes('villa')||text.includes('atlantis-palace'))return building(22,4);
  if(box.max.y>.2)return[39+(z+9)*.5,43+(z+9)*.5,'plant'];
  return[7+(z+9)*.9,12+(z+9)*.9,'land'];
 }
 if(text.includes('coastal-sand'))return[5,15,'land'];
 if(text.includes('date-palm')||text.includes('desert-gardens'))return[40+(x+8)*.25+(z+9)*.1,47+(x+8)*.25+(z+9)*.1,'plant'];
 if(text.includes('burj-khalifa'))return building(27,1.45);
 if(text.includes('dubai-skyline')){const key=names.find(n=>n.startsWith('skyline-tower-')||n.startsWith('city-block-'))??'city';const offset=[...key].reduce((n,c)=>n+c.charCodeAt(0),0)%6;return building(24+offset,1.5);}
 if(text.includes('burj-al-arab')||text.includes('dubai-mall')||text.includes('dubai-frame'))return building(text.includes('dubai-frame')?27:text.includes('dubai-mall')?21:23,1.5);
 if(text.includes('metro')||text.includes('station'))return[22+(x+8)*.65,28+(x+8)*.65,'road'];
 if(text.includes('mainland')||text.includes('western-city-terrace')||text.includes('palm-causeway'))return[4+(x+8)*.35,14+(x+8)*.35,'land'];
 if(text.includes('timelapse-pedestrian')||text.includes('gold-car')||text.includes('camel')||box.max.y>.3)return[46+(x+8)*.15,51+(x+8)*.15,'life'];
 if(box.max.y<.025)return[-2,-1,'permanent'];
 return[14+(z+9)*.3,23+(z+9)*.3,'road'];
}

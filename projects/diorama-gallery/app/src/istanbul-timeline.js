export const DURATION=72;
export const PHASES=Object.freeze([{time:0,label:'보스포루스 해안'},{time:10,label:'길과 부두'},{time:24,label:'역사의 건축'},{time:38,label:'상가와 다리'},{time:49,label:'트램과 도시의 일상'},{time:57,label:'불이 켜지는 밤'},{time:62,label:'완성된 이스탄불'},{time:69,label:'시간 되감기'}]);
const smooth=x=>(x=Math.max(0,Math.min(1,x)))*x*(3-2*x);
export const progress=(t,a,b)=>smooth((t-a)/(b-a));
export function cityTime(t){const p=((t%DURATION)+DURATION)%DURATION;return p<66?p:66*(1-smooth((p-66)/6));}
export function cityWindow(names,box){
 const text=names.join('/'),x=(box.min.x+box.max.x)/2,z=(box.min.z+box.max.z)/2;
 const build=(start,speed)=>[start+box.min.y*speed,start+Math.max(box.min.y+.006,box.max.y)*speed,'building'];
 if(text.includes('istanbul-base'))return[-2,-1,'permanent'];
 if(text.includes('istanbul-coast'))return[1,8,'land'];
 if(text.includes('istanbul-monument-terraces'))return[9,15,'land'];
 if(text.includes('istanbul-streets'))return[7+(x+8)*.16,12+(x+8)*.16,'road'];
 if(text.includes('palace-courtyard'))return build(12,3.3);
 if(text.includes('galata-tower'))return build(16,3.3);
 if(text.includes('hagia-sophia'))return build(20,3.0);
 if(text.includes('blue-mosque'))return build(23,3.2);
 if(text.includes('waterfront-houses'))return build(29+(x+8)*.35,3.2);
 if(text.includes('bosphorus-bridge'))return build(34,3.1);
 if(text.includes('maidens-tower'))return build(27,4.1);
 if(text.includes('harbor-kiosk'))return build(37,4);
 if(text.includes('istanbul-gardens'))return[42+(x+8)*.12,48+(x+8)*.12,'plant'];
 if(text.includes('istanbul-street-lamps')||text.includes('istanbul-pedestrians'))return[46+(x+8)*.12,50+(x+8)*.12,'life'];
 return[41,49,'life'];
}

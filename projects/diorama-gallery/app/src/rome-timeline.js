export const DURATION=84;
export const PHASES=Object.freeze([{time:0,label:'지도와 테베레강'},{time:12,label:'강둑과 석조 다리'},{time:25,label:'고대 로마의 건축'},{time:39,label:'성당과 도시의 골목'},{time:53,label:'정원과 일상'},{time:68,label:'불이 켜진 영원의 도시'},{time:79,label:'시간 되감기'}]);
const smooth=x=>(x=Math.max(0,Math.min(1,x)))*x*(3-2*x);
export const progressAt=(t,a,b)=>smooth((t-a)/(b-a));
export function constructionTime(t){const p=((t%DURATION)+DURATION)%DURATION;return p<=76?p:76*(1-smooth((p-76)/8));}
export function constructionWindow(names,box){
 const text=names.join('/'),x=(box.min.x+box.max.x)/2,z=(box.min.z+box.max.z)/2;
 const building=(start,speed=5)=>[start+Math.max(0,box.min.y-.13)*speed,start+Math.max(.001,box.max.y-.13)*speed,'building'];
 if(/rome-atlas|tiber-river/.test(text))return[-2,-1,'permanent'];
 if(/rome-gardens/.test(text))return[48+(z+9)*.2,55+(z+9)*.2,'plant'];
 if(/rome-life|rome-fountain|rome-landmark-label/.test(text))return[55,61,'life'];
 if(/river-embankment|rome-bridge|rome-streets/.test(text))return[5+(z+9)*.25,14+(z+9)*.25,'road'];
 if(/colosseum/.test(text))return building(20,6);
 if(/pantheon|roman-forum|arch-of-constantine|castel-sant/.test(text))return building(19+(x+9)*.28,6);
 if(/st-peters|spanish-steps|villa-borghese/.test(text))return building(30,5);
 if(/rome-house/.test(text)){const seed=+(names.find(n=>n.startsWith('rome-house-'))?.split('-').at(-1)??0);return building(28+seed%12,7);}
 return[5,13,'land'];
}

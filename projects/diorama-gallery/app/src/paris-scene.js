import {buildParisGround,buildParisDistrict,buildParisLife} from './paris-city.js';
import {buildParisLandmarks} from './paris-landmarks.js';
import {buildParisStreets} from './paris-streets.js';

/** One production composition path, audited before its static meshes are batched. */
export function buildParisScene(W){
 const district=buildParisDistrict(W),landmarks=buildParisLandmarks(W),architecture=[...district.root.children,...landmarks.roots];
 const ground=buildParisGround(W,{architecture}),life=buildParisLife(W,ground.groundHeight,{canPlant:ground.canPlant});
 const streets=buildParisStreets(W,{ground,obstacles:[...architecture,...life.root.children],fixtures:[...life.streetlamps.children,...life.people.children]});
 return{ground,district,landmarks,life,streets};
}

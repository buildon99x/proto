import {it,expect} from 'vitest';
import {Game} from '../src/game';
import {assessStroke,strokeTarget,solveStroke,type StrokeContext} from '../src/tactics';
import {inside,clone,advance,sweep,distance,solve} from '../src/physics';
import {predictedRacket,contactCheck} from '../src/motion';
const c:StrokeContext={side:-1,body:{x:-1.5,y:0,z:-4.3},movement:{x:0,y:0,z:0},contact:{x:-1.15,y:2.7,z:-4},incoming:{x:0,y:-3,z:-9},incomingShot:'clear',incomingWeak:false,quality:'perfect',preparation:1,intent:'drop',target:{x:2.5,y:.025,z:1.2},timingError:0};
it('a deliberate line shot exposes existing timing risk in the actual integrator, without changing ordinary interior placements',()=>{
 const poor={...c,quality:'weak' as const,timingError:-.24};
 const good=solveStroke(c,assessStroke(c)),bad=solveStroke(poor,assessStroke(poor));
 expect(inside(good.prediction.end)).toBe(true);expect(inside(bad.prediction.end)).toBe(false);
 for(const solution of [good,bad]){
  const p=clone(c.contact),v=clone(solution.velocity);let hit:ReturnType<typeof sweep>=null;
  for(let i=0;i<720&&!hit;i++){const before=clone(p);advance(p,v);hit=sweep(before,p);}
  expect(hit?.reason).toBe('GROUND');expect(distance(hit!.p,solution.prediction.end)).toBeLessThan(1e-7);
 }
 const interior={...poor,target:{x:1.8,y:.025,z:1.2}};
 expect(strokeTarget(interior,assessStroke(interior)).x).toBeCloseTo(2,10);
 expect(inside(solveStroke(interior,assessStroke(interior)).prediction.end)).toBe(true);
});
it('a legal edge can be intercepted from the existing run boundary with a physically valid racket; planning never teleports the actor',()=>{
 const g=new Game();g.start('EASY');g.receiver=1;
 const a=g.actors[1];a.p={x:2,y:0,z:3.4};const before=clone(a.p);
 const start={x:2.5,y:2.6,z:-4};const shot=solve(start,{x:2.5,y:.025,z:5.8},'clear');
 // Explicit domain fixture only, not ordinary UI/human evidence.
 g.intercept(start,shot.velocity,.3);
 expect(a.p).toEqual(before);expect(a.target.x).toBeLessThanOrEqual(2.75);expect(a.contact).not.toBeNull();expect(Number.isFinite(g.contactAt)).toBe(true);
 const racket=predictedRacket(a,a.contact!,g.contactAt-g.time,g.time,.3);
 const velocity=g.predicted!.path.find(f=>Math.abs(g.time+f.t-g.contactAt)<.001)!.v;
 expect(contactCheck(racket,a.contact!,velocity).valid).toBe(true);
});

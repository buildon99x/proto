import {it,expect} from 'vitest';
import {contactWindow,framebufferWindow} from '../src/contact-visibility';
import {targetArea,aimCopy,resultCopy} from '../src/aim-feedback';

it('opens only for a current point behind actual projected body segments, preserving gaps and own contacts',()=>{
 const body=[{a:{x:100,y:80,z:4},b:{x:100,y:160,z:4},radius:12},{a:{x:160,y:100,z:4},b:{x:160,y:150,z:4},radius:5}];
 const point={x:102,y:120,z:7};
 expect(contactWindow(point,body,640,360,true,false).strength).toBe(1);
 expect(contactWindow({...point,z:3},body,640,360,true,false).strength).toBe(0);
 expect(contactWindow({...point,x:135},body,640,360,true,false).strength).toBe(0);
 expect(contactWindow(point,body,640,360,true,true).strength).toBe(0);
 expect(contactWindow(point,body,640,360,false,false).strength).toBe(0);
 expect(point).toEqual({x:102,y:120,z:7});
});
it('keeps actual screen anchoring and bounded aperture sizes across orientation, rejecting offscreen/nonfinite points',()=>{
 const body=[{a:{x:190,y:400,z:4},b:{x:190,y:500,z:4},radius:20}];
 const window=contactWindow({x:190,y:450,z:7},body,390,844,true,false);
 expect(window).toEqual({x:190,y:450,radius:16.38,strength:1});
 expect(contactWindow({x:NaN,y:450,z:7},body,390,844,true,false).strength).toBe(0);
 expect(contactWindow({x:-100,y:450,z:7},body,390,844,true,false).strength).toBe(0);
});
it('uses the existing near-camera screen direction and distinguishes intended aim from resolved safety outcomes',()=>{
 // Actual fixed-view projections put world−1.8at641.7px and+1.8at423.3px in1065px.
 expect(targetArea({x:-1.8,y:0,z:1.2})).toBe('FRONT RIGHT');
 expect(targetArea({x:1.8,y:0,z:5.8})).toBe('DEEP LEFT');
 expect(aimCopy({x:0,y:0,z:1.2},'clear')).toContain('CLEAR AIMS DEEP');
 const text=resultCopy({technique:'lift',quality:'perfect',fallbackReason:'NO_LEGAL_DESCENDING_ATTACK',target:{x:-1.8,y:0,z:5.3}});
 expect(text).toContain('SAFE LIFT');expect(text).toContain('DEEP RIGHT');expect(text).not.toContain('SMASH');
 const superFallback=resultCopy({technique:'smash',quality:'perfect',fallbackReason:'NO_STRONGER_LEGAL_ATTACK',target:{x:0,y:0,z:5.8}});
 expect(resultCopy({technique:'drop',quality:'perfect',requestedShot:'smash',fallbackReason:'NO_LEGAL_DESCENDING_ATTACK',target:{x:0,y:0,z:1.2}})).toContain('AIM DEEPER');
 expect(superFallback).toContain('SUPER ANGLE TIGHT');expect(superFallback).not.toContain('SUPER SMASH');
});

it('keeps CSS anchor and circular radius through anisotropic buffer scaling during rotation',()=>{
 const window={x:422,y:210,radius:18,strength:1};
 const scaleX=585/844,scaleY=1266/390;
 const projected=framebufferWindow(window,scaleX,scaleY,1266);
 expect(projected.parameter[0]/scaleX).toBeCloseTo(window.x,10);
 expect((1266-projected.parameter[1])/scaleY).toBeCloseTo(window.y,10);
 const horizontal=window.radius*scaleX;
 const vertical=window.radius*scaleY*projected.aspect;
 expect(vertical).toBeCloseTo(horizontal,10);
 expect(projected.parameter[3]).toBe(1);
});

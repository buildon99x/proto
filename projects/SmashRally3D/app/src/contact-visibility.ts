import {type Entity, type MeshInstance, type StandardMaterial} from 'playcanvas';

export type ScreenPoint = {x:number;y:number;z:number};
export type ScreenCapsule = {a:ScreenPoint;b:ScreenPoint;radius:number};
export type ContactWindow = {x:number;y:number;radius:number;strength:number};
/** Only present rendered, current cork positions. No predicted contact or actor movement. */
export function contactWindow(
    ball:ScreenPoint,
    body:ScreenCapsule[],
    width:number,
    height:number,
    eligible:boolean,
    ownContact:boolean,
):ContactWindow {
    const radius=Math.min(18,width*42/1000);
    const off={x:ball.x,y:ball.y,radius,strength:0};
    if(!eligible||ownContact||ball.z<=0||!body.length||!Number.isFinite(ball.x+ball.y+ball.z))return off;
    if(ball.x+radius<0||ball.x-radius>width||ball.y+radius<0||ball.y-radius>height)return off;
    const covered=body.some(({a,b,radius})=>{
        if(ball.z<=Math.min(a.z,b.z)+.35)return false;
        const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
        const t=length?Math.max(0,Math.min(1,((ball.x-a.x)*dx+(ball.y-a.y)*dy)/length)):0;
        return Math.hypot(ball.x-a.x-t*dx,ball.y-a.y-t*dy)<=radius+2;
    });
    return {...off,strength:covered?1:0};
}

// Installed Engine2.23 StandardMaterial opacityPS contract. App is explicitly
// WebGL2; no WGSL/transpiler path. Opaque alpha-test retains normal depth sorting.
// A stable2x2 spatial edge is independent of render/frame/wall-clock jitter.
export const CONTACT_OPACITY = `
uniform float material_opacity;
uniform vec4 contactWindow;
uniform float contactAspect;
void getOpacity() {
    dAlpha=material_opacity;
    if(contactWindow.w>0.0){
        float visibility=smoothstep(contactWindow.z*.2,contactWindow.z,distance(vec2(gl_FragCoord.x,gl_FragCoord.y*contactAspect),vec2(contactWindow.x,contactWindow.y*contactAspect)));
        vec2 cell=mod(floor(gl_FragCoord.xy),2.0);
        float threshold=mix(mix(.125,.625,cell.x),mix(.875,.375,cell.x),cell.y);
        dAlpha*=mix(1.0,step(threshold,visibility),contactWindow.w);
    }
}
`;
export function prepareContactVisibility(roots:Entity[]){
    const meshes:MeshInstance[]=[];
    const clones=new Map<StandardMaterial,StandardMaterial>();
    for(const root of roots)for(const n of root.find(n=>!!(n as Entity).render))for(const mesh of (n as Entity).render!.meshInstances){
        const original=mesh.material as StandardMaterial;
        let material=clones.get(original);
        if(!material){material=original.clone();material.shaderChunksVersion='2.23';material.alphaTest=.5;material.getShaderChunks('glsl').set('opacityPS',CONTACT_OPACITY);material.update();clones.set(original,material);}
        mesh.material=material;mesh.setParameter('contactWindow',[0,0,1,0]);mesh.setParameter('contactAspect',1);meshes.push(mesh);
    }
    const parameter=new Float32Array(4);
    return (window:ContactWindow,scaleX:number,scaleY:number,deviceHeight:number)=>{
        const projected=framebufferWindow(window,scaleX,scaleY,deviceHeight);
        parameter.set(projected.parameter);
        for(const mesh of meshes){mesh.setParameter('contactWindow',parameter);mesh.setParameter('contactAspect',projected.aspect);}
    };
}

export function framebufferWindow(window:ContactWindow,scaleX:number,scaleY:number,deviceHeight:number){
    return {parameter:[window.x*scaleX,deviceHeight-window.y*scaleY,window.radius*scaleX,window.strength],aspect:scaleX/scaleY};
}

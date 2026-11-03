// CPU-only runtime probe: keep real Three.js matrices/cameras; replace only GPU I/O.
export * from '../../../.agents/skills/diorama-worlds/node_modules/three/build/three.module.js';
export class WebGLRenderer {
 constructor(){globalThis.__cameraProbe=this;this.domElement={style:{},setAttribute(){},addEventListener(){},removeEventListener(){},remove(){}};this.shadowMap={};this.info={reset(){},render:{calls:0,triangles:0},memory:{geometries:0,textures:0}};}
 setPixelRatio(){}setClearColor(){}setSize(){}setRenderTarget(){}setAnimationLoop(){}dispose(){}forceContextLoss(){}
 render(scene,camera){if(camera.isPerspectiveCamera||camera.isOrthographicCamera){this.camera=camera;this.scene=scene;}}
}

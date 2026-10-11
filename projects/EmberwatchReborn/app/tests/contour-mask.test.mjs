import test from 'node:test';import assert from 'node:assert/strict';
import {createSignalBodyContourCache} from '../src/signal-body-contour.js';

// Tiny binary-alpha Canvas2D boundary, not a browser rasterizer or art preview.
// It checks the compositing construction does not retain a filled body mask.
function alphaCanvas(width,height){
 const alpha=new Uint8Array(width*height),canvas={width,height,alpha};
 const ctx={globalCompositeOperation:'source-over',clearRect(){alpha.fill(0);},
  fillRect(){if(this.globalCompositeOperation!=='source-in')throw new Error('unexpected fill mode');},
  drawImage(image,sx,sy,sw,sh,dx,dy,dw,dh){
   for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
    const tx=dx+x,ty=dy+y;if(tx<0||ty<0||tx>=width||ty>=height)continue;
    const a=image.alpha[(sy+Math.floor(y*sh/dh))*image.width+sx+Math.floor(x*sw/dw)]/255,at=ty*width+tx;
    alpha[at]=Math.round(this.globalCompositeOperation==='destination-out'?alpha[at]*(1-a):255*a+alpha[at]*(1-a));
   }
  }};
 canvas.getContext=()=>ctx;return canvas;
}
test('opaque body interior is removed and both mask layers remain bounded to a thin exterior edge',()=>{
 const image={width:5,height:5,alpha:new Uint8Array(25)};
 for(let y=1;y<=3;y++)for(let x=1;x<=3;x++)image.alpha[y*5+x]=255;
 const cached=createSignalBodyContourCache(alphaCanvas),cue=cached(image,{x:0,y:0,w:5,h:5,ax:2,ay:4},1,1);
 for(const {canvas} of cue.masks){
  let visible=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   if(x>=4&&x<=6&&y>=4&&y<=6)assert.equal(canvas.alpha[y*canvas.width+x],0,'no tinted original body interior survives');
   if(canvas.alpha[y*canvas.width+x]){visible++;assert.ok(x>=2&&x<=8&&y>=2&&y<=8,'edge stays within two pixels of the source silhouette');}
  }
  assert.ok(visible>0);
 }
});

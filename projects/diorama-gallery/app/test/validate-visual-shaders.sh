#!/usr/bin/env bash
set -euo pipefail
ROOT="${1:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
TEMP_DIR="$(mktemp -d /tmp/visual-shader-review.XXXXXX)"
trap 'rm -rf "$TEMP_DIR"' EXIT
cd "$ROOT"
node --input-type=module <<'JS' > "$TEMP_DIR/shaders.json"
import {createVisualPipeline} from './projects/diorama-gallery/.agents/skills/diorama-worlds/kit/visual-pipeline.js';
import {VISUAL_PRESETS,resolveVisualProfile} from './projects/diorama-gallery/.agents/skills/diorama-worlds/kit/visual-settings.js';
import * as THREE from './projects/diorama-gallery/.agents/skills/diorama-worlds/node_modules/three/build/three.module.js';
let active=null;
const materials=new Set();
const gl={FRAMEBUFFER:1,FRAMEBUFFER_COMPLETE:2,RENDERBUFFER:3,RGBA16F:4,DEPTH_COMPONENT24:5,SAMPLES:6,getInternalformatParameter:()=>[4,2],checkFramebufferStatus:()=>2};
const renderer={capabilities:{maxSamples:4},extensions:{has:()=>true},getContext:()=>gl,getRenderTarget:()=>active,setRenderTarget:t=>active=t,render:s=>{if(s.children[0]?.material)materials.add(s.children[0].material)}};
const pipeline=createVisualPipeline(renderer),settings=VISUAL_PRESETS.vivid;
pipeline.configure(settings,resolveVisualProfile(settings,900,'miniature',pipeline.capabilities()),800,600);
pipeline.render(new THREE.Scene(),new THREE.Camera());
console.log(JSON.stringify({three:THREE.REVISION,colorChunk:THREE.ShaderChunk.colorspace_pars_fragment,materials:[...materials].map(m=>({vertex:m.vertexShader,fragment:m.fragmentShader}))}));
pipeline.dispose();
JS
MESA_SHADER_CACHE_DIR="$TEMP_DIR/mesa-cache" python3 - "$TEMP_DIR/shaders.json" <<'PY'
# Isolated GLES compile/link only. Does not instantiate Three.WebGLRenderer or render pixels.
import ctypes as c,json,sys
E=c.CDLL('libEGL.so.1')
E.eglGetProcAddress.restype=c.c_void_p
E.eglGetProcAddress.argtypes=[c.c_char_p]
get=c.CFUNCTYPE(c.c_void_p,c.c_uint,c.c_void_p,c.c_void_p)(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
d=get(0x31DD,None,None) # EGL_PLATFORM_SURFACELESS_MESA
E.eglInitialize.argtypes=[c.c_void_p,c.POINTER(c.c_int),c.POINTER(c.c_int)]
a,b=c.c_int(),c.c_int()
assert E.eglInitialize(d,c.byref(a),c.byref(b))
E.eglBindAPI.argtypes=[c.c_uint]
assert E.eglBindAPI(0x30A0) # EGL_OPENGL_ES_API
attrs=(c.c_int*13)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038)
conf=c.c_void_p();n=c.c_int()
E.eglChooseConfig.argtypes=[c.c_void_p,c.c_void_p,c.POINTER(c.c_void_p),c.c_int,c.POINTER(c.c_int)]
assert E.eglChooseConfig(d,attrs,c.byref(conf),1,c.byref(n)) and n.value
E.eglCreateContext.argtypes=[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p]
E.eglCreateContext.restype=c.c_void_p
ctx=E.eglCreateContext(d,conf,None,(c.c_int*3)(0x3098,3,0x3038))
assert ctx
E.eglMakeCurrent.argtypes=[c.c_void_p,c.c_void_p,c.c_void_p,c.c_void_p]
assert E.eglMakeCurrent(d,None,None,ctx)
def fn(name,result,*args):return c.CFUNCTYPE(result,*args)(E.eglGetProcAddress(name.encode()))
gs=fn('glGetString',c.c_char_p,c.c_uint)
print('EGL:',a.value,b.value,'GL:',gs(0x1F02).decode(),'Renderer:',gs(0x1F01).decode())
create=fn('glCreateShader',c.c_uint,c.c_uint)
source=fn('glShaderSource',None,c.c_uint,c.c_int,c.POINTER(c.c_char_p),c.POINTER(c.c_int))
compile=fn('glCompileShader',None,c.c_uint)
status=fn('glGetShaderiv',None,c.c_uint,c.c_uint,c.POINTER(c.c_int))
log=fn('glGetShaderInfoLog',None,c.c_uint,c.c_int,c.POINTER(c.c_int),c.c_char_p)
prog=fn('glCreateProgram',c.c_uint)
attach=fn('glAttachShader',None,c.c_uint,c.c_uint)
link=fn('glLinkProgram',None,c.c_uint)
ps=fn('glGetProgramiv',None,c.c_uint,c.c_uint,c.POINTER(c.c_int))
pl=fn('glGetProgramInfoLog',None,c.c_uint,c.c_int,c.POINTER(c.c_int),c.c_char_p)
preamble='#version 300 es\nprecision highp float;\nprecision highp int;\n'
data=json.load(open(sys.argv[1]))
print('Three revision:',data['three'])
# ShaderMaterial ES3 conversion declarations; include pinned Three color helpers too.
vertex_prefix=preamble+'#define varying out\nin vec3 position;\nin vec2 uv;\n'
fragment_prefix=preamble+'#define varying in\n#define texture2D texture\nout highp vec4 pc_fragColor;\n#define gl_FragColor pc_fragColor\n'+data['colorChunk']+'\n'
for i,material in enumerate(data['materials']):
 name=['extract','blur','output'][i]
 p=prog()
 for typ,text in [('vertex',vertex_prefix+material['vertex']),('fragment',fragment_prefix+material['fragment'])]:
  s=create(0x8B31 if typ=='vertex' else 0x8B30)
  text=c.c_char_p(text.encode());source(s,1,c.byref(text),None);compile(s)
  ok=c.c_int();status(s,0x8B81,c.byref(ok))
  buf=c.create_string_buffer(32768);log(s,32768,None,buf)
  print(name,typ,'PASS' if ok.value else 'FAIL',buf.value.decode())
  assert ok.value;attach(p,s)
 link(p);ok=c.c_int();ps(p,0x8B82,c.byref(ok))
 buf=c.create_string_buffer(32768);pl(p,32768,None,buf)
 print(name,'link','PASS' if ok.value else 'FAIL',buf.value.decode())
 assert ok.value
PY

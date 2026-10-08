"""CPU raster diagnostic of actual mesh triangles, approximate diffuse light.
No browser is run. Output must never be presented as an in-game screenshot.
"""
import json,math,sys
import numpy as np
from PIL import Image,ImageDraw
j=json.load(open(sys.argv[1]));W,H=640,360
pix=np.empty((H,W,3),dtype=float);pix[:]=(.52,.55,.61);depth=np.full((H,W),np.inf)
f=H/(2*math.tan(math.radians(j['fov']/2)))
bayer=np.array([[0,8,2,10],[12,4,14,6],[3,11,1,9],[15,7,13,5]])
def clip(points):
 out=[]
 for a,b in zip(points,points[1:]+points[:1]):
  ia=a[2]<-.035;ib=b[2]<-.035
  if ia:out.append(a)
  if ia!=ib:
   t=(-.035-a[2])/(b[2]-a[2]);out.append([a[k]+t*(b[k]-a[k]) for k in range(3)])
 return out
for t in j['triangles']:
 poly=clip(t['p'])
 for k in range(1,len(poly)-1):
  p=np.array([poly[0],poly[k],poly[k+1]]);z=-p[:,2];v=np.column_stack((W/2+p[:,0]*f/z,H/2-p[:,1]*f/z))
  x0=max(0,int(np.floor(v[:,0].min())));x1=min(W-1,int(np.ceil(v[:,0].max())));y0=max(0,int(np.floor(v[:,1].min())));y1=min(H-1,int(np.ceil(v[:,1].max())))
  if x0>x1 or y0>y1:continue
  x,y=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5);a,b,c=v
  den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
  if abs(den)<1e-8:continue
  u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den
  vv=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;ww=1-u-vv
  valid=(u>=0)&(vv>=0)&(ww>=0);zz=1/np.maximum(1e-8,u/z[0]+vv/z[1]+ww/z[2]);d=depth[y0:y1+1,x0:x1+1];valid&=zz<d
  if not valid.any():continue
  col=np.array(t['c']);lum=max(0,np.dot(col,[.2126,.7152,.0722]))**.72
  xi=x.astype(int);yi=y.astype(int);noise=np.mod(np.sin(xi*12.9898+(H-1-yi)*78.233)*43758.5453,1)
  value=lum+(bayer[(H-1-yi)%4,xi%4]/16-.5)*.25+(noise-.5)*.1
  tones=np.array([[.024,.035,.058],[.23,.26,.32],[.52,.55,.61],[.83,.86,.86]])
  tone=tones[np.digitize(value,[.20,.40,.69])];red=max(0,col[0]-max(col[1],col[2]))
  if j['previous']:
   fac=np.clip((red-.045)/(.14-.045),0,1);fac=fac*fac*(3-2*fac)*.75;tone=tone*(1-fac)+np.array([.43,.27,.31])*fac
  else:
   fac=np.clip((red-.012)/(.060-.012),0,1);fac=fac*fac*(3-2*fac);reds=np.array([[.25,.14,.19],[.53,.31,.37],[.70,.47,.53]])[np.digitize(value,[.27,.57])];tone=tone*(1-fac)+reds*fac
  d[valid]=zz[valid];pix[y0:y1+1,x0:x1+1][valid]=tone[valid]
out=Image.fromarray((np.clip(pix,0,1)*255).astype('uint8'));canvas=Image.new('RGB',(640,408),'#090d17');canvas.paste(out,(0,26));draw=ImageDraw.Draw(canvas);draw.text((12,8),'OFFLINE MESH DIAGNOSTIC / NOT A GAME SCREENSHOT',fill='#d4d8e0');draw.text((12,391),j.get('label',('0.3 previous' if j['previous'] else '0.4 revised'))+' / approximate light / no environment or browser verification',fill='#aab2c0');canvas.save(sys.argv[2])

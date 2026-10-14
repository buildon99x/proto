-- Original PaintedAssetStudio composition. No upstream paintings reused.
--@ engine 5
--@ box tube box
--@ chunk
canvas{size=300,aspect=1,seed=99,linen=18,
 ground={{pile={{"lead white",4},{"raw umber",1}},um=100,apply="knife",texture=0.08}}}
ink=pile{{"Prussian blue",2},{"raw umber",3},{"bone black",1}}
night=pile{{"Prussian blue",1},{"raw umber",1},{"lead white",1}}
teal=pile{{"Prussian blue",1},{"yellow ochre",1},{"lead white",3}}
mist=pile{{"lead white",8},{"Prussian blue",0.3},{"yellow ochre",0.4}}
gold=pile{{"yellow ochre",3},{"chrome yellow",2},{"lead white",2}}
light=pile{{"lead white",7},{"chrome yellow",1},{"yellow ochre",0.5}}
rust=pile{{"red earth",3},{"yellow ochre",1},{"raw umber",1}}
stone=pile{{"lead white",3},{"raw umber",1},{"yellow ochre",1}}
sy=H/1000
function R(x,y,w,h) return rect(x,y*sy,w,h*sy) end
function E(x,y,rx,ry) return ellipse(x,y*sy,rx,ry*sy) end
function P(pts) local q={}; for i,p in ipairs(pts) do q[i]={p[1],p[2]*sy} end; return poly(q) end
function wash(m,p,c,a)
 work(m,{hand="broad",pile=p,tool={kind="filbert",width=34,lay=5},coverage=c or 2.4,
 angle=a or 0,clip=true,fill=true,pressure={0.65,0.95},length={35,100},dips={1,1,1},seed=99})
end
function line(pts,p,w)
 local q={}; for i,v in ipairs(pts) do q[i]={v[1],v[2]*sy} end
 local b=brush{kind="round",width=w or 4,lay=5,point=0.5}
 b:load(p,1); b:stroke(q,{pressure=0.9,ramps={0.02,0.05},shake=0.15})
end
function tree(x,y,s,p)
 wash(P{{x,y-95*s},{x-18*s,y-61*s},{x-7*s,y-61*s},{x-31*s,y-32*s},{x-12*s,y-32*s},{x-42*s,y},{x+42*s,y},{x+12*s,y-32*s},{x+31*s,y-32*s},{x+7*s,y-61*s},{x+18*s,y-61*s}},p,2.5,1.57)
 line({{x,y-45*s},{x,y+13*s}},p,7*s)
end

--@ chunk
wash(everywhere(),night,3)
wash(E(500,520,371,376),teal,2.8)
wash(E(500,520,284,286),night,2.8)
wash(E(515,878,213,44),ink,3)
-- An independent opaque inventory icon: copper field lantern.
line({{378,267},{379,148},{431,99},{537,100},{590,150},{590,267}},ink,30)
line({{401,246},{401,162},{445,125},{525,125},{568,163},{568,246}},gold,14)
wash(P{{334,283},{373,221},{614,221},{659,283}},ink,3)
wash(P{{349,274},{381,238},{601,238},{637,274}},rust,3)
wash(P{{354,295},{643,295},{682,768},{322,768}},ink,3)
wash(P{{391,334},{604,334},{631,713},{369,713}},rust,3)
wash(P{{409,350},{582,350},{605,689},{387,689}},gold,3)
wash(E(497,526,45,84),light,3)
wash(P{{490,460},{514,516},{505,595},{478,595},{479,521}},light,3)
line({{499,331},{499,709}},rust,15)
line({{371,319},{350,728}},stone,11)
line({{625,320},{651,725}},rust,18)
wash(P{{316,746},{685,746},{710,815},{292,815}},ink,3)
wash(R(320,763,362,28),rust,3)
line({{329,797},{672,797}},gold,12)
wash(E(499,766,24,20),stone,3)
wash(E(499,766,10,8),ink,3)

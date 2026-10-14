-- Original PaintedAssetStudio composition. No upstream paintings reused.
--@ engine 5
--@ box tube box
--@ chunk
canvas{size=300,aspect=1.77777777778,seed=99,linen=18,
 ground={{pile={{"lead white",4},{"raw umber",1}},um=100,apply="knife",texture=0.08}}}
ink=pile{{"Prussian blue",2},{"raw umber",3},{"bone black",1}}
night=pile{{"Prussian blue",1},{"raw umber",1},{"lead white",1}}
teal=pile{{"Prussian blue",1},{"yellow ochre",1},{"lead white",3}}
mist=pile{{"lead white",8},{"Prussian blue",0.3},{"yellow ochre",0.4}}
gold=pile{{"yellow ochre",3},{"chrome yellow",2},{"lead white",2}}
light=pile{{"lead white",7},{"chrome yellow",1},{"yellow ochre",0.5}}
rust=pile{{"red earth",3},{"yellow ochre",1},{"raw umber",1}}
stone=pile{{"lead white",3},{"raw umber",1},{"yellow ochre",1}}
sy=H/562.5
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
wash(everywhere(),night,2.7)
wash(R(0,0,1000,300),teal,2.5)
wash(E(740,135,64,64),gold,3)
wash(E(740,135,43,43),light,3)
wash(P{{0,275},{80,215},{170,250},{280,178},{370,230},{490,155},{590,226},{690,184},{810,244},{925,187},{1000,250},{1000,385},{0,385}},mist,2.7)
wash(P{{0,324},{90,284},{170,303},{280,245},{390,319},{535,248},{630,301},{790,242},{915,283},{1000,257},{1000,422},{0,422}},teal,3)
wash(R(0,363,1000,200),night,2.7)
wash(P{{515,353},{619,353},{760,562},{335,562}},teal,2.6)
for i=1,23 do local y=368+i*7.9; local dx=(y-360)*0.85
 line({{564-dx,y},{581+dx,y-1}},i%3==0 and gold or mist,2.5) end
wash(P{{0,343},{92,301},{205,337},{293,310},{383,354},{470,380},{330,432},{0,510}},ink,3)
wash(P{{725,390},{813,332},{910,315},{1000,356},{1000,563},{818,520}},ink,3)
-- The old gate: bridge deck, two piers, rounded opening.
wash(R(272,291,395,155)-E(476,449,119,121),stone,3)
wash(R(270,294,400,13),gold,2.5)
line({{295,327},{327,330},{327,425}},night,9)
line({{631,328},{631,404}},night,9)
for x=294,646,36 do line({{x,296},{x,315}},night,3) end
-- Two huts along the gate.
for _,x in ipairs{389,547} do
 wash(R(x,268,42,24),rust,3); wash(P{{x-8,267},{x+21,247},{x+51,267}},ink,3)
 wash(R(x+16,275,10,15),light,3)
end
for _,t in ipairs{{47,395,1.4},{129,399,1.6},{222,383,1.1},{893,420,1.7},{965,446,2.0},{811,410,1.1}} do tree(t[1],t[2],t[3],ink) end
wash(P{{0,516},{99,473},{233,513},{338,501},{402,563},{0,563}},rust,2.6)
wash(P{{793,530},{888,488},{1000,516},{1000,563},{740,563}},rust,2.6)
for i=1,15 do local x=28+i*18; local y=516+rand(-12,22); line({{x,y+15},{x+3,y-8}},gold,3) end

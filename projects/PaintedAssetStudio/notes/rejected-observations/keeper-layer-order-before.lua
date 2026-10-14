-- Original PaintedAssetStudio composition. No upstream paintings reused.
--@ engine 5
--@ box tube box
--@ chunk
canvas{size=300,aspect=0.666666666667,seed=99,linen=18,
 ground={{pile={{"lead white",4},{"raw umber",1}},um=100,apply="knife",texture=0.08}}}
ink=pile{{"Prussian blue",2},{"raw umber",3},{"bone black",1}}
night=pile{{"Prussian blue",1},{"raw umber",1},{"lead white",1}}
teal=pile{{"Prussian blue",1},{"yellow ochre",1},{"lead white",3}}
mist=pile{{"lead white",8},{"Prussian blue",0.3},{"yellow ochre",0.4}}
gold=pile{{"yellow ochre",3},{"chrome yellow",2},{"lead white",2}}
light=pile{{"lead white",7},{"chrome yellow",1},{"yellow ochre",0.5}}
rust=pile{{"red earth",3},{"yellow ochre",1},{"raw umber",1}}
stone=pile{{"lead white",3},{"raw umber",1},{"yellow ochre",1}}
sy=H/1500
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
wash(E(500,495,369,426),teal,2.8)
wash(E(510,343,228,241),gold,2.7)
wash(E(510,343,203,216),night,3)
for _,t in ipairs{{104,1020,3.0},{879,1110,3.5},{220,940,1.8},{782,880,2.1}} do tree(t[1],t[2],t[3],ink) end
wash(P{{0,1370},{224,1240},{449,1290},{645,1228},{1000,1340},{1000,1500},{0,1500}},ink,3)
-- Original cloaked lantern keeper, no card UI or typography.
wash(E(470,498,154,192),ink,3)
wash(P{{427,537},{375,650},{260,950},{209,1301},{423,1380},{640,1336},{591,966},{561,641}},ink,3)
wash(P{{469,662},{399,774},{332,1204},{429,1323},{522,1264},{505,991}},teal,3)
wash(P{{527,661},{570,885},{602,1283},{527,1315},{491,1150},{508,916}},night,3)
wash(E(477,501,71,103),rust,3)
wash(P{{399,442},{447,360},{533,421},{555,500},{496,456},{421,484}},ink,3)
wash(P{{475,466},{518,499},{494,558},{461,537}},stone,3)
line({{499,502},{516,505}},ink,4)
line({{490,541},{505,540}},rust,5)
wash(P{{526,681},{599,763},{698,730},{722,756},{641,828},{577,813},{521,771}},teal,3)
wash(E(702,750,27,20),stone,3)
wash(P{{331,811},{307,1024},{346,1101},{373,1054},{391,866}},night,3)
line({{393,1306},{364,1412}},ink,32)
line({{527,1300},{552,1410}},ink,32)
wash(E(727,844,123,143),gold,2.5)
wash(E(727,844,93,114),rust,2.8)
-- Lantern geometry separated from glowing surroundings.
line({{702,747},{701,684},{744,670},{769,699},{769,763}},ink,12)
wash(P{{669,774},{787,774},{803,923},{653,923}},ink,3)
wash(P{{688,793},{766,793},{777,897},{674,897}},gold,3)
wash(E(725,849,20,34),light,3)
line({{725,793},{725,899}},rust,7)
line({{669,920},{791,920}},stone,11)
for i=1,23 do local x=rand(200,850); local y=rand(1060,1420); line({{x,y},{x+2,y-6}},gold,3) end

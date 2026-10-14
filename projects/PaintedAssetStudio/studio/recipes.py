"""Original compositions, expressed entirely as physical easel brush strokes."""
PALETTES = {
    'dusk-ochre': {
        'ink': [('Prussian blue', 2), ('raw umber', 3), ('bone black', 1)],
        'night': [('Prussian blue', 1), ('raw umber', 1), ('lead white', 1)],
        'teal': [('Prussian blue', 1), ('yellow ochre', 1), ('lead white', 3)],
        'mist': [('lead white', 8), ('Prussian blue', .3), ('yellow ochre', .4)],
        'gold': [('yellow ochre', 3), ('chrome yellow', 2), ('lead white', 2)],
        'light': [('lead white', 7), ('chrome yellow', 1), ('yellow ochre', .5)],
        'rust': [('red earth', 3), ('yellow ochre', 1), ('raw umber', 1)],
        'stone': [('lead white', 3), ('raw umber', 1), ('yellow ochre', 1)],
    }
}
PRESETS = {'background': 562.5, 'card': 1500, 'icon': 1000}


def program(job, revision=0):
    import json
    aspect = job['width'] / job['height']
    piles = '\n'.join(f'{name}=pile{{' + ','.join('{'+json.dumps(t)+','+str(v)+'}' for t,v in mix) + '}' for name,mix in PALETTES[job['palette']].items())
    setup = f'''-- Original PaintedAssetStudio composition. No upstream paintings reused.
--@ engine 5
--@ box tube box
--@ chunk
canvas{{size=300,aspect={aspect:.12g},seed={job['seed']},linen=18,
 ground={{{{pile={{{{"lead white",4}},{{"raw umber",1}}}},um=100,apply="knife",texture=0.08}}}}}}
{piles}
sy=H/{PRESETS[job['preset']]}
function R(x,y,w,h) return rect(x,y*sy,w,h*sy) end
function E(x,y,rx,ry) return ellipse(x,y*sy,rx,ry*sy) end
function P(pts) local q={{}}; for i,p in ipairs(pts) do q[i]={{p[1],p[2]*sy}} end; return poly(q) end
function wash(m,p,c,a)
 work(m,{{hand="broad",pile=p,tool={{kind="filbert",width=34,lay=5}},coverage=c or 2.4,
 angle=a or 0,clip=true,fill=true,pressure={{0.65,0.95}},length={{35,100}},dips={{1,1,1}},seed={job['seed']}}})
end
function line(pts,p,w)
 local q={{}}; for i,v in ipairs(pts) do q[i]={{v[1],v[2]*sy}} end
 local b=brush{{kind="round",width=w or 4,lay=5,point=0.5}}
 b:load(p,1); b:stroke(q,{{pressure=0.9,ramps={{0.02,0.05}},shake=0.15}})
end
function tree(x,y,s,p)
 wash(P{{{{x,y-95*s}},{{x-18*s,y-61*s}},{{x-7*s,y-61*s}},{{x-31*s,y-32*s}},{{x-12*s,y-32*s}},{{x-42*s,y}},{{x+42*s,y}},{{x+12*s,y-32*s}},{{x+31*s,y-32*s}},{{x+7*s,y-61*s}},{{x+18*s,y-61*s}}}},p,2.5,1.57)
 line({{{{x,y-45*s}},{{x,y+13*s}}}},p,7*s)
end
'''
    if job['preset'] == 'background':
        scene = '''wash(everywhere(),night,2.7)
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
'''
        correction = '''-- Observation-led correction: bridge rail light, broken warm reflection, stone edge.
line({{275,292},{664,292}},light,4)
for i=1,9 do local y=403+i*12; local dx=(y-365)*.45; line({{565-dx,y},{588+dx,y}},gold,3) end
line({{283,330},{283,435}},gold,3)
'''
    elif job['preset'] == 'card':
        scene = '''wash(everywhere(),night,3)
wash(E(500,495,369,426),teal,2.8)
wash(E(510,343,228,241),gold,2.7)
wash(E(510,343,203,216),night,3)
for _,t in ipairs{{104,1020,3.0},{879,1110,3.5},{220,940,1.8},{782,880,2.1}} do tree(t[1],t[2],t[3],ink) end
wash(P{{0,1370},{224,1240},{449,1290},{645,1228},{1000,1340},{1000,1500},{0,1500}},ink,3)
wash(E(727,844,123,143),gold,2.5)
wash(E(727,844,93,114),rust,2.8)
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
-- Lantern geometry separated from glowing surroundings.
line({{702,747},{701,684},{744,670},{769,699},{769,763}},ink,12)
wash(P{{669,774},{787,774},{803,923},{653,923}},ink,3)
wash(P{{688,793},{766,793},{777,897},{674,897}},gold,3)
wash(E(725,849,20,34),light,3)
line({{725,793},{725,899}},rust,7)
line({{669,920},{791,920}},stone,11)
for i=1,23 do local x=rand(200,850); local y=rand(1060,1420); line({{x,y},{x+2,y-6}},gold,3) end
'''
        correction = '''-- Observation-led correction: eye/hood and lantern highlights improve focal hierarchy.
line({{402,445},{444,389},{510,408}},teal,6)
line({{690,787},{772,787},{784,898}},light,5)
line({{568,772},{632,796},{690,763}},gold,4)
line({{363,1108},{331,1210},{305,1290}},teal,10)
'''
    else:
        scene = '''wash(everywhere(),night,3)
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
'''
        correction = '''-- Observation-led correction: glass frame highlight and separated carrying loop.
line({{393,337},{590,337},{612,692}},light,9)
line({{413,167},{447,138},{522,138}},light,7)
line({{332,770},{465,770}},gold,6)
'''
    result = setup + '\n--@ chunk\n' + scene
    if revision:
        result += '\n--@ chunk\n' + correction
    return result

"""Literal opponent-response specimens, without experience scoring."""
import json, shutil, hashlib, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

base = Path(__file__).resolve().parents[1] / 'verification/courtyard-depth-20261017'
out = base / 'delivery'
out.mkdir(exist_ok=True)
font = lambda n: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', n)
proof = []
details = []
folders=sys.argv[1:] or ['final-defence','final-pressure']
assert folders and set(folders)<={'final-defence','final-pressure'}
for folder in folders:
    root = base / folder
    data = json.loads((root / 'defence-observation.json').read_text())
    source = json.loads((root / 'capture-source.json').read_text())
    expected = {'NORMAL','HARD'} if folder == 'final-defence' else {'NORMAL'}
    assert {f['difficulty'] for f in data['frames']} == expected, 'Observed menu-selection metadata mismatch'
    raw = Path(source['rawDirectory'])
    keep = root / 'review-source-frames'
    keep.mkdir(exist_ok=True)
    pairs = []
    for reply in data['frames']:
        if reply['hit']['actor'] != 1 or reply['hit']['technique'] == 'serve':
            continue
        launches = [f for f in data['frames'] if f['round'] == reply['round'] and f['pointCount'] == reply['pointCount'] and f['hit']['actor'] == 0 and f['hit']['shot'] == 'drop' and f['shotIndex'] == reply['shotIndex']-1]
        if launches:
            pairs.append((launches[-1], reply))
    # The first three genuine replies in each difficulty/round; all originals
    # remain retained. Pressure specimens are separate from centre-soft.
    selected = []
    groups = {}
    for pair in pairs:
        key = (pair[1]['difficulty'], pair[1]['round'])
        groups.setdefault(key, []).append(pair)
    for values in groups.values():
        selected.extend(values[:3])
    assert selected, folder
    sheet = Image.new('RGB', (1280, 90+len(selected)*300), '#122632')
    d = ImageDraw.Draw(sheet)
    d.text((16, 12), folder+' | literal launch / movement / actual AI return', font=font(24), fill='#ffe0a0')
    d.text((16, 49), 'Original UI inputs. No interpolation, held pose, time injection or normal-speed/listening claim.', font=font(17), fill='#bdd1d6')
    records = []
    for row, (launch, reply) in enumerate(selected):
        y = 90+row*300
        d.text((12, y), f"{reply['difficulty']} round{reply['round']} / sim {launch['hit']['time']:.3f} -> {reply['hit']['time']:.3f} / {reply['hit']['technique']}", font=font(19), fill='#ffdb98')
        samples = []
        for col, fraction in enumerate([0, .33, .67, 1]):
            perf = launch['perf']+(reply['perf']-launch['perf'])*fraction
            if col in [0, 3]:
                selected_file = root / (launch if col == 0 else reply)['file']
                label = 'Actual human contact' if col == 0 else 'Actual AI contact'
                actual_perf = (launch if col == 0 else reply)['perf']
            else:
                target = (source['origin']+perf)/1000
                index = min(range(len(source['frames'])), key=lambda i: abs(source['frames'][i]['timestamp']-target))
                name = f'{index:06d}.jpg'
                selected_file = keep / name
                if (raw / name).exists():
                    shutil.copyfile(raw / name, selected_file)
                assert selected_file.is_file()
                actual_perf = source['frames'][index]['timestamp']*1000-source['origin']
                label = f'Actual CDP{index}'
            image = ImageOps.contain(Image.open(selected_file).convert('RGB'), (320, 230))
            sheet.paste(image, (col*320+(320-image.width)//2, y+60))
            d.text((col*320+6, y+31), label, font=font(15), fill='#edf4ef')
            samples.append({'file': str(selected_file.relative_to(base)), 'perf': actual_perf, 'sha256': hashlib.sha256(selected_file.read_bytes()).hexdigest()})
        details.append({'folder': folder, 'reply': reply})
        records.append({'difficulty': reply['difficulty'], 'round': reply['round'], 'launch': {k:v for k,v in launch.items() if k!='png'}, 'reply': {k:v for k,v in reply.items() if k!='png'}, 'literalSamples': samples})
    if folder == 'final-pressure':
        report = json.loads((root/'defence-review-report.json').read_text())
        matches = [json.loads(line.split('DROP MATCH ',1)[1]) for line in report['logs'] if line.startswith('DROP MATCH ')]
        direct = {(a['hit']['time'],a['hit']['target']['x'],a['hit']['target']['z']) for m in matches for a in m['attempts'] if a['directWinner'] and a['hit']['quality'] in ['good','perfect']}
        winners = []
        for point in data['points']:
            if point['point']['winner'] != 0:continue
            launches = [f for f in data['frames'] if f['round']==point['round'] and f['hit']['actor']==0 and f['hit']['time']<point['time']]
            if not launches:continue
            launch = max(launches,key=lambda f:f['hit']['time']);h=launch['hit']
            if (h['time'],h['target']['x'],h['target']['z']) in direct:winners.append((launch,point))
        assert winners, 'No literal GOOD/PERFECT direct-winner specimen'
        launch,point=winners[0];target=(source['origin']+point['perf'])/1000
        selection=json.loads((base/'point-frame-selection.json').read_text())
        assert selection['sourceCaptureSha256']==hashlib.sha256((root/'capture-source.json').read_bytes()).hexdigest(), 'Point UI selection requires fresh manual source-frame review'
        index=selection['reviewedPointUiFrame']
        selected_file=keep/f'{index:06d}.jpg'
        if (raw/selected_file.name).exists():shutil.copyfile(raw/selected_file.name,selected_file)
        assert selected_file.is_file()
        winner_sheet=Image.new('RGB',(1280,470),'#122632');wd=ImageDraw.Draw(winner_sheet)
        wd.text((16,10),'Actual pressure winner | '+launch['hit']['quality']+' drop -> '+point['point']['reason'],font=font(24),fill='#ffe0a0')
        for col,p,label in [(0,root/launch['file'],'Actual launch canvas'),(1,selected_file,'Actual reviewed point UI / CDP'+str(index))]:
            wd.text((col*640+12,50),label,font=font(19),fill='#ffdb98')
            im=ImageOps.contain(Image.open(p).convert('RGB'),(640,390));winner_sheet.paste(im,(col*640+(640-im.width)//2,80))
        winner_sheet.save(out/'09-pressure-winner.png')
        (base/'pressure-winner-source.json').write_text(json.dumps({'launch':launch,'point':point,'cdpFrameIndex':index,'file':str(selected_file.relative_to(base)),'sha256':hashlib.sha256(selected_file.read_bytes()).hexdigest(),'method':'Original GOOD/PERFECT direct-winner flag correlated to actual launch and point, paired with a manually inspected actual score/point UI frame. Point CPU timestamp alone initially selected a still-old HUD; neighboring sources and correction are retained. No physical latency inference, synthetic pose, replacement sound or time scaling.'},indent=2)+'\n')
    name = '02-centre-defence-frames.png' if folder == 'final-defence' else '03-pressure-defence-frames.png'
    sheet.save(out / name)
    proof.append({'folder': folder, 'observedPairs': len(pairs), 'selectedPairs': len(selected), 'sheet': 'delivery/'+name, 'records': records, 'points': data['points']})
detail_sheet = Image.new('RGB', (1280, 90+((len(details)+1)//2)*300), '#122632')
draw = ImageDraw.Draw(detail_sheet)
draw.text((16, 14), 'Actual opponent contact detail | nearest-neighbor display crops', font=font(24), fill='#ffe0a0')
draw.text((16, 52), 'Original post-render PNGs; no generated poses, contact rescheduling or added shuttle marks.', font=font(18), fill='#bdd1d6')
for i, item in enumerate(details):
    r = item['reply']; image = Image.open(base/item['folder']/r['file']).convert('RGB')
    w,h = image.size; box = r['opponentScreenBounds']; box = (max(0,int(box[0])),max(0,int(box[1])),min(w,int(box[2]+1)),min(h,int(box[3]+1)))
    crop = image.crop(box); crop = ImageOps.contain(crop,(620,245),method=Image.Resampling.NEAREST)
    x,y = (i%2)*640,90+(i//2)*300
    draw.text((x+12,y),f"{r['difficulty']} / sim{r['hit']['time']:.3f} / {r['hit']['technique']}",font=font(20),fill='#ffdb98')
    detail_sheet.paste(crop,(x+(640-crop.width)//2,y+40))
detail_sheet.save(out/'08-opponent-contact-detail.png')
(base / ('defence-review-sources.json' if len(folders)==2 else 'centre-review-sources.json')).write_text(json.dumps({'method': 'Actual read-only post-render human/AI contact PNG endpoints and two unmodified CDP source frames between them; no synthesized positions or interpolated frames. These specimens support a bounded visual review only. Original controller gates and trace remain separate.', 'sets': proof}, indent=2)+'\n')
print(json.dumps({'sets': [(s['folder'], s['observedPairs'], s['selectedPairs']) for s in proof]}))

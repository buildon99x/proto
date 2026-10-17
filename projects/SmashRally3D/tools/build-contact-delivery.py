"""Render literal swing specimens and an already manually reviewed frozen scorecard."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

base = Path(__file__).resolve().parents[1] / 'verification/contact-clarity-20261017'
out = base / 'delivery'
out.mkdir(exist_ok=True)
load = lambda name: json.loads((base / name).read_text())
font = lambda size: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', size)
qualification = load('qualification.json')
assert qualification['automatedGates']['allPass']
sequences = load('final-swing/sequences.json')['sequences']
sheet = Image.new('RGB', (1920, 90 + len(sequences) * 250), '#132333')
draw = ImageDraw.Draw(sheet)
draw.text((16, 10), 'Actual ordinary-input swing frames | no injected pose, held clock or interpolated image', font=font(25), fill='#ffe0a0')
draw.text((16, 48), 'Preparation / acceleration / real contact / follow-through / return / ready. Full PNGs and poses retained.', font=font(21), fill='#c4d7da')
for row, sequence in enumerate(sequences):
    phases = {frame['phase']: frame for frame in sequence['frames']}
    selected = [phases.get(name) for name in ['prepare', 'accelerate', 'impact']]
    selected += [phases.get('follow-peak') or phases.get('follow'), phases.get('return'), phases.get('ready-returned')]
    for column, frame in enumerate(selected):
        x, y = column * 320, 90 + row * 250
        draw.text((x + 8, y), sequence['motion'] + ' / ' + (frame['phase'] if frame else 'not captured'), font=font(18), fill='#ffe0a0')
        if frame:
            draw.text((x + 8, y + 25), f"sim {frame['time']:.3f}", font=font(16), fill='#c4d7da')
            image = ImageOps.contain(Image.open(base / 'final-swing' / frame['file']).convert('RGB'), (320, 190))
            sheet.paste(image, (x + (320 - image.width) // 2, y + 50))
sheet.save(out / '04-swing-sequences.png')

prior = json.loads((base.parent / 'courtyard-depth-20261017/evaluation-final.json').read_text())
current = load('evaluation-final.json')
assert current['validationStatus'] == 'reviewed_in_stated_scope_after_software_gates_and_direct_raster_inspection'
assert current['rubricSha256'] == prior['rubricSha256']
assert current['verifiedSubtotal'] == sum(item['score'] for item in current['items'] if item['score'] is not None)
assert current['unverifiedWeight'] == sum(item['weight'] for item in current['items'] if item['score'] is None)
labels = ['Athlete/racket/net separation', 'Character material/volume', 'Court/environment hierarchy', 'Stroke/contact readability', 'Normal-speed naturalness', 'Simple basic controls', 'Aim/result explanation', 'Physical input response', 'Feel/predictability', 'Physical mobile comfort', 'Shuttle/string timbre', 'Perceived audio synchrony', 'Audio/score/volume balance', 'First-match learning', 'Score/loss/rematch flow', 'Readability/accessibility', 'Shot context and diversity', 'Observable opponent defence', 'Human fairness/depth', 'Sport/space causality']
card = Image.new('RGB', (1200, 1090), '#132333')
d = ImageDraw.Draw(card)
d.text((24, 16), 'Same frozen 100-point rubric | bounded assistant raster review', font=font(28), fill='#ffe0a0')
d.text((24, 62), f"Reviewed {prior['verifiedSubtotal']}/60 -> {current['verifiedSubtotal']}/60 | 40 points UNVERIFIED", font=font(29), fill='#edf4ef')
d.text((24, 107), 'Overall score: null. No normalization or 98 claim. Technical gates do not rate experience.', font=font(20), fill='#bfd4d7')
for x, text in [(24, 'Item'), (106, 'Original criterion'), (890, 'Prior'), (1030, 'Current')]:
    d.text((x, 155), text, font=font(21), fill='#ffe0a0')
for index, (old, item, label) in enumerate(zip(prior['items'], current['items'], labels)):
    assert old['id'] == item['id'] and old['weight'] == item['weight']
    y = 194 + index * 36
    color = '#edf4ef' if item['score'] is not None else '#91aab4'
    for x, text in [(24, item['id']), (106, label), (900, old['score']), (1045, item['score'])]:
        d.text((x, y), 'U' if text is None else str(text), font=font(21), fill=color)
notes = ['Only C2 and M2 change 3 -> 4; all other original ratings and weights are preserved.', 'M2: six centre-soft replies + two pressure patterns; actual contact crops and 1-2 winner UI reviewed.', 'No physical-device, continuous normal-speed playback, actual listening or human-strategy certification.', 'The original 569cfb7 user-tested branch remains separate from this qualified feature branch.']
for index, note in enumerate(notes):
    d.text((24, 944 + index * 33), note, font=font(18), fill='#bfd4d7')
card.save(out / '05-scorecard.png')
print(json.dumps({'swingMotions': [s['motion'] for s in sequences], 'scorecard': f"{current['verifiedSubtotal']}/{current['verifiedWeight']} reviewed; {current['unverifiedWeight']} unverified; overall null"}))

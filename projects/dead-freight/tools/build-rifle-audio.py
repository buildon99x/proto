#!/usr/bin/env python3
"""Offline, deterministic sample-backed rifle mix. Python + numpy + scipy + ffmpeg.
No oscillators, generated noise, external network calls or game audio. See audio-provenance.md.
"""
from pathlib import Path
import argparse, hashlib, json, subprocess, warnings
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, resample_poly

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-dir', required=True, type=Path, help='Private local Pixabay download cache OUTSIDE the project')
parser.add_argument('--audition', type=Path, help='Optional private WAV listening fixture OUTSIDE the project')
args = parser.parse_args()
SRC = args.source_dir.resolve()
if SRC.is_relative_to(ROOT.parents[1]):
    raise SystemExit('Raw Pixabay downloads must remain outside the project/repository.')
PROVENANCE = json.loads((ROOT/'assets/audio/provenance.json').read_text())
for record in PROVENANCE['sources']:
    file = SRC/(record['id']+'.mp3')
    if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != record['sha256']:
        raise SystemExit(f"Missing or changed licensed source {record['id']}; obtain from its recorded Pixabay page.")
OUT = ROOT / 'assets/audio/rifle'
SR = 48000
OUT.mkdir(parents=True, exist_ok=True)


def read(name):
    path = SRC / (str(name)+'.mp3')
    data = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
    result = np.frombuffer(data, dtype='<f4').astype(np.float64).reshape(-1, 2)
    assert np.all(np.isfinite(result))
    return result


def cut(data, start, length):
    start = round(start * SR)
    part = data[start:start + round(length * SR)].copy()
    return fade(part, .0005, min(.022, length * .15))


def fade(data, attack=.001, release=.025):
    data = data.copy()
    for seconds, reverse in [(attack, False), (release, True)]:
        count = min(len(data), max(2, round(seconds * SR)))
        shape = np.linspace(0, 1, count)[:, None]
        if reverse:
            data[-count:] *= shape[::-1]
        else:
            data[:count] *= shape
    return data


def filt(data, lo=45, hi=13000):
    return sosfilt(butter(2, [lo, hi], btype='bandpass', fs=SR, output='sos'), data, axis=0)


def retime(data, ratio):
    # Resampling only recorded material; ratio < 1 makes a heavier, slower component.
    return resample_poly(data, 1000, round(1000 * ratio), axis=0)


def normalize(data, peak):
    return data * (peak / max(.000001, np.max(np.abs(data))))


def mono(data):
    x = data.mean(axis=1)
    return np.column_stack([x, x])


def add(out, signal, at=0, gain=1):
    begin = round(at * SR)
    n = min(len(signal), len(out)-begin)
    if n > 0:
        out[begin:begin+n] += signal[:n] * gain


metrics = {}

def write(name, data, peak=None, sources=()):
    data = filt(data, 35, 17500)
    if peak is not None:
        data = normalize(data, peak)
    data = fade(data, .00065, .036)
    assert np.all(np.isfinite(data)) and np.max(np.abs(data)) <= .84
    pcm = np.round(data * 32767).astype('<i2')
    wavfile.write(OUT / (name+'.wav'), SR, pcm)
    x = pcm.astype(float)/32768
    metrics[name] = {'frames': len(data), 'duration': round(len(data)/SR, 6), 'channels': 2,
                     'peakDbFS': round(20*np.log10(np.max(np.abs(x))), 3),
                     'rmsDbFS': round(20*np.log10(np.sqrt(np.mean(x*x))), 3),
                     'firstSample': x[0].tolist(), 'lastSample': x[-1].tolist(),
                     'sha256': hashlib.sha256((OUT/(name+'.wav')).read_bytes()).hexdigest(), 'sourceIds': list(sources)}
    return x


near = read('99253')
far = read('98831')
handling = read('104296')
chamber = read('45010')
metal = read('31859')
wood = read('6791')
stone = read('62692')
flesh = read('32436')
shell = read('75000')
dry = read('98832')

# Recorded AR bolt return plus a separate receiver contact, deliberately at shot+45ms.
action = np.zeros((round(.095*SR),2))
add(action,normalize(filt(mono(cut(chamber,4.307,.086)),600,9400),.14))
add(action,normalize(filt(mono(cut(handling,3.022,.052)),1600,12000),.06),.012)
shots, quiets = [], []
for i, (nt, ft, speed) in enumerate([(.113,.833,1.00),(.238,.997,.985),(.363,1.165,1.017)],1):
    # Individual recorded burst attacks are isolated before the following attack.
    pressure = normalize(filt(retime(mono(cut(near,nt,.115)),speed),570,15500),.65)
    body = normalize(filt(retime(mono(cut(near,nt,.115)),.88+(i-1)*.012),60,1150),.22)
    returns = normalize(filt(cut(far,ft,.57),210,3400),.080)
    # A quiet natural metal decay adds room texture to the designed indoor return.
    room = normalize(filt(cut(metal,.692,.30),430,2600),.022)
    for indoor in [False,True]:
        out=np.zeros((round((.70 if indoor else .82)*SR),2))
        add(out,pressure);add(out,body,.003);add(out,action,.045)
        if indoor:
            for at,level in [(.019,.19),(.037,.115),(.063,.065),(.104,.035)]:
                reflected=filt(pressure,350,4400)
                # A small L/R arrival offset makes reflections wider while keeping the attack centered.
                add(out,reflected*np.array([1,.65]),at,level)
                add(out,reflected*np.array([.35,1]),at+.004,level*.62)
            add(out,room,.09)
        else:
            add(out,returns,.055)
            add(out,filt(returns,300,1500)*np.array([1,.45]),.13,.22)
            add(out,filt(returns,300,1300)*np.array([.30,1]),.137,.16)
        suffix='-indoor' if indoor else ''
        loud=write(f'shot{suffix}-{i}',out,.80,('99253','45010','104296','31859') if indoor else ('99253','98831','45010','104296'))
        if not indoor: shots.append(loud)
        quiet=np.zeros((round(.65*SR),2))
        add(quiet,filt(pressure,170,2100),0,.25);add(quiet,body,.003,.30);add(quiet,action,.045,.90)
        if indoor:
            add(quiet,filt(pressure,350,2400),.023,.075);add(quiet,room,.090,.45)
        else: add(quiet,filt(returns,220,1500),.057,.20)
        q=write(f'suppressed{suffix}-{i}',quiet,None,('99253','45010','104296','31859') if indoor else ('99253','98831','45010','104296'))
        if not indoor: quiets.append(q)

# Rifle-specific manipulation: AR15 magazine contact + separately recorded assault-rifle handling.
# These files contain only a single phase. No delayed future reload phase is baked into them.
phase_specs={
 'mag-eject':(.615,.130,.812,.100,.28,.04),
 'mag-insert':(.923,.170,2.080,.145,.36,.025),
 'mag-seat':(1.480,.110,2.081,.110,.40,.007),
 'transition':(1.872,.180,.767,.120,.15,.022),
 'close':(2.238,.115,.810,.084,.14,.013)
}
for name,(first,firstlen,second,secondlen,peak,offset) in phase_specs.items():
    out=np.zeros((round(.29*SR),2))
    add(out,normalize(filt(mono(cut(handling,first,firstlen)),200,10500),.70))
    add(out,normalize(filt(mono(cut(chamber,second,secondlen)),160,7600),.30),offset)
    write(name,out,peak,('104296','45010'))
charge=np.zeros((round(.39*SR),2))
add(charge,normalize(filt(mono(cut(chamber,3.438,.105)),160,9000),.55))
add(charge,normalize(filt(mono(cut(chamber,4.307,.145)),160,10500),.75),.156)
add(charge,normalize(filt(mono(cut(handling,2.643,.081)),480,11500),.16),.168)
write('charge',charge,.42,('45010','104296'))
drycue=np.zeros((round(.18*SR),2))
add(drycue,normalize(filt(mono(cut(dry,.082,.105)),210,11500),.80))
add(drycue,normalize(filt(mono(cut(handling,3.023,.032)),1800,14000),.12),.008)
write('dry-trigger',drycue,.18,('98832','104296'))

# Foley material/target response. Armor uses a tight metal contact and body mass layer.
for name,main,start,second,secondstart,band,pk,ids in [
 ('impact-metal',metal,.627,stone,3.510,(220,13000),.45,('31859','62692')),
 ('impact-armor',metal,3.707,flesh,1.313,(280,6100),.42,('31859','32436')),
 ('impact-wood',wood,.427,stone,2.921,(140,9200),.41,('6791','62692')),
 ('impact-stone',stone,3.509,wood,1.534,(700,14500),.40,('62692','6791')),
 ('impact-body',flesh,1.313,wood,.428,(80,2600),.33,('32436','6791'))]:
    out=np.zeros((round(.29*SR),2))
    add(out,normalize(filt(mono(cut(main,start,.24)),*band),.72))
    add(out,normalize(filt(retime(mono(cut(second,secondstart,.12)),.87),90,1400),.22),.005)
    write(name,out,pk,ids)

partial=np.zeros((round(.29*SR),2))
add(partial,normalize(filt(mono(cut(flesh,1.313,.24)),80,2800),.73))
add(partial,normalize(filt(mono(cut(metal,3.707,.080)),1300,9500),.17),.001)
add(partial,normalize(filt(mono(cut(wood,.428,.100)),140,1050),.17),.006)
write('impact-body-armored',partial,.36,('32436','31859','6791'))

# Three distinct field-recorded brass takes. Triggered by physical floor contact ONLY.
for i,t in enumerate([.108,2.369,5.486],1):
    out=np.zeros((round(.36*SR),2))
    add(out,normalize(filt(cut(shell,t,.31),1500,15500),.70))
    add(out,normalize(filt(mono(cut(stone,2.921,.045)),1700,8500),.11),.002)
    write(f'casing-{i}',out,.135,('75000','62692'))

report={'provider':'Pixabay','sampleRate':SR,'format':'PCM signed 16-bit stereo WAV',
        'status':'signal-checked; NOT listened or browser accepted',
        'distribution':'Combined DEAD FREIGHT game runtime only; not a standalone sound pack.',
        'sourceHashes':{r['id']:r['sha256'] for r in PROVENANCE['sources']},'files':metrics}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
if args.audition:
    if args.audition.resolve().is_relative_to(ROOT.parents[1]):raise SystemExit('Keep the audition fixture outside the distributed project.')
    parts=[]
    for family in [shots,quiets]:
        for x in family:parts.extend([x,np.zeros((SR//3,2))])
        burst=np.zeros((round(1.25*SR),2))
        for i in range(6):add(burst,family[i%3],i*.096,.40)
        parts.extend([burst,np.zeros((SR//2,2))])
    preview=np.concatenate(parts);assert np.max(np.abs(preview))<.95
    wavfile.write(args.audition,SR,np.round(preview*32767).astype('<i2'))
print(json.dumps({'files':len(metrics),'runtimeBytes':sum(p.stat().st_size for p in OUT.glob('*.wav')),'metrics':metrics},indent=2))

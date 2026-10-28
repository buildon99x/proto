#!/usr/bin/env python3
"""Offline, deterministic recorded firearm bank for every playable gun. Python + numpy + scipy + ffmpeg.
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


pistol = read('6349')
shotgun = read('94496')
automatic = read('89473')
pistol_handling = read('98830')
pump = read('101896')
handling = read('104296')
chamber = read('45010')
metal = read('31859')
wood = read('6791')
stone = read('62692')
flesh = read('32436')
shell = read('75000')
dry = read('98832')

# Preserve recorded gun attacks at the source rate. No pitch shifts, split-band
# pressure/body synthesis, added kick drum, metal resonator or loud bolt overlay.
# M16 excerpts end before the following report; a quiet final recorded decay
# supports each isolated single trigger event without hiding extra shots in it.
shots, quiets = [], []
shot_specs = [
 ('',automatic,'89473',[(.583,.060),(1.903,.060),(2.659,.060)],.50),
 ('pistol-',pistol,'6349',[(.141,.56)]*3,.65),
 ('shotgun-',shotgun,'94496',[(.205,.62)]*3,.72),
 # Fictional 9 mm SMG uses the same real 9 mm report, with a shorter decay.
 # Its identity comes from actual 100 ms game cadence, never from pitch changes.
 ('smg-',pistol,'6349',[(.141,.18)]*3,.30),
]
for prefix,source,source_id,windows,length in shot_specs:
    for i,(at,duration) in enumerate(windows,1):
        recorded=cut(source,at,duration)
        recorded=normalize(recorded,.74*[.98,1,.96][i-1])
        base=np.zeros((round(length*SR),2))
        add(base,recorded)
        if not prefix:
            natural_return=normalize(cut(automatic,1.30,.24),.032)
            add(base,natural_return,.045)
        for indoor in [False,True]:
            out=base.copy()
            if indoor:
                # Bounded, quiet early returns; preserve original centered attack.
                reflected=filt(recorded,120,7000)
                add(out,reflected,.019,.055)
                add(out,reflected*np.array([.7,1]),.037,.030)
            suffix='-indoor' if indoor else ''
            loud=write(f'{prefix}shot{suffix}-{i}',out,None,(source_id,))
            if not prefix and not indoor:shots.append(loud)
            # Authored attenuation, not a recording of a physical suppressor.
            # The old 2.1 kHz cut and prominent action layer are removed.
            quiet=sosfilt(butter(1,7500,btype='lowpass',fs=SR,output='sos'),out,axis=0)*.34
            q=write(f'{prefix}suppressed{suffix}-{i}',quiet,None,(source_id,))
            if not prefix and not indoor:quiets.append(q)

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

# Legacy weapon state still owns event timing; each file is one action only.
# Pistol magazine/slide are real 9 mm handling; shotgun uses real Mossberg action;
# SMG uses the recorded AR magazine/receiver Foley shared by this fictional rig.
for prefix,source,source_id,specs in [
 ('pistol-',pistol_handling,'98830',{'cycle':(1.535,.26,.25),'mag-eject':(.553,.11,.22),'mag-insert':(.572,.14,.30),'mag-seat':(.593,.095,.28),'close':(1.726,.10,.26)}),
 ('shotgun-',pump,'101896',{'cycle':(.170,.46,.30),'mag-eject':(.178,.10,.20),'mag-insert':(.488,.13,.24),'mag-seat':(.530,.085,.22),'close':(.505,.12,.24)}),
 ('smg-',handling,'104296',{'cycle':(2.980,.11,.18),'mag-eject':(.615,.13,.24),'mag-insert':(.923,.17,.30),'mag-seat':(1.480,.11,.30),'close':(2.238,.115,.23)}),
]:
    for name,(at,duration,level) in specs.items():
        # Match the game's existing recovery window without changing playback pitch.
        # Only the present mechanical cycle is composed here, never a future reload phase.
        if name=='cycle' and prefix in ['pistol-','shotgun-']:
            if prefix=='pistol-':
                out=np.zeros((round(.19*SR),2))
                add(out,cut(source,1.546,.075))
                add(out,cut(source,1.726,.085),.095)
            else:
                out=np.zeros((round(.28*SR),2))
                add(out,cut(source,.170,.115))
                add(out,cut(source,.505,.130),.135)
        else:
            clip=cut(source,at,duration)
            out=np.zeros((round((duration+.025)*SR),2))
            add(out,clip)
        write(prefix+name,out,level,(source_id,))

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
        'status':'recorded all-gun repair; signal-checked; NOT listened or browser accepted',
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

#!/usr/bin/env python3
"""Author Emberwatch's original physical/noise-based SFX. No external recordings.

Offline tooling requires Python 3, NumPy and SciPy. The game itself has no audio
runtime dependency beyond Web Audio. Run from any directory. Deterministic seed.
"""
from pathlib import Path
import hashlib
import json
import wave
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src' / 'assets'
SR = 32000
TAU = np.pi * 2
RNG = np.random.default_rng(0xE8BE2026)


def noise(n):
    return RNG.normal(0, 1, n)


def filt(x, hz, kind='lowpass', order=2):
    return signal.sosfilt(signal.butter(order, hz, kind, fs=SR, output='sos'), x)


def band(x, lo, hi):
    return filt(x, [lo, hi], 'bandpass')


def timeline(duration):
    return np.arange(round(duration * SR)) / SR


def envelope(t, attack=.0015, decay=.09):
    return (1 - np.exp(-t / attack)) * np.exp(-t / decay)


def modes(t, fundamentals, decay=.16, strength=1, start=0):
    """Damped inharmonic structural modes excited by a collision, not a note."""
    y = np.zeros(len(t))
    u = np.maximum(0, t - start)
    for i, f in enumerate(fundamentals):
        f *= RNG.uniform(.972, 1.028)
        # Each mode decays differently. Slight beating suggests material.
        y += np.sin(TAU * f * u + RNG.uniform(-.07, .07)) * envelope(u, .0007, decay / (1 + i * .3)) / (1 + i * .65)
    return y * (t >= start) * strength


def add_at(dest, sample, at, scale=1):
    start = round(at * SR)
    end = min(len(dest), start + len(sample))
    if end > start:
        dest[start:end] += sample[:end-start] * scale


def finish(x, peak=.64, loop=False):
    # DC/high-energy infrasonic removal, gentle edge ramps and controlled crest.
    x = filt(x, 36, 'highpass')
    if not loop:
        n = min(round(.005 * SR), len(x)//4)
        x[:n] *= np.linspace(0, 1, n)
        x[-n:] *= np.linspace(1, 0, n)
    x /= max(np.max(np.abs(x)), 1e-9)
    x = np.tanh(x * 1.18) / np.tanh(1.18)
    return (x * peak).astype(np.float32)


def swing(heavy=False):
    t = timeline(.54 if heavy else .33)
    n = noise(len(t))
    center = .16 if heavy else .095
    # Broad velocity envelope has an audible pass-by; no pitched oscillator.
    env = np.exp(-((t-center)/(.080 if heavy else .046))**2)
    air = band(n, 260 if heavy else 550, 4500 if heavy else 7600)
    cloth = band(noise(len(t)), 110, 780) * .8
    edge = band(n, 2700, 10100) * np.exp(-((t-center-.018)/.035)**2)
    y = (air*.65 + cloth) * env + edge * .17
    y += modes(t, [430, 1198, 2501], .075, .020, center+.035)
    return finish(y, .46 if heavy else .36)


def impact(heavy=False, metal=False):
    t = timeline(.70 if heavy else .43)
    body = filt(noise(len(t)), 185 if heavy else 270) * envelope(t, .0008, .072 if heavy else .046) * 2.8
    body += modes(t, [69, 112, 189] if heavy else [118, 191, 319], .10 if heavy else .058, .28)
    crack = band(noise(len(t)), 650, 6200) * envelope(t, .0003, .011) * .65
    leather = band(noise(len(t)), 280, 1650) * envelope(t, .001, .075) * .5
    steel = modes(t, [1631, 2789, 4352, 6981], .20 if metal else .066, .24 if metal else .042)
    debris = band(noise(len(t)), 900, 5000) * envelope(np.maximum(t-.033, 0), .01, .055) * .12
    y = body + crack + leather + steel + debris
    if heavy:
        y += filt(noise(len(t)), 420) * envelope(np.maximum(t-.035, 0), .001, .13) * .75
    return finish(y, .82 if heavy else .67)


def step():
    t = timeline(.25)
    sole = filt(noise(len(t)), 470) * envelope(t, .001, .022) * 1.8
    grit = band(noise(len(t)), 800, 5200) * envelope(t, .005, .035) * .45
    heel = modes(t, [163, 347, 881], .027, .10)
    scuff = band(noise(len(t)), 400, 4200) * envelope(np.maximum(t-.035, 0), .006, .04) * .20
    return finish(sole+grit+heel+scuff, .37)


def magic(stage):
    duration = {'charge':.47, 'release':.62, 'hit':.82}[stage]
    t = timeline(duration)
    air = band(noise(len(t)), 210, 6400)
    grain = band(noise(len(t)), 1700, 8600)
    y = np.zeros(len(t))
    if stage == 'charge':
        env = np.sin(np.pi*np.clip(t/duration, 0, 1)/2)**2 * np.clip((duration-t)/.03, 0, 1)
        y += air * env * (.15 + .09*np.sin(TAU*17*t)**2)
        y += filt(noise(len(t)), 190) * env * .35
        for j in range(8):
            # Tiny inharmonic crystal grains accumulate towards release.
            at = .04 + j*.047
            y += modes(t, [680+95*j, 1430+121*j, 2570+173*j], .048, .025+j*.004, at)
    else:
        hit = stage == 'hit'
        y += air * envelope(t, .0015, .085 if hit else .14) * .48
        y += grain * envelope(t, .001, .023) * .30
        y += filt(noise(len(t)), 190) * envelope(t, .001, .080) * (1.65 if hit else .75)
        y += modes(t, [87, 137, 219], .085, .19 if hit else .11)
        for j in range(10):
            at = j*.022 + RNG.uniform(0, .014)
            y += modes(t, [820+j*117, 1931+j*168, 3780+j*133], .14, .035*(1-j*.055), at)
    return finish(y, {'charge':.39, 'release':.56, 'hit':.69}[stage])


def monster(stage, role):
    t = timeline(.65 if stage=='tell' else .52)
    # Pulsed breath excitation through changing, inharmonic throat/body modes.
    base = [65, 91, 47][role]
    jitter = filt(noise(len(t)), 18)
    phase = TAU * np.cumsum(base*(1+.11*np.sin(TAU*5.4*t)+.08*jitter)) / SR
    glottis = np.tanh(3*np.sin(phase)) * (.68 + .32*np.sin(phase*.51))
    throat = band(glottis, 170 if role<2 else 95, 1400) * .55
    breath = band(noise(len(t)), 350, 3000 if role!=1 else 5800)
    if stage == 'tell':
        env = (1-np.exp(-t/.06)) * np.exp(-t/.19)
        y = (throat + breath*.13) * env
        y += band(noise(len(t)), 850, 3600)*envelope(t,.003,.045)*.17
    else:
        env = envelope(t, .001, .09 if role<2 else .14)
        y = (throat*.9+breath*.28)*env
        y += filt(noise(len(t)), 180)*envelope(t,.001,.06)*1.5
        y += band(noise(len(t)), 1400, 5300)*envelope(t,.001,.022)*.20
    return finish(y, .45 if stage=='tell' else .64)


def coin():
    t = timeline(.42)
    y = np.zeros(len(t))
    for at, strength in [(0,.17), (.058,.10), (.104,.049)]:
        y += modes(t, [2311, 3571, 6079, 8413], .09, strength, at)
        u=np.maximum(t-at,0)
        y += band(noise(len(t)), 2100, 8500)*envelope(u,.0004,.007)*.07*(t>=at)
    return finish(y,.28)


def level():
    t=timeline(1.75)
    y=band(noise(len(t)),350,4700)*envelope(t,.14,.35)*.27
    for j in range(14):
        y += modes(t,[390+j*47,1019+j*61,2134+j*103],.39,.035,j*.043)
    y += filt(noise(len(t)),230)*envelope(t,.10,.27)*.5
    return finish(y,.51)


def hurt():
    t=timeline(.45)
    y=np.zeros(len(t))
    y += filt(noise(len(t)),240)*envelope(t,.0008,.06)*2.1
    y += band(noise(len(t)),370,2400)*envelope(t,.001,.047)*.7
    y += modes(t,[74,124,253],.08,.25)
    # Cloth/armor drag instead of an electronic alarm.
    y += band(noise(len(t)),900,3900)*envelope(np.maximum(t-.03,0),.018,.075)*.22
    return finish(y,.75)


def die():
    t=timeline(1.20)
    y=np.zeros(len(t))
    add_at(y,impact(True),0,.8)
    add_at(y,step(),.19,.75)
    y += band(noise(len(t)),100,1800)*envelope(np.maximum(t-.08,0),.06,.24)*.45
    y += modes(t,[91,157,291,783],.35,.10,.06)
    return finish(y,.70)


def dash():
    t=timeline(.36)
    y=band(noise(len(t)),190,2800)*np.exp(-((t-.10)/.06)**2)*.75
    y+=band(noise(len(t)),700,5300)*envelope(t,.003,.055)*.2
    y+=filt(noise(len(t)),200)*envelope(t,.003,.03)*.6
    return finish(y,.42)


def axe_whirl():
    t=timeline(1.12)
    y=np.zeros(len(t))
    for at,gain in [(0,.72),(.20,.85),(.42,1),(.68,.78)]:
        add_at(y,swing(True),at,gain)
    y+=modes(t,[351,971,2249],.13,.022,.10)
    return finish(y,.59)


def war_cry():
    t=timeline(.96)
    # Nonverbal battle breath: rich glottal excitation and vocal-tract bands.
    pitch=132-32*np.clip(t/.55,0,1)+3*np.sin(TAU*7*t)
    phase=TAU*np.cumsum(pitch)/SR
    excitation=sum(np.sin(phase*h)/(h**1.15) for h in range(1,25))
    throat=band(excitation,300,800)*.68+band(excitation,1000,1650)*.35+band(excitation,2200,3100)*.14
    breath=band(noise(len(t)),350,3900)*.12
    env=(1-np.exp(-t/.024))*np.exp(-t/.26)*np.clip((.85-t)/.16,0,1)
    y=(throat+breath)*env
    y+=filt(noise(len(t)),170)*envelope(t,.003,.14)*.8
    y+=band(noise(len(t)),1200,4800)*envelope(t,.001,.022)*.10
    return finish(y,.70)


def ambience(town):
    seconds=8
    t=timeline(seconds+.6)
    n=noise(len(t))
    low=band(n,65,500)*1.2
    air=band(n,650,2500)*.10
    gust=.70+.20*np.sin(TAU*t/8)+.12*np.sin(TAU*t/4+.8)
    y=(low+air)*gust
    if town:
        for _ in range(38):
            at=RNG.uniform(.05,seconds+.4)
            u=np.maximum(t-at,0)
            y+=band(noise(len(t)),1200,6500)*envelope(u,.0008,.012)*RNG.uniform(.015,.06)*(t>=at)
    else:
        y+=modes(t,[71,119,231],1.4,.013,.5)
        y+=band(noise(len(t)),250,730)*(.1+.08*np.sin(TAU*t/8)**2)
    y=filt(y,45,'highpass')
    # End-to-start overlap renders a seamless buffer (no periodic silence).
    n=seconds*SR;c=round(.6*SR);w=np.linspace(0,1,c)
    y[:c]=y[n:n+c]*(1-w)+y[:c]*w
    y=y[:n];y=y/max(np.max(np.abs(y)),1e-9)*.30
    return y.astype(np.float32)


def wav(path, data):
    data=np.asarray(data)
    with wave.open(str(path),'wb') as f:
        f.setnchannels(1 if data.ndim==1 else data.shape[1]);f.setsampwidth(2);f.setframerate(SR)
        f.writeframes((np.clip(data,-.999,.999)*32767).astype('<i2').tobytes())


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    families={
      'slash':[swing() for _ in range(4)],
      'heavySwing':[swing(True) for _ in range(3)],
      'hit':[impact() for _ in range(4)],
      'metalHit':[impact(metal=True) for _ in range(3)],
      'heavyHit':[impact(True,True) for _ in range(3)],
      'magicCharge':[magic('charge') for _ in range(3)],
      'magicRelease':[magic('release') for _ in range(3)],
      'magicHit':[magic('hit') for _ in range(3)],
      'footstep':[step() for _ in range(4)],
      'enemyTell':[monster('tell',i) for i in range(3)],
      'enemyRelease':[monster('release',i) for i in range(3)],
      'coin':[coin() for _ in range(3)],
      'hurt':[hurt() for _ in range(3)],
      'die':[die() for _ in range(2)],
      'dash':[dash() for _ in range(3)],
      'level':[level() for _ in range(2)],
      'axeWhirl':[axe_whirl() for _ in range(2)],
      'warCry':[war_cry() for _ in range(2)],
      'ambienceTown':[ambience(True)],'ambienceDungeon':[ambience(False)]}
    clips={};parts=[];cursor=0;metrics={};gap=np.zeros(round(.04*SR),np.float32)
    for name,samples in families.items():
        clips[name]=[];metrics[name]=[]
        for x in samples:
            power=signal.convolve(x*x,np.ones(round(.012*SR))/round(.012*SR),mode='same')
            peak_time=round(int(np.argmax(power))/SR,6)
            clips[name].append({'offset':round(cursor/SR,6),'duration':round(len(x)/SR,6),'peakTime':peak_time})
            metrics[name].append({'peak':round(float(np.max(np.abs(x))),4),'rms':round(float(np.sqrt(np.mean(x*x))),4),'dc':round(float(np.mean(x)),7),'peakTime':peak_time,'sha256':hashlib.sha256(x.tobytes()).hexdigest()})
            parts.extend([x,gap]);cursor+=len(x)+len(gap)
    atlas=np.concatenate(parts);wav(OUT/'audio-fantasy.wav',atlas)
    manifest={'file':'./assets/audio-fantasy.wav','sampleRate':SR,'channels':1,'duration':round(len(atlas)/SR,6),'clips':clips}
    (OUT/'audio-manifest.js').write_text('// Original Emberwatch sample atlas. Rebuild with scripts/render-audio.py.\nexport const AUDIO_BANK = '+json.dumps(manifest,separators=(',',':'))+';\n')
    # Listening demonstration: family examples then a short designed combat mix.
    demonstration=[];cues=[];cursor=0
    for name,samples in families.items():
        x=samples[0][:SR*3]
        cues.append({'seconds':round(cursor/SR,2),'family':name})
        demonstration.extend([x,np.zeros(round(.28*SR))]);cursor+=len(x)+round(.28*SR)
    fight=np.zeros(SR*10,np.float32)
    for at,name,variant,gain in [(0,'footstep',0,.25),(.28,'footstep',1,.25),(.50,'enemyTell',2,.7),(.7,'slash',0,.8),(.82,'hit',0,.85),(1.08,'slash',1,.8),(1.20,'metalHit',1,.85),(1.55,'heavySwing',0,.9),(1.76,'heavyHit',0,1),(2.2,'enemyRelease',2,.8),(2.25,'dash',1,.8),(2.70,'axeWhirl',0,.9),(2.89,'hit',2,.65),(3.11,'hit',3,.65),(3.40,'metalHit',2,.65),(4.2,'warCry',0,.9),(5.35,'enemyTell',0,.65),(5.72,'enemyRelease',0,.8),(5.79,'hurt',0,.85),(6.50,'heavySwing',1,.9),(6.68,'heavyHit',2,.9),(6.71,'die',0,.7),(7.65,'coin',0,.6),(7.83,'coin',1,.5),(8.25,'level',0,.8)]:
        add_at(fight,families[name][variant],at,gain)
    fight=np.tanh(fight*.80)*.87
    cues.append({'seconds':round(cursor/SR,2),'family':'Warrior demonstration: three-hit combo, dodge, Whirling Axes, War Cry, hurt and finish (editorial mock sequence, not gameplay capture)'})
    demonstration.append(fight)
    demo=np.concatenate(demonstration);wav(OUT/'audio-demonstration.wav',demo)
    (OUT/'audio-review.json').write_text(json.dumps({'sampleRate':SR,'atlasBytes':(OUT/'audio-fantasy.wav').stat().st_size,'sampleCount':sum(map(len,families.values())),'families':metrics,'demonstrationCues':cues,'demonstrationPeak':float(np.max(np.abs(demo))),'listeningReview':'Not performed. Numerical signal checks are not subjective listening validation.'},indent=2)+'\n')
    print(f'Rendered {sum(map(len,families.values()))} original samples in {len(families)} families; atlas {len(atlas)/SR:.2f}s / {(OUT/"audio-fantasy.wav").stat().st_size:,} bytes; demonstration {len(demo)/SR:.2f}s')


if __name__=='__main__':main()

#!/usr/bin/env python3
"""Deterministic low-level recorded utility Foley; source metadata and waveform checks, NOT listening acceptance."""
from pathlib import Path
import argparse,json,hashlib,subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter,sosfilt
ROOT=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--source-dir',required=True,type=Path);args=a.parse_args();source=args.source_dir.resolve()
if source.is_relative_to(ROOT.parents[1]):raise SystemExit('Raw sources must stay outside repository')
provenance=json.loads((ROOT/'assets/audio/utility-provenance.json').read_text());data={};sr=48000
for item in provenance['sources']:
 f=source/(item['id']+'.mp3')
 if hashlib.sha256(f.read_bytes()).hexdigest()!=item['sha256']:raise SystemExit('Source hash mismatch')
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-f','f32le','-ac','2','-ar',str(sr),'-']);data[item['id']]=np.frombuffer(raw,dtype='<f4').reshape(-1,2).astype(np.float64)
recipes={'utility-cloth-in':('6869',2.25,.28),'utility-cloth-out':('6869',4.00,.24),'utility-pin':('33218',2.32,.18),'utility-medical':('38722',.23,.46)}
out=ROOT/'assets/audio/rifle';manifest={'provider':'Pixabay','sampleRate':sr,'format':'PCM signed16 stereo WAV','status':'waveform-selected provisional Foley, NOT listened','distribution':'Combined game only; not a standalone sound pack','sourceHashes':{s['id']:s['sha256'] for s in provenance['sources']},'files':{}}
for name,(id,start,length) in recipes.items():
 x=data[id][round(start*sr):round((start+length)*sr)].copy();x=sosfilt(butter(2,[100,12000],fs=sr,btype='bandpass',output='sos'),x,axis=0);x-=x.mean(axis=0)
 fade=round(.012*sr);x[:fade]*=np.linspace(0,1,fade)[:,None];x[-fade:]*=np.linspace(1,0,fade)[:,None]
 # Remove fade-induced DC with a zero-ended correction window.
 window=np.ones(len(x));window[:fade]=np.linspace(0,1,fade);window[-fade:]=np.linspace(1,0,fade);x-=window[:,None]*(x.sum(axis=0)/window.sum())
 peak=np.max(np.abs(x));rms=np.sqrt(np.mean(x*x));assert rms>1e-6
 x*=min(.045/rms,.32/peak);pcm=np.rint(x*32767).astype('<i2');file=out/(name+'.wav');wavfile.write(file,sr,pcm)
 manifest['files'][name]={'frames':len(x),'duration':len(x)/sr,'channels':2,'peakDbFS':round(float(20*np.log10(np.max(np.abs(pcm))/32768)),3),'rmsDbFS':round(float(20*np.log10(np.sqrt(np.mean((pcm/32768.)**2)))),3),'firstSample':[0,0],'lastSample':[0,0],'sourceIds':[id],'sourceStart':start,'sourceLength':length,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
(out/'utility-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest['files']))

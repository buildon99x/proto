"""Typecast integration for the existing 15-beat edit. Never sends feedback."""
from pathlib import Path
import argparse, json, os, sys, wave, subprocess, hashlib
from typecast import Typecast
from typecast.models import TTSRequestWithTimestamps, SmartPrompt, Output
from typecast.exceptions import TypecastError
P=Path(__file__).resolve().parents[1]
ATTRIBUTION={'source':'api-page','generated_by':'codex'}
MODEL='ssfm-v30'

def request_for(beats,index,voice):
    b=beats[index]
    return TTSRequestWithTimestamps(voice_id=voice,text=b['narration'],model=MODEL,language='kor',prompt=SmartPrompt(emotion_type='smart',previous_text=beats[index-1]['narration'] if index else '',next_text=beats[index+1]['narration'] if index+1<len(beats) else ''),output=Output(audio_format='wav',audio_tempo=1.0,remove_silence_ms=150,target_lufs=-16))

def audio_bytes(result):
    value=result.audio_bytes
    return value() if callable(value) else value

def assemble(beats,folder,destination):
    """Place unchanged per-beat audio at planned times; never truncate/speed speech."""
    rate=44100; total=50*rate; pcm=bytearray(total*2); manifest=[]
    for b in beats:
        src=folder/f"beat-{b['id']:02}.wav"
        if not src.is_file():raise ValueError(f"Missing beat {b['id']}; full narration not assembled")
        decoded=subprocess.check_output(['ffmpeg','-v','error','-i',str(src),'-f','s16le','-ar',str(rate),'-ac','1','pipe:1'])
        duration=len(decoded)/2/rate; slot=b['end']-b['start']
        if duration>slot-.10:raise ValueError(f"Beat {b['id']} takes {duration:.2f}s, exceeds {slot-.1:.2f}s. Review pacing/scene timing; no automatic paid retry, truncation or speedup.")
        start=int(b['start']*rate)*2;pcm[start:start+len(decoded)]=decoded
        manifest.append({'beat':b['id'],'start':b['start'],'speech_duration':duration,'slot':slot,'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest()})
    destination.parent.mkdir(parents=True,exist_ok=True)
    with wave.open(str(destination),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(pcm)
    (folder/'assembly.json').write_text(json.dumps({'duration':50,'audio_retimed':False,'beats':manifest,'requires_actual_listening_and_final_QA':True},indent=2))

def main():
    ap=argparse.ArgumentParser();ap.add_argument('action',choices=['plan','recommend','generate','assemble']);ap.add_argument('--voice-id');ap.add_argument('--all',action='store_true',help='Generate all15 beats; default is first beat sample only');ap.add_argument('--allow-credit-use',action='store_true',help='Explicit invocation after credit-use authorization');args=ap.parse_args()
    beats=json.loads((P/'artifacts/script.json').read_text())['beats'];folder=P/'assets/voice/typecast'
    if args.action=='plan':
        print(json.dumps({'attribution':ATTRIBUTION,'model':MODEL,'language':'kor','beats':len(beats),'narration_characters':sum(len(b['narration']) for b in beats),'key_available':bool(os.environ.get('TYPECAST_API_KEY')),'default_generation':'one short sample; no API request in plan','full_generation_calls':15,'network_requested':False},ensure_ascii=False,indent=2));return
    if args.action=='assemble':assemble(beats,folder,P/'assets/voice/narration.wav');return
    key=os.environ.get('TYPECAST_API_KEY')
    if not key:raise ValueError('TYPECAST_API_KEY is unavailable. Do not put it in source, logs or chat.')
    # SDK keeps its own User-Agent, version/runtime and auth mechanism.
    client=Typecast(api_key=key)  # Optional attribution remains in project provenance; do not transmit.
    if args.action=='recommend':
        candidates=client.recommend_voices('한국어 성인 대상 관계·생활 심리 쇼츠 내레이션. 차분하고 공감하는 성인 화자, 광고 과장이나 의료 권위 흉내 없이 또렷하고 자연스러운 말투.',count=3)
        details=[client.voice_v3(v.voice_id).model_dump(mode='json') for v in candidates]
        print(json.dumps({'candidates':details,'language_note':'Voice metadata cannot prove Korean accent/language quality; sample listening required.'},ensure_ascii=False,indent=2));return
    if not args.allow_credit_use:raise ValueError('Generation requires explicit credit-use authorization; no TTS called.')
    if not args.voice_id:raise ValueError('Select a verified voice_id from recommendations and preview before full generation.')
    detail=client.voice_v3(args.voice_id)
    # Record selected public voice metadata; no credentials, request headers, audio/base64 or raw errors.
    folder.mkdir(parents=True,exist_ok=True)
    (folder/'voice.json').write_text(json.dumps({'attribution':ATTRIBUTION,'voice':detail.model_dump(mode='json')},ensure_ascii=False,indent=2))
    indices=range(len(beats)) if args.all else [0]
    for index in indices:
        stem=folder/f"beat-{index+1:02}"
        # Only matching complete requests may be resumed without consuming credits again.
        req=request_for(beats,index,args.voice_id);payload=req.model_dump(mode='json');digest=hashlib.sha256(json.dumps(payload,sort_keys=True,ensure_ascii=False).encode()).hexdigest();receipt=stem.with_suffix('.receipt.json')
        if stem.with_suffix('.wav').exists():
            if receipt.exists() and json.loads(receipt.read_text()).get('request_sha256')==digest:continue
            raise ValueError(f'Existing beat {index+1} differs or has no receipt; review before replacing.')
        result=client.text_to_speech_with_timestamps(req,granularity='word')
        # Preserve exact timestamps for processed audio; only add scene placement offset later.
        stem.with_suffix('.wav').write_bytes(audio_bytes(result))
        stem.with_suffix('.alignment.json').write_text(json.dumps(result.model_dump(mode='json',exclude={'audio'}),ensure_ascii=False,indent=2))
        stem.with_suffix('.srt').write_text(result.to_srt(max_seconds=4,max_chars=24))
        receipt.write_text(json.dumps({'request_sha256':digest,'attribution':ATTRIBUTION,'model':MODEL,'voice_id':args.voice_id,'beat':index+1,'actual_listening':'pending'},indent=2))
    print(json.dumps({'generated_or_resumed_beats':len(list(indices)),'full_narration_assembled':False,'next':'Listen to sample; then generate full set only if authorized. Run assemble and final QA.'}))

if __name__=='__main__':
    try:main()
    except TypecastError as e:
        # Do not leak SDK exception payloads or auth headers into logs.
        meanings={401:'API authentication failed',402:'Credits/subscription unavailable; no purchase attempted',403:'Forbidden; no workaround attempted',404:'Voice/model not found',422:'Invalid request',429:'Rate limited; no automatic retry'}
        print(json.dumps({'status':'blocked','http_status':e.status_code,'reason':meanings.get(e.status_code,'Typecast API failure'),'error_type':type(e).__name__}),file=sys.stderr);sys.exit(2)
    except Exception as e:
        if isinstance(e,ValueError):print(str(e),file=sys.stderr)
        else:print('Local operation failed: '+type(e).__name__,file=sys.stderr)
        sys.exit(2)

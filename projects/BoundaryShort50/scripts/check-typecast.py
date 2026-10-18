"""Offline contract/assembly checks; never contacts Typecast or consumes credits."""
import importlib.util,json,tempfile,wave,base64
from pathlib import Path
from typecast import Typecast
from typecast.models import TTSWithTimestampsResponse
s=importlib.util.spec_from_file_location('voice',Path(__file__).with_name('typecast-voice.py'));v=importlib.util.module_from_spec(s);s.loader.exec_module(v)
beats=json.loads((v.P/'artifacts/script.json').read_text())['beats']
req=v.request_for(beats,1,'tc_test').model_dump(mode='json')
assert req['language']=='kor' and req['model']=='ssfm-v30' and req['prompt']['previous_text']==beats[0]['narration']
assert req['output']['audio_tempo']==1 and req['output']['remove_silence_ms']==150
client=Typecast(api_key='offline-placeholder',**v.ATTRIBUTION)
assert 'source=api-page' in client.session.headers['User-Agent'] and 'generated_by=codex' in client.session.headers['User-Agent']
r=TTSWithTimestampsResponse(audio=base64.b64encode(b'contract-test').decode(),audio_format='wav',audio_duration=1)
assert v.audio_bytes(r)==b'contract-test'
with tempfile.TemporaryDirectory() as d:
 folder=Path(d)
 for b in beats:
  with wave.open(str(folder/f"beat-{b['id']:02}.wav"),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(44100);w.writeframes(b'\0\0'*4410)
 dest=folder/'assembled.wav';v.assemble(beats,folder,dest)
 with wave.open(str(dest)) as w:assert w.getnframes()/w.getframerate()==50
 with wave.open(str(folder/'beat-01.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(44100);w.writeframes(b'\0\0'*44100*4)
 try:v.assemble(beats,folder,dest)
 except ValueError as e:assert 'exceeds' in str(e)
 else:raise AssertionError('Overlong speech must fail without truncating or speeding')
print(json.dumps({'pass':True,'network_calls':0,'checks':['SDK attribution header preserved','Korean timestamp request/context','SDK audio_bytes property compatibility','50s unchanged-audio placement','overlong speech rejected without paid retry']},indent=2))

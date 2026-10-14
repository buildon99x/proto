#!/usr/bin/env python3
"""Local deterministic physical-paint workflow; no services or API credentials."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
from PIL import Image, ImageStat
from recipes import PALETTES, PRESETS, program

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = 'https://github.com/aliceisjustplaying/claude-paint'
PIN = '8ee1cdd67f510a55eb6dc279e7113c593e1b282a'

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)

def read(path):
    return json.loads(Path(path).read_text())

def validate(job):
    fields = {'id', 'preset', 'style', 'palette', 'seed', 'width', 'height', 'filename', 'max_revisions', 'timeout_seconds'}
    if set(job) != fields:
        raise ValueError(f'job must contain exactly {sorted(fields)}')
    if not isinstance(job['id'], str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', job['id']):
        raise ValueError('id must be a safe lowercase slug')
    if any(not isinstance(job[key],str) for key in ['preset','style','palette']):
        raise ValueError('preset/style/palette must be strings')
    if job['preset'] not in PRESETS or job['style'] != 'oil-nocturne' or job['palette'] not in PALETTES:
        raise ValueError('unsupported preset/style/palette; see presets command')
    limits = {'seed': (0, 2**31-1), 'width': (128, 1536), 'height': (128, 1536), 'max_revisions': (0, 1), 'timeout_seconds': (10, 1800)}
    for key, (lo, hi) in limits.items():
        if type(job[key]) is not int or not lo <= job[key] <= hi:
            raise ValueError(f'{key} must be an integer in {lo}..{hi}')
    if job['width'] * job['height'] > 1500000 or not .4 <= job['width']/job['height'] <= 2.5:
        raise ValueError('canvas exceeds supported area/aspect budget')
    if not isinstance(job['filename'], str) or not re.fullmatch(r'[a-z0-9][a-z0-9_-]*\.png', job['filename']):
        raise ValueError('filename must be a simple lowercase PNG basename')
    return job

def identity(engine):
    engine = Path(engine).resolve()
    if not engine.is_file():
        raise ValueError('engine not built: run tools/bootstrap-engine.sh or set --engine')
    source = engine.parents[2]  # SOURCE/target/release/easel
    commit = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    dirty = subprocess.check_output(['git', '-C', str(source), 'status', '--porcelain', '--untracked-files=no'], text=True).strip()
    if commit != PIN or dirty:
        raise ValueError('engine must be a clean checkout of the pinned upstream commit')
    return {'repository': UPSTREAM, 'commit': commit, 'binary_sha256': digest(engine),
            'cargo_lock_sha256': digest(source/'Cargo.lock'), 'engine_version': 5,
            'binary': str(engine), 'build_profile': 'release', 'code_license': 'MIT'}

def inspect_png(path, job):
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        im.load()
        if im.format != 'PNG' or im.mode != 'RGB' or im.size != (job['width'],job['height']):
            raise ValueError(f'bad PNG export: {im.format} {im.mode} {im.size}')
        raw = im.tobytes()
        stat = ImageStat.Stat(im)
        if max(stat.stddev) < 8:
            raise ValueError('near-uniform output; manual review required before continuing')
        return {'format': 'PNG', 'mode': 'RGB', 'bit_depth': 8, 'opaque': True,
                'width': im.width, 'height': im.height, 'bytes': Path(path).stat().st_size,
                'sha256': digest(path), 'rgb_sha256': hashlib.sha256(raw).hexdigest(),
                'mean_rgb': stat.mean, 'stddev_rgb': stat.stddev, 'extrema_rgb': stat.extrema,
                'note': 'Integrity/color checks do not establish artistic quality.'}

def render(engine, lua, png, job):
    command = [str(Path(engine).resolve()), 'run', str(Path(lua).resolve()), '--out', str(Path(png).resolve()), '--width', str(job['width'])]
    start = time.monotonic()
    env = os.environ.copy()
    env['RAYON_NUM_THREADS'] = '2'
    # run has no persistent daemon. A timeout terminates this render only.
    result = subprocess.run(command, capture_output=True, text=True, timeout=job['timeout_seconds'], env=env)
    receipt = {'argv': command, 'exit_code': result.returncode, 'stdout': result.stdout,
               'stderr': result.stderr, 'elapsed_seconds': round(time.monotonic()-start,3)}
    write(Path(png).with_suffix('.receipt.json'), receipt)
    if result.returncode:
        raise RuntimeError(f'engine failed; see {Path(png).with_suffix(".receipt.json")}\n{result.stderr}')
    return receipt

def paths(run, state):
    rev = state['revision']
    return run/f'revision-{rev}.lua', run/f'revision-{rev}.png'

def current(run):
    state = read(run/'state.json')
    validate(state['job'])
    lua, png = paths(run,state)
    # Bind all mutable input and observation files to the state receipt.
    if digest(lua) != state['program_sha256'] or inspect_png(png,state['job'])['sha256'] != state['checks']['sha256']:
        raise ValueError('run files changed after rendering; create a fresh run')
    if lua.read_text() != program(state['job'],state['revision']):
        raise ValueError('recipe or job changed since generation; create a fresh run')
    return state,lua,png

def generate(args):
    job = validate(read(args.job))
    run = args.run.resolve()
    engine = identity(args.engine)
    run.mkdir(parents=True, exist_ok=False)
    lua, png = run/'revision-0.lua',run/'revision-0.png'
    lua.write_text(program(job))
    write(run/'job.json',job)
    receipt = render(args.engine,lua,png,job)
    state = {'schema_version': 1, 'job': job, 'engine': engine, 'revision': 0,
             'phase': 'awaiting-review', 'program_sha256': digest(lua), 'checks': inspect_png(png,job),
             'history': [{'action':'generate', 'revision':0, 'receipt':'revision-0.receipt.json'}]}
    write(run/'state.json',state)
    print(json.dumps({'run': str(run), 'observation': str(png), 'elapsed_seconds': receipt['elapsed_seconds']},indent=2))

def revise(args):
    state,_,_ = current(args.run)
    if state['phase'] == 'approved':
        raise ValueError('approved run is immutable; create a fresh job')
    if state['revision'] >= state['job']['max_revisions']:
        raise ValueError('correction budget exhausted')
    if identity(args.engine)['binary_sha256'] != state['engine']['binary_sha256']:
        raise ValueError('engine changed; start a fresh run')
    # This preset provides one original, bounded corrective pass. The note is an
    # observation record, not a free-text instruction interpreted by a model.
    revision = state['revision']+1
    lua,png = args.run/f'revision-{revision}.lua',args.run/f'revision-{revision}.png'
    lua.write_text(program(state['job'],revision))
    render(args.engine,lua,png,state['job'])
    state.update(revision=revision, program_sha256=digest(lua), checks=inspect_png(png,state['job']))
    state['history'].append({'action':'revise','revision':revision,'observation':args.note,
                             'correction':'preset focal highlight/silhouette pass','receipt':f'revision-{revision}.receipt.json'})
    write(args.run/'state.json',state)
    print(png)

def approve(args):
    state,_,_ = current(args.run)
    if not args.reviewer.strip():
        raise ValueError('reviewer must not be empty')
    if args.sha256 != state['checks']['sha256']:
        raise ValueError('approval hash does not match latest observation')
    state.update(phase='approved', approval={'image_sha256':args.sha256,'reviewer':args.reviewer,
                                           'visual_review':args.note,'revision':state['revision']})
    state['history'].append({'action':'approve', **state['approval']})
    write(args.run/'state.json',state)
    print('Approved latest observation; export is enabled.')

def export(args):
    state,lua,png = current(args.run)
    if state['phase'] != 'approved' or state['approval']['image_sha256'] != digest(png):
        raise ValueError('explicit hash-bound approval required')
    args.destination.mkdir(parents=True,exist_ok=False)
    name = state['job']['filename']
    (args.destination/name).write_bytes(png.read_bytes())
    (args.destination/'painting.lua').write_bytes(lua.read_bytes())
    manifest = {**state,'image':name,'painting':'painting.lua', 'palette_recipes':PALETTES[state['job']['palette']],
                'provenance': {'composition':'Original PaintedAssetStudio strokes; no included upstream artworks or logs reused.',
                               'engine':UPSTREAM,'engine_code_license':'MIT',
                               'upstream_art_logs_text_license':'CC-BY-4.0',
                               'project_code_license':'MIT','sample_art_and_logs_license':'CC-BY-4.0',
                               'sample_credit':'PaintedAssetStudio contributors, 2026'},
                'limitations':['Opaque RGB8 PNG; no alpha channel.', 'Physical pigments are not exact HEX colors.',
                               'Replaying at another width changes paint physics; it is not resizing.',
                               'Drawing timelapse is not character animation.',
                               'Exact replay is only promised for the identical binary, log and native width.']}
    write(args.destination/'manifest.json',manifest)
    print(args.destination/name)

def reproduce(args):
    state,lua,png = current(args.run)
    actual = identity(args.engine)
    if actual['binary_sha256'] != state['engine']['binary_sha256']:
        raise ValueError('same-build test needs the recorded engine binary')
    with tempfile.TemporaryDirectory(prefix='paint-replay-') as tmp:
        replay=Path(tmp)/'replay.png'
        receipt=render(args.engine,lua,replay,state['job'])
        check=inspect_png(replay,state['job'])
        equal = check['rgb_sha256']==state['checks']['rgb_sha256']
        report={'same_binary':True,'same_native_width':True,'same_rgb_pixels':equal,
                'same_png_bytes':digest(replay)==digest(png),'original':state['checks'],'replay':check,'receipt':receipt}
        write(args.run/'reproduction.json',report)
    if not equal:
        raise ValueError('decoded RGB replay mismatch')
    print('PASS: identical decoded RGB pixels; receipt in reproduction.json')

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--engine',type=Path, default=Path(os.environ.get('PAINT_EASEL',ROOT/'.engine/target/release/easel')))
    sub=parser.add_subparsers(dest='command',required=True)
    sub.add_parser('presets')
    gen=sub.add_parser('generate');gen.add_argument('job',type=Path);gen.add_argument('--run',type=Path,required=True)
    for command in ['revise','approve','export','reproduce','status','look','log','note']:
        p=sub.add_parser(command);p.add_argument('run',type=Path)
        if command in ['revise','approve','note']:
            p.add_argument('--note',required=True)
        if command=='approve':
            p.add_argument('--sha256',required=True);p.add_argument('--reviewer',required=True)
        if command=='export':
            p.add_argument('destination',type=Path)
    args=parser.parse_args()
    if hasattr(args,'note') and not args.note.strip():
        raise ValueError('review note must not be empty')
    if args.command=='presets':
        print(json.dumps({'presets':list(PRESETS),'styles':['oil-nocturne'],'palettes':PALETTES,'max_corrections':1},indent=2));return
    handlers={'generate':generate,'revise':revise,'approve':approve,'export':export,'reproduce':reproduce}
    if args.command in handlers:
        handlers[args.command](args);return
    state,lua,png=current(args.run)
    if args.command=='status':print(json.dumps(state,ensure_ascii=False,indent=2))
    elif args.command=='look':print(png.resolve())
    elif args.command=='log':print(lua.read_text())
    elif args.command=='note':
        state['history'].append({'action':'note','revision':state['revision'],'text':args.note})
        write(args.run/'state.json',state)
        print('Observation note recorded.')

if __name__=='__main__':
    try: main()
    except (ValueError,RuntimeError,FileNotFoundError,FileExistsError,subprocess.SubprocessError) as error:
        print(f'painted-studio: {error}',file=sys.stderr);sys.exit(1)

"""Fixed-build functional qualification. This does not award experience scores."""
from pathlib import Path
import hashlib
import json
import math

base = Path(__file__).resolve().parents[1] / 'verification/sideline-play-20261017'
repo = base.parents[3]
load = lambda f: json.loads((base / f).read_text())
manifest = load('source-manifest.json')
for filename, digest in manifest['sourceHashes'].items():
    assert hashlib.sha256((repo / filename).read_bytes()).hexdigest() == digest, filename
reports = {}
edge_rows = []

def check_report(folder, scenario, role):
    report = load(f'{folder}/{scenario}-report.json')
    assert report['pass'] and not report['errors'], folder
    assert report['buildEvidence']['sha256'] == manifest['bundleSha256'], folder
    assert report['buildEvidence']['modelHashes'] == manifest['modelHashes'], folder
    reports[folder] = {'file': f'{folder}/{scenario}-report.json', 'role': role, 'pass': True}
    return report

for view in ['pc', 'touch']:
    for mode in ['weak', 'good']:
        for repeat in [1, 2]:
            folder = f'final-{mode}-{view}-{repeat}'
            check_report(folder, 'sideline-play', 'ordinary visible-cue court input and actual next serve')
            data = load(f'{folder}/sideline-play.json')
            point = data['point']
            call = point['points'][-1]
            hit = point['shots'][-1]
            marker = data['marker']
            actual = point['position']
            assert call['reason'] in ['IN', 'OUT']
            legal = abs(actual['x']) <= 2.615 and abs(actual['z']) <= 6.725
            expected_winner = (1 - hit['actor']) if not legal or (actual['z'] < 0) == (hit['actor'] == 0) else hit['actor']
            assert call['winner'] == expected_winner
            assert call['reason'] == ('IN' if legal else 'OUT')
            assert marker['visible'] and marker['reason'] == call['reason'] and marker['winner'] == call['winner']
            assert math.hypot(marker['at']['x']-actual['x'], marker['at']['z']-actual['z']) < 1e-7
            assert math.hypot(marker['rendered']['x']-actual['x'], marker['rendered']['z']-actual['z']) < 1e-5
            assert marker['inRing'] == (legal and call['winner'] == hit['actor'])
            assert marker['outArms'] == (0 if marker['inRing'] else 4)
            assert point['server'] == call['winner'] == data['nextServe']['actor']
            assert point['scores'][call['winner']] == 1 and sum(point['scores']) == 1
            assert any(c['input']['accepted'] and c['input']['target']['x'] > 2.45 for c in data['commands'])
            plane = max(h['contact']['planeDistance'] for h in point['shots'])
            radial = max(h['contact']['radialDistance'] for h in point['shots'])
            assert plane <= .045001 and radial <= .225001
            max_render_error = 0
            max_speed = 0
            clipped = 0
            for f in data['frames']:
                r = f['renderedContact']
                if r:
                    max_render_error = max(max_render_error, math.dist(list(r['racket'].values()), list(r['contact'].values())))
                if f['phase'] == 'RALLY':
                    assert not f['pointMarker'] or not f['pointMarker']['visible']
                if f['phase'] in ['RALLY', 'POINT_RESOLVED']:
                    bounds = f['framing']
                    clipped += sum(p['minX'] < 0 or p['maxX'] > bounds['width'] or p['minY'] < 0 or p['maxY'] > bounds['height'] for p in bounds['players'])
            for a, b in zip(data['frames'], data['frames'][1:]):
                dt = b['time'] - a['time']
                if dt > 0 and a['phase'] == b['phase'] == 'RALLY' and a['score'] == b['score']:
                    max_speed = max(max_speed, *(math.dist(list(x['p'].values()), list(y['p'].values()))/dt for x,y in zip(a['actors'], b['actors'])))
            assert max_render_error <= .002 and max_speed <= 5.80001 and clipped == 0
            edge_returns = [h for h in point['shots'] if h['actor'] == 1 and abs(h['contact']['ball']['x']) > 2.3]
            edge_rows.append({'folder':folder, 'modeMeansVisibleWindowNotForcedQuality':mode, 'nativeTouch':data['touch'], 'actualPlayerQualities':[h['quality'] for h in point['shots'][1:] if h['actor']==0], 'actualLastTarget':hit['target'], 'actualGround':actual, 'call':call, 'score':point['scores'], 'nextActualServer':data['nextServe']['actor'], 'actualAiEdgeReturns':[{'time':h['time'],'ball':h['contact']['ball'],'quality':h['quality'],'technique':h['technique']} for h in edge_returns], 'maxPlaneError':plane, 'maxRadialError':radial, 'maxRenderedRacketError':max_render_error, 'maxActualRunSpeed':max_speed, 'clippedAthleteSamples':clipped})

assert sum(r['call']['reason'] == 'OUT' for r in edge_rows) >= 2
assert sum(r['call']['reason'] == 'IN' and r['call']['winner'] == 0 for r in edge_rows) >= 2
assert any(r['actualAiEdgeReturns'] for r in edge_rows)
for folder, scenario, role in [('final-play','aim-play','ordinary full first-to-five match and original shot controls'), ('final-defence','defence-review','original NORMAL/HARD centre-soft defence'), ('final-pressure','defence-review','original wide/clear-soft pressure'), ('final-rotation','court-resize','native continuing portrait/landscape rotation'), ('final-rally','aim-rally','three-view high-clear rally and aim'), ('final-lifecycle','mobile-input-lifecycle','native input plus explicit cancel/pause boundary fixtures'), ('final-scene','benchmark-scene','four ordinary ready views')]:
    check_report(folder, scenario, role)
assert 'Tests  83 passed (83)' in (base/'unit-tests.txt').read_text()
assert 'Test Files  15 passed (15)' in (base/'unit-tests.txt').read_text()
assert 'Compiled successfully' in (base/'root-build.txt').read_text()
assert hashlib.sha256((base.parent/'switch-benchmark-20261017/rubric.json').read_bytes()).hexdigest() == load('contract.json')['rubricSha256']
def logged(folder, scenario, prefix):
    return json.loads(next(s[len(prefix):] for s in load(f'{folder}/{scenario}-report.json')['logs'] if s.startswith(prefix)))
rallies = logged('final-rally', 'aim-rally', 'COURT FRAMING PASS ')
rotation = logged('final-rotation', 'court-resize', 'LIVE ROTATION PASS ')
defence = logged('final-defence', 'defence-review', 'DROP DEFENCE PASS ')
pressure = logged('final-pressure', 'defence-review', 'EXPERIENCE PRESSURE PASS ')
match = load('final-play/experience.json')['match']
assert max(match['scores']) == 5 and len(match['points']) == sum(match['scores'])
assert all(row['returns'] >= 6 and row['framing']['clippedPlayers'] == row['framing']['clippedShuttle'] == 0 for row in rallies['results'])
assert all(row['metrics']['returned'] >= 3 and row['metrics']['directWinners'] == 0 for row in defence['matches'])
assert pressure['returned'] and pressure['goodPerfectWinners']
result = {'status':'all_fixed_build_software_gates_pass; manual original M4 judgment separate', 'runtimeCommit':manifest['runtimeCommit'], 'bundleSha256':manifest['bundleSha256'], 'modelHashes':manifest['modelHashes'], 'reports':reports, 'ordinarySidelineCases':edge_rows, 'units':83, 'unitFiles':15, 'fullRootBuild':True, 'sourcePreservation':manifest['preservation'], 'limits':['Software Chromium only; not physical input/FPS/Safari or normal-speed watching/listening.', 'Broad/tight cue describes actual UI input, never a forced hit quality or forced winner.', 'Domain fixture, input cancellation boundary and observed actual UI play remain separate.', 'Original reference13013 pixels unavailable to this worker; parent measurements only.', 'Deployment success is a separate final-HEAD terminal receipt; remote Chromium pre-HTTP access remains blocked.', 'No score follows automatically from marker/log/test counts. Unknown40 and overallnull preserved.']}
result.update(actualFirstToFive={'scores':match['scores'],'points':match['points'],'physicalContacts':len(match['shots'])}, actualThreeViewRallies=[{'viewport':row['viewport'],'returns':row['returns'],'clippedPlayers':row['framing']['clippedPlayers'],'clippedShuttle':row['framing']['clippedShuttle'],'maxHeight':row['framing']['maxHeight'],'aimErrorsCssPx':[aim['pixelError'] for aim in row['framing']['aim']]} for row in rallies['results']], nativeRotation={'method':rotation['method'],'aimErrorsCssPx':[row['pixelError'] for row in rotation['results']]}, preservedCentreSoftDefence=[{'difficulty':row['difficulty'],'metrics':row['metrics']} for row in defence['matches']], preservedPressure=pressure)
(base/'qualification.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'pass':True,'reports':len(reports),'edgeCases':len(edge_rows),'outPoints':sum(r['call']['reason']=='OUT' for r in edge_rows)}))

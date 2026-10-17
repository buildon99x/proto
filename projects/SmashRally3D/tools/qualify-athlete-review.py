"""Consolidate fixed-JS/new-athlete-model gates; manual V2rating stays separate."""
import hashlib
import json
from pathlib import Path

base = Path(__file__).resolve().parents[1] / 'verification/athlete-form-20261017'
load = lambda name: json.loads((base / name).read_text())
manifest = load('source-manifest.json')
for file, expected in manifest['sourceHashes'].items():
    assert hashlib.sha256((base.parents[3] / file).read_bytes()).hexdigest() == expected, file
core = {
    'scene': ('final-scene', 'benchmark-scene'),
    'play': ('final-play', 'aim-play'),
    'native': ('final-native', 'aim-native'),
    'native2': ('final-native-2', 'aim-native'),
    'native3': ('final-native-3', 'aim-native'),
    'rotation': ('final-rotation', 'court-resize'),
    'defence': ('final-defence', 'defence-review'),
    'pressure': ('final-pressure', 'defence-review'),
    'rally': ('final-rally', 'aim-rally'),
    'accessible': ('final-accessible', 'accessible-overlays'),
    'flight': ('final-flight', 'high-shuttle-flight'),
    'loss': ('final-loss', 'experience-loss'),
    'dialog': ('final-dialog', 'experience-dialog'),
    'pause': ('final-pause', 'benchmark-pause'),
}
additional = {
    'interruption': ('final-interruption', 'aim-interruption'),
    'swing': ('final-swing', 'swing-sequence'),
}
diagnostics = {
    'heldContactPc': ('final-contact-pc', 'contact-acceptance'),
    'heldContactPortrait': ('final-contact-portrait', 'contact-acceptance'),
    'inputBoundary': ('final-input-lifecycle', 'mobile-input-lifecycle'),
    'geometryPc': ('phases-pc-1', 'athlete-form-study'),
    'geometryPortrait': ('phases-portrait-1', 'athlete-form-study'),
}
reports = {}
for name, (folder, scenario) in (core | additional | diagnostics).items():
    file = f'{folder}/{scenario}-report.json'
    report = load(file)
    assert report['pass'] and not report['errors'], file
    assert report['buildEvidence']['sha256'] == manifest['bundleSha256'], file
    reported_models = report['buildEvidence']['modelHashes']
    assert all(reported_models.get(model) == sha for model, sha in manifest['modelHashes'].items()), file
    if name.startswith('geometry'):
        previous = json.loads((base.parent / 'contact-clarity-20261017/qualification.json').read_text())['modelHashes']
        assert len(reported_models) == 7
        for colour in ['gold', 'violet']:
            assert reported_models[f'athlete-{colour}-baseline.glb'] == previous[f'athlete-{colour}.glb']
    else:
        assert reported_models == manifest['modelHashes'], file
    reports[name] = {'file': file, 'pass': True, 'errors': [], 'bundleSha256': report['buildEvidence']['sha256']}
assert '81 strict units, exact asset invariants and full root build exit=0' in (base / 'checks.txt').read_text()
assert 'Tests  81 passed (81)' in (base / 'tests-final.txt').read_text()
assert 'Test Files  14 passed (14)' in (base / 'tests-final.txt').read_text()
rubric = base.parent / 'switch-benchmark-20261017/rubric.json'
assert hashlib.sha256(rubric.read_bytes()).hexdigest() == load('frozen-contract.json')['rubricSha256']
assert all(all(row[key] for key in ['cameraIdentical', 'bodyProjectionIdentical', 'courtTargetProjectionsIdentical', 'shuttleProjectionIdentical', 'noSpectators']) for row in load('camera-preservation.json')['results'])
assert all(row['originalRepeatIdentical'] and row['runtimeOffIdentical'] and row['runtimeOnRestoredIdentical'] and row['sameTimeCameraContact'] and row['outsideApertureChangedPixels'] == 0 for row in load('final-pixel-proof.json'))
experience = load('final-play/experience.json')
match = experience['match']
aim = {}
for folder in ['final-play', 'final-native', 'final-native-2', 'final-native-3', 'final-rally']:
    data = load(f'{folder}/aim-observation.json')
    assert data['events']
    assert all(e['window']['strength'] == 0 for e in data['contacts'] if e['actor'] == 0)
    aim[folder] = {'actualTargetEvents': len(data['events']), 'distinctIntentCopies': len(data['intents']), 'maxMarkerTransformErrorM': max(e['markerErrorM'] for e in data['events']), 'ownContactsWithVisibilityOff': sum(e['actor'] == 0 for e in data['contacts'])}
rally_report = load('final-rally/aim-rally-report.json')
rally = json.loads(next(line[len('COURT FRAMING PASS '):] for line in rally_report['logs'] if line.startswith('COURT FRAMING PASS ')))
rotation_report = load('final-rotation/court-resize-report.json')
rotation = json.loads(next(line[len('LIVE ROTATION PASS '):] for line in rotation_report['logs'] if line.startswith('LIVE ROTATION PASS ')))
pressure = load('final-pressure/defence-review-report.json')
centre = load('final-defence/defence-review-report.json')
rows = lambda report: [json.loads(line.split('DROP MATCH ', 1)[1]) for line in report['logs'] if line.startswith('DROP MATCH ')]
compact = lambda row: {key: row[key] for key in ['difficulty', 'pattern', 'scores', 'metrics']}
result = {
    'validationStatus': 'all_software_checks_pass; experience ratings recorded separately',
    'baselineCommit': '3f181892613ef7c4b898534efc062bb22f36f362',
    'runtimeCommit': 'e03a1198ff20f44dec3b1aa79a85eb49aed7165e',
    'runtimeBundleSha256': manifest['bundleSha256'],
    'modelHashes': manifest['modelHashes'],
    'automatedGates': {'unitTests': 81, 'unitFiles': 14, 'fullRootBuild': True, 'originalFunctionalBrowserCases': len(core), 'additionalFunctionalCases': len(additional), 'separateDiagnosticCases': len(diagnostics), 'allPass': True, 'reports': reports},
    'cameraAndCourt': {'ordinaryReadyViews': 4, 'cameraBodyJointsCourtTargetsShuttleProjectionsIdentical': True, 'athletePixelsIntentionallyChanged': True, 'physicsAiPredictionPoseAndCameraUnchanged': True, 'threeOtherModelsUnchanged': True, 'proof': ['camera-preservation.json', 'source-manifest.json', 'asset-invariants.json']},
    'geometryComparison': load('pixel-isolation.json'),
    'assetInvariants': load('asset-invariants.json'),
    'knownLegacyPortraitPointCamera': load('legacy-portrait-point-camera.json'),
    'contactMaterialComparison': load('final-pixel-proof.json'),
    'actualMatch': {'score': match['scores'], 'physicalContacts': len(match['shots']), 'renderedContactSamples': len(experience['renderedContacts']), 'maxRacketCentreErrorM': max(c['centreErrorM'] for c in experience['renderedContacts']), 'hitAudioEvents': match['audioEvents'], 'pointAudioEvents': match['pointAudioEvents'], 'mutedHitEvents': experience['muted']['audioEvents'], 'mutedPointEvents': experience['muted']['pointAudioEvents']},
    'aimObservation': aim,
    'liveViewportRallies': [{'view': row['viewport'], 'returns': row['returns'], 'taps': row['taps'], 'clippedPlayers': row['framing']['clippedPlayers'], 'clippedShuttle': row['framing']['clippedShuttle'], 'nearCourtClippingSamples': row['framing']['clippedCourt'], 'maxAimRoundTripErrorCssPx': max(a['pixelError'] for a in row['framing']['aim']), 'maxContrastAnchorErrorCssPx': row['framing']['contrast']['maxAnchorError']} for row in rally['results']],
    'nearCourtCropping': 'Existing reference composition intentionally crops the near baseline; it is not a zero-court-clipping claim.',
    'continuingRotation': {'quality': 'MEDIUM', 'dpr': 2, 'actualAimErrorsCssPx': [r['pixelError'] for r in rotation['results']], 'method': rotation['method']},
    'aimObservationScope': 'Read-only actual post-render targets, copy and marker transforms. The rally wrapper arrays reset at page reload; per-viewport visibility/aim results remain in the original COURT FRAMING PASS logs. Numeric checks do not replace visual or physical-device experience review.',
    'opponentFacts': {'centreSoft': [compact(r) for r in rows(centre)], 'pressure': [compact(r) for r in rows(pressure)], 'goodOrPerfectPressureDirectWinners': sum(a['directWinner'] and a['hit']['quality'] in ['good', 'perfect'] for r in rows(pressure) for a in r['attempts'])},
    'interruption': load('final-interruption/interruption.json'),
    'swing': {'file': 'final-swing/sequences.json', 'motions': [s['motion'] for s in load('final-swing/sequences.json')['sequences']], 'errors': load('final-swing/sequences.json')['errors']},
    'limits': ['Chromium151 SwiftShader; no physical mouse/touch FPS or latency result.', 'Held material comparisons and synchronous DOM cancellation fixtures are separate diagnostics, not ordinary play.', 'No continuous normal-speed human playback review, actual listening, physical Safari/mobile validation or diverse human-strategy testing.', 'Reference13013 pixels were not downloaded/viewed by this worker; prior parent measurements remain the reference provenance.', 'Both569cfb7 and3f18189 candidates stay on separate remote branches.3f18189Vercel success and actual hostname come from authorized GitHub status/check-run metadata; Chromium CONNECT is transport-blocked. No proxy bypass; local passes do not prove remote delivery.', 'Frozen100-point rubric and unknown40 points remain unchanged; no98 or normalized100-point claim.'],
}
(base / 'qualification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'core': len(core), 'additional': len(additional), 'diagnostics': len(diagnostics), 'allPass': True, 'bundle': manifest['bundleSha256']}))

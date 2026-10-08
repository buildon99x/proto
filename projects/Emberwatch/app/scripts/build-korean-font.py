#!/usr/bin/env python3
"""Reproducible licensed Korean font subset; runtime needs no Python/fontTools."""
from pathlib import Path
import hashlib,json
from fontTools.ttLib import TTFont
from fontTools import subset
project=Path(__file__).resolve().parents[2]
source=Path('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
font=TTFont(source,fontNumber=1)
assert font['name'].getDebugName(1)=='Noto Sans CJK KR'
notice=font['name'].getDebugName(0)
license_data=Path('/usr/share/doc/fonts-noto-cjk/copyright').read_text()
license_text=license_data.split('License: SIL-1.1\n -----------------------------------------------------------',1)[1].split('\nLicense: GPL-3+',1)[0]
license_text='-----------------------------------------------------------'+license_text
license_text='\n'.join('' if line.strip()=='.' else line[1:] if line.startswith(' ') else line for line in license_text.splitlines())
options=subset.Options();options.name_IDs=['*'];options.name_languages=['*'];options.name_legacy=True
unicodes=set(range(0x20,0x100))|set(range(0x1100,0x1200))|set(range(0x3130,0x3190))|set(range(0xAC00,0xD7A4))|set(range(0x2000,0x2070))|set(range(0x2190,0x2200))|set(range(0x2500,0x2600))|set(range(0x3000,0x3040))|{0x26A0,0x2713,0x2715,0x2726,0x25C8,0x2212,0x221E,0x2264,0x2265}
sub=subset.Subsetter(options=options);sub.populate(unicodes=unicodes);sub.subset(font)
for record in font['name'].names:
 names={1:'Emberwatch Korean',2:'Regular',3:'EmberwatchKorean-Regular-2026',4:'Emberwatch Korean Regular',6:'EmberwatchKorean-Regular',16:'Emberwatch Korean',17:'Regular'}
 if record.nameID in names:record.string=names[record.nameID].encode(record.getEncoding(),errors='replace')
if 'CFF ' in font:
 cff=font['CFF '].cff;cff.fontNames=['EmberwatchKorean-Regular'];top=cff.topDictIndex[0];top.FullName='Emberwatch Korean Regular';top.FamilyName='Emberwatch Korean'
proof=project/'assets/fonts';runtime=project/'app/src/assets/fonts';proof.mkdir(parents=True,exist_ok=True);runtime.mkdir(parents=True,exist_ok=True)
font.save(proof/'EmberwatchKorean-Regular.otf');font.flavor='woff';font.save(runtime/'EmberwatchKorean-Regular.woff')
license_out=notice+'\n\nDerivative subset name: Emberwatch Korean\nSource: https://github.com/notofonts/noto-cjk\n\n'+license_text+'\n'
(runtime/'OFL-EmberwatchKorean.txt').write_text(license_out)
cmap=font.getBestCmap();assert all(cp in cmap for cp in range(0xAC00,0xD7A4))
report={'source':str(source),'source_family':'Noto Sans CJK KR','face':1,'license':'SIL Open Font License1.1','source_url':'https://github.com/notofonts/noto-cjk','derivative_family':'Emberwatch Korean','modern_hangul_syllables':11172,'glyphs':len(cmap),'runtime_bytes':(runtime/'EmberwatchKorean-Regular.woff').stat().st_size,'runtime_sha256':hashlib.sha256((runtime/'EmberwatchKorean-Regular.woff').read_bytes()).hexdigest()}
(proof/'provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))

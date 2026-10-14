import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'studio'))
import cli
from types import SimpleNamespace

class Workflow(unittest.TestCase):
 def setUp(self):
  self.job=cli.validate(cli.read(ROOT/'jobs/copper-lantern.json'))
 def test_validation_confines_filename_and_bounds_work(self):
  for updates in [{'filename':'../escape.png'},{'seed':True},{'width':9999},{'max_revisions':2},{'preset':'invented'}]:
   with self.subTest(updates=updates),self.assertRaises(ValueError):cli.validate({**self.job,**updates})
 def test_original_program_seed_and_revision_are_recorded(self):
  a=cli.program(self.job); b=cli.program({**self.job,'seed':100})
  self.assertNotEqual(a,b)
  self.assertEqual(a,cli.program(self.job))
  self.assertGreater(cli.program(self.job,1).count('--@ chunk'),a.count('--@ chunk'))
 def test_export_requires_latest_approval_and_detects_tampering(self):
  with tempfile.TemporaryDirectory() as tmp:
   run=Path(tmp)/'run';run.mkdir()
   lua=run/'revision-0.lua';lua.write_text(cli.program(self.job))
   png=run/'revision-0.png'
   im=Image.new('RGB',(384,384),'black');im.paste('white',(0,0,192,384));im.save(png)
   state={'job':self.job,'revision':0,'phase':'awaiting-review','program_sha256':cli.digest(lua),'checks':cli.inspect_png(png,self.job),'history':[]}
   cli.write(run/'state.json',state)
   with self.assertRaises(ValueError):cli.export(SimpleNamespace(run=run,destination=Path(tmp)/'export'))
   with self.assertRaises(ValueError):cli.approve(SimpleNamespace(run=run,sha256='wrong',reviewer='test',note='review'))
   cli.approve(SimpleNamespace(run=run,sha256=cli.digest(png),reviewer='test',note='fixture inspected'))
   cli.export(SimpleNamespace(run=run,destination=Path(tmp)/'export'))
   self.assertTrue((Path(tmp)/'export/manifest.json').is_file())
   lua.write_text(lua.read_text()+'--tamper')
   with self.assertRaises(ValueError):cli.current(run)
 def test_rgba_output_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'bad.png';Image.new('RGBA',(384,384)).save(p)
   with self.assertRaises(ValueError):cli.inspect_png(p,self.job)

if __name__=='__main__':unittest.main()

"""Actual filesystem tests for read-only reviewed-release verification."""
import hashlib,importlib.util,json,os,pathlib,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class AssetVerification(unittest.TestCase):
 def module(self):
  file=ROOT/'ci/verify_assets.py';self.assertTrue(file.is_file(),'Reviewed-asset verifier must exist')
  spec=importlib.util.spec_from_file_location('qb_ci_verify',file);assert spec is not None and spec.loader is not None;module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
 def fixture(self):
  temporary=tempfile.TemporaryDirectory(dir=os.environ.get('TMPDIR'));self.addCleanup(temporary.cleanup)
  root=pathlib.Path(temporary.name);(root/'app').mkdir();(root/'app/a.txt').write_bytes(b'reviewed bytes\n')
  return root,{'version':1,'files':{'app/a.txt':hashlib.sha256(b'reviewed bytes\n').hexdigest()}}
 def test_exact_files_are_accepted_without_writes(self):
  module=self.module();root,manifest=self.fixture();before=(root/'app/a.txt').read_bytes()
  self.assertEqual(module.verify(root,manifest),1);self.assertEqual((root/'app/a.txt').read_bytes(),before)
 def test_tamper_is_rejected_without_repair(self):
  module=self.module();root,manifest=self.fixture();(root/'app/a.txt').write_bytes(b'tampered')
  with self.assertRaisesRegex(ValueError,'hash mismatch'):module.verify(root,manifest)
  self.assertEqual((root/'app/a.txt').read_bytes(),b'tampered')
 def test_missing_file_is_rejected(self):
  module=self.module();root,manifest=self.fixture();manifest['files']={'missing.txt':'a'*64}
  with self.assertRaisesRegex(ValueError,'missing'):module.verify(root,manifest)
 def test_traversal_and_absolute_paths_are_rejected(self):
  module=self.module();root,manifest=self.fixture()
  for name in ['../outside','/outside','app/../../outside','app\\a.txt']:
   with self.subTest(name=name),self.assertRaisesRegex(ValueError,'path'):module.verify(root,{'version':1,'files':{name:'a'*64}})
 def test_symlinks_are_rejected(self):
  module=self.module();root,manifest=self.fixture();(root/'link.txt').symlink_to(root/'app/a.txt')
  with self.assertRaisesRegex(ValueError,'symlink'):module.verify(root,{'version':1,'files':{'link.txt':'a'*64}})
 def test_invalid_schema_and_hash_are_rejected(self):
  module=self.module();root,manifest=self.fixture()
  for bad in [{'version':2,'files':manifest['files']},{'version':1,'files':{}},{'version':1,'files':{'app/a.txt':'not-a-hash'}},{'version':1,'files':manifest['files'],'unexpected':True}]:
   with self.subTest(bad=bad),self.assertRaises(ValueError):module.verify(root,bad)
 def test_committed_release_manifest_covers_both_packages_and_modules(self):
  self.module();file=ROOT/'ci/reviewed-assets-v028.json';self.assertTrue(file.is_file(),'Reviewed release manifest must exist');manifest=json.loads(file.read_text())
  names=set(manifest['files']);assets={'index.html','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'}
  expected=assets|{'app/quiet-banking-v0.28/'+n for n in assets}|{'calculations/current-dates-v028/'+n for n in ['store.cjs','crypto.cjs','storage.cjs','cashflow-engine.cjs','durable-integration.js']}
  self.assertEqual(names,expected);self.assertEqual(self.module().verify(ROOT,manifest),17)
if __name__=='__main__':unittest.main()

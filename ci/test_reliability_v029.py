"""Portable candidate gate; no browser, network, package install or fixed scratch path."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'calculations/reliability-v029'
APP = ROOT / 'app/quiet-banking-v0.29'

class ReliabilityV029(unittest.TestCase):
    def test_portable_production_behaviour(self):
        result = subprocess.run(['node', '--test', '--test-reporter=tap', str(SOURCE/'adversarial.test.cjs'), str(SOURCE/'client.test.cjs')],
                                cwd=ROOT, capture_output=True, text=True, timeout=90,
                                env={**os.environ, 'QB_TARGET': str(APP)})
        print(result.stdout, result.stderr)
        self.assertEqual(result.returncode, 0)
        # A green worker-only run must not hide omission of the client suite.
        client_names = re.findall(r"test\('([^']+)'", (SOURCE/'client.test.cjs').read_text())
        self.assertGreater(len(client_names), 0)
        for name in client_names:
            self.assertIn('# Subtest: ' + name, result.stdout)
        counts = {k: int(v) for k, v in re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$', result.stdout, re.M)}
        self.assertGreater(counts['tests'], 0)
        self.assertEqual(counts['tests'], counts['pass'])
        for key in ('fail', 'cancelled', 'skipped', 'todo'):
            self.assertEqual(counts[key], 0)

    def test_deterministic_package_and_preserved_boundaries(self):
        spec = importlib.util.spec_from_file_location('qb_v029_build', SOURCE/'build.py')
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        scratch = Path(os.environ.get('TMPDIR', tempfile.gettempdir()))
        scratch.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='qb-v029-ci-', dir=scratch) as td:
            a, b = Path(td)/'a', Path(td)/'b'
            ma, mb = module.generate(a), module.generate(b)
            self.assertEqual(ma, mb)
            self.assertEqual(set(ma['assets']), {'index.html','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'})
            for name in ma['assets']:
                self.assertEqual((a/name).read_bytes(), (b/name).read_bytes())
                self.assertEqual((a/name).read_bytes(), (APP/name).read_bytes())
            print('CANDIDATE', json.dumps(ma, sort_keys=True))
        old = (module.BASE/'index.html').read_bytes()
        new = (APP/'index.html').read_bytes()
        self.assertEqual(hashlib.sha256(old).hexdigest(), module.BASE_HASH)
        scripts = lambda s: re.findall(rb'<script([^>]*)>(.*?)</script>', s, re.S)
        old_scripts, new_scripts = scripts(old), scripts(new)
        self.assertEqual(len(old_scripts), len(new_scripts))
        for (oa, oc), (na, nc) in zip(old_scripts, new_scripts):
            self.assertEqual(oa, na)
            if b'quiet-banking-pwa-client' not in oa:
                self.assertEqual(oc, nc)
        self.assertEqual(re.findall(rb'<style[^>]*>.*?</style>',old,re.S),re.findall(rb'<style[^>]*>.*?</style>',new,re.S))
        # Full markup allowlist, not merely parity of a few selected scripts.
        def normalized(s):
            s = re.sub(rb'<script id="quiet-banking-pwa-client">.*?</script>', b'PWA', s, flags=re.S)
            s = re.sub(rb'<meta name="quiet-banking-build" content="[^"]+">',b'META',s)
            s = re.sub(rb'<button id="pwa-retry".*?</button>(?:\s*<button id="pwa-update".*?</button>\s*<button id="pwa-repair".*?</button><p id="pwa-update-status".*?</p>)?', b'CONTROLS',s)
            return s.replace(b'Investment Tracker v0.29',b'Investment Tracker v0.28').replace(b'QUIET BANKING v0.29',b'QUIET BANKING v0.28')
        self.assertEqual(normalized(old),normalized(new))
        for name in module.TYPES:
            if name != 'index.html':
                self.assertEqual((module.BASE/name).read_bytes(),(APP/name).read_bytes())

if __name__ == '__main__':
    unittest.main()

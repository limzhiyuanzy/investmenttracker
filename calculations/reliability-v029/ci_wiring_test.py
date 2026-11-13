"""Regression for actual CI execution, not just a command-text snapshot."""
import contextlib
import importlib.util
import io
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]

class CIWiring(unittest.TestCase):
    def test_discovered_gate_executes_client_behaviour(self):
        spec = importlib.util.spec_from_file_location('candidate_ci', ROOT/'ci/test_reliability_v029.py')
        assert spec is not None and spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            module.ReliabilityV029('test_portable_production_behaviour').test_portable_production_behaviour()
        print(output.getvalue())
        # These named behavioural cases belong to the client suite, not worker VM tests.
        client = (Path(__file__).with_name('client.test.cjs')).read_text()
        import re
        names = re.findall(r"test\('([^']+)'", client)
        self.assertGreater(len(names), 0)
        for name in names:
            self.assertIn('# Subtest: '+name, output.getvalue())

if __name__ == '__main__':
    unittest.main()

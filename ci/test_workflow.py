"""Policy regressions for the deliberately small, non-deploying PR workflow."""
import pathlib,re,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
WORKFLOW=ROOT/'.github/workflows/quiet-banking-ci.yml'
class WorkflowPolicy(unittest.TestCase):
 def source(self):
  self.assertTrue(WORKFLOW.is_file(),'Non-browser PR workflow must exist')
  return WORKFLOW.read_text()
 def test_only_main_pull_requests_trigger_checks(self):
  s=self.source();self.assertRegex(s,r'(?m)^on:\n  pull_request:\n    branches: \[main\]$')
  self.assertIn('types: [opened, synchronize, reopened, ready_for_review]',s)
  self.assertNotRegex(s,r'(?m)^  (push|pull_request_target|workflow_dispatch|schedule|workflow_run):')
 def test_minimum_permissions_and_no_deployment_or_secrets(self):
  s=self.source();self.assertRegex(s,r'(?m)^permissions:\n  contents: read$')
  self.assertNotRegex(s,r'(?i)(secrets\.|id-token:|pages:|deploy-pages|configure-pages|pull_request_target|continue-on-error|git push|gh pr merge)')
  self.assertEqual(len(re.findall(r'(?m)^  [a-z][a-z-]*:\n    name:',s)),1)
 def test_immutable_actions_and_credential_free_exact_head_checkout(self):
  s=self.source();uses=re.findall(r'(?m)^\s+uses: (\S+)',s)
  self.assertEqual(len(uses),4)
  for action in uses:self.assertRegex(action,r'^actions/(checkout|setup-node|setup-python|upload-artifact)@[a-f0-9]{40}$')
  self.assertIn('ref: ${{ github.event.pull_request.head.sha }}',s)
  self.assertIn('persist-credentials: false',s)
  self.assertIn('EXPECTED_HEAD_SHA: ${{ github.event.pull_request.head.sha }}',s)
  self.assertIn('git rev-parse HEAD',s)
 def test_existing_gate_and_asset_checks_are_reachable(self):
  s=self.source()
  self.assertIn('python -m unittest discover -s ci -p "test_*.py" -v',s)
  self.assertIn('python ci/verify_assets.py',s)
  self.assertIn('python calculations/current-dates-v028/run-gates.py --label "ci-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"',s)
  self.assertNotIn('--native',s)
  self.assertIn('TMPDIR: ${{ runner.temp }}',s)
  self.assertIn('timeout-minutes: 15',s)
 def test_raw_gate_evidence_is_retained_on_failure(self):
  s=self.source();self.assertIn('if: ${{ !cancelled() }}',s)
  self.assertIn('path: calculations/current-dates-v028/gates/ci-*',s)
  self.assertIn('retention-days: 7',s)
  self.assertNotIn('path: .',s)
if __name__=='__main__':unittest.main()

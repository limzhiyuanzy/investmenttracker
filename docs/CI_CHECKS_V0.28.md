# Quiet Banking pull-request checks

## Implemented workflow definition

`.github/workflows/quiet-banking-ci.yml` defines one non-browser job for pull requests targeting `main`. It runs on opening, synchronization, reopening and readiness changes. It does not run on pushes to the Pages publishing branch and has no deployment or merge step.

The job has read-only repository-content permission. Checkout targets the exact PR head SHA, disables persisted credentials and verifies the checked-out commit before tests. All external actions are pinned to full commit SHAs. No repository secret, Pages permission or OIDC token is requested.

The definition pins Node 26.12.1 and Python 3.14.9, matching the preparation environment. Distribution availability was checked against official Node and GitHub Python release records. Those are explicit test-runtime choices, not a claim that they are the newest releases. Action versions and SHA pins were resolved from their official repositories.

## Executed stages

1. Run the CI policy and actual filesystem verifier regressions using Python's standard-library unittest runner.
2. Invoke the existing non-browser `run-gates.py` with a label derived only from trusted GitHub run/attempt identifiers.
3. Recheck the committed reviewed-asset manifest after rebuilding, then require no tracked changes under the candidate app/calculation paths.
4. Retain raw gate logs and receipts for seven days, including on test failure unless the run is cancelled. The artifact upload path is restricted to the generated CI gate folder, not the checkout or credentials.

`ci/reviewed-assets-v028.json` pins 17 files: the six v0.27 publishing-root files, six separately versioned v0.28 app assets and five generated v0.28 runtime modules. A mismatch fails visibly; verification never repairs files. Future release changes require an intentionally reviewed manifest update, not an automatic rewrite of expected hashes during CI.

## Test reporting

The current gate includes 33 new date/compatibility/financial tests, 66 candidate-engine tests and preserved baseline suites. It also executes retargeted legacy suites with seven explicitly reviewed superseded assertions: five handler-suite failures and two backup-suite failures. They remain raw failed assertions in their logs, not passing tests or baseline defects. The gate requires their exact names/counts and rejects unexpected failures or skipped/cancelled tests.

The CI job is successful only if the policy tests, gate and post-build byte checks complete successfully. There is no unconditional success wrapper or continue-on-error setting.

## Limits and authority

- `run-gates.py --native` remains unsupported locally and on GitHub in this source-import tree; native drivers/dependencies were intentionally omitted.
- A non-browser CI pass is not native browser, physical-iPad, hosted-app, recovery-device or performance acceptance.
- Actions run status must be read from the actual PR head/run. This document does not assert a successful hosted run.
- This workflow does not make checks required through branch protection; repository settings were not changed.
- No PR merge, Pages release, owner-device change or new financial behavior is authorized by this workflow.

`CI_PROPOSAL_V0.28.md` remains the historical planning record. Hosted runner time and setup-tool downloads are distinct from application deployment or financial-data hosting.

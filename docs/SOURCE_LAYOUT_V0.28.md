# Quiet Banking development source layout

Status: locally prepared source-import candidate. No upload, PR, merge or deployment has been authorized by this document.

## Layout

- Root `index.html`, service worker, manifest and icons remain the published v0.27 package. They are not automatically upgraded when development sources change.
- `app/quiet-banking-v0.27/` is the frozen baseline package used by the successor builder and baseline tests.
- `app/quiet-banking-v0.28/` is the separately versioned, generated candidate package. Its exact reviewed bytes are retained as a release candidate, not automatically published.
- `calculations/current-dates-v028/` contains the successor builder, date policy, bounded schedule implementation, integration source, generated runtime modules and non-browser test entrypoint.
- The selected earlier durable, backup and PWA modules are actual build/test dependencies, not bulk archives.
- v0.21/v0.25 HTML under `design/prototypes/` and the v0.26 HTML are immutable test references. Their inclusion does not reactivate abandoned design directions.
- `calculations/current-dates-v028-parent/` contains only the three individually selected synthetic compatibility-fixture files. No private parent audit directory was imported wholesale.
- `.local-preparation/`, test logs, generated diffs, browser data, actual backups and credentials are not public-source candidates.

## Local verification command

Run from the repository root with an explicitly writable temporary directory and a fresh gate label:

```bash
PYTHONDONTWRITEBYTECODE=1 python calculations/current-dates-v028/run-gates.py --label local-unique-run
```

`local-unique-run` is a template. Reusing a label is deliberately refused. This command does not run native browser tests or publish anything.

**Unsupported entrypoint:** `run-gates.py --native` is not supported in this source-import candidate, locally or in hosted CI. Native drivers and their additional dependencies were intentionally excluded. Do not invoke that option here; adding or repairing native execution requires a separate approved task.

The gate builds the candidate twice and verifies byte-identical outputs. It executes current-date units, candidate engine tests, retargeted handlers/backup checks and preserved baseline suites. Its exact superseded-assertion name sets must remain explicit. A successful gate does not mean every legacy assertion passed.

## Synthetic old-backup fixture

The oracle, fixture receipt and encrypted QBB file are disposable synthetic test material generated with the old application. The receipt's password is explicitly a public-test password, not a production credential. Never use it for real records.

Only the copied receipt's `file` and `oracle` metadata references were changed to repository-root-relative paths. Encrypted bytes, expected financial data, synthetic password and source-app fingerprint were not changed. The original private-workspace receipt was preserved. This is a packaging adaptation, not a change to the application or financial expectations.

The current compatibility test resolves the fixture filename from that receipt relative to the working directory. Therefore run the supported gate from the repository root; the gate sets that working directory for its children. General arbitrary-working-directory support is not claimed.

## Scope of local preparation verification

The non-browser gate was actually run in this imported layout with targeted Python/Node read guards refusing access to the preserved development and publication workspaces. Guard self-tests demonstrated refusal; the gate completed without denied accesses. These guards are verification instrumentation, not an OS sandbox or a general security boundary.

Generated v0.28 assets and runtime modules must match their reviewed originals. Original root publishing files must remain unchanged. Hosted CI, new browser acceptance, owner-device checks and publication remain separate gates.

## Proposed Git workflow

- Development branch: `feature/quiet-banking-v0.28`.
- Proposed source PR base: `main`.
- Distinguish the v0.27 dependency/baseline import from the v0.28 source delta in the eventual commit history.
- Do not push, open or merge a PR under local-preparation authority.
- Confirm actual Pages source settings before remote writes. A branch named `feature/` may be the live publishing branch.
- A later release PR targets the confirmed publishing branch and promotes only the exact six reviewed static app files.
- Existing-policy schedule editing remains read-only in v0.28. New post-June records may be refused by unchanged v0.27; reverting code is not a data rollback.

See `CI_CHECKS_V0.28.md` for the implemented non-browser workflow definition and its acceptance limits. `CI_PROPOSAL_V0.28.md` is the historical planning record; browser/native execution remains excluded.

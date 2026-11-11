# Quiet Banking: proposed pull-request checks

Status: local proposal only. No workflow has been installed, pushed or run on GitHub. No deployment or billing settings have been changed.

## Purpose

Make a source PR independently buildable and testable from a clean Git checkout. This proposal does not replace browser, hosted-release or owner-device acceptance.

## Proposed triggers and permissions

- Run on pull requests targeting `main`.
- Do not use `pull_request_target`.
- Do not add a deployment job, Pages permission, environment, secret reference or automatic merge.
- Give the job read-only repository-content permission.
- Check out the PR candidate without persisting Git credentials.
- Never treat changes to the publishing branch as ordinary development pushes.
- Confirm the actual Pages branch/folder settings before any later remote write. The current observed release comes from `feature/quiet-banking-pages`; observed deployment history does not prove every current setting.

Opening a public source PR makes those source files public. The final file allowlist must be approved separately before upload. Existing Git SSH access does not create a PR through the REST API or an unsigned browser session.

## Proposed initial job: build and portable tests

Use an isolated clean checkout, explicitly set a writable temporary directory, and execute the existing non-browser gate. Inspect and include its dependency closure first; do not obtain missing files from a private development directory during CI.

```bash
PYTHONDONTWRITEBYTECODE=1 python calculations/current-dates-v028/run-gates.py --label ci-unique-run
```

`ci-unique-run` is a template. The actual workflow must form a safe unique label from trusted run/attempt identifiers, not arbitrary PR text.

The gate builds v0.28 twice, verifies identical outputs and runs the following separate scopes:

- New current-date unit tests.
- Candidate financial-engine tests.
- Applicable preserved handler tests retargeted to v0.28.
- Applicable backup tests retargeted to v0.28.
- Preserved v0.27 baseline handler and backup suites.

Preserve raw command exits and TAP logs. The seven deliberately superseded legacy assertions remain actual failures within their suites: four require the removed existing-policy editing path, two require whole-engine byte identity, and one requires the old fixed-June structural cutoff. The gate must require the exact reviewed name set and count, zero unexpected failures, and no skipped/cancelled tests. It must not replace errors with unconditional success or describe the original suites as fully passing.

The imported tree must also be checked against its exact manifest and original reviewed app hashes. Root publishing assets must remain v0.27 during development preparation; the separately versioned v0.28 package is not promoted to the root automatically.

## Environment proposal and limits

The preparation host reports Python 3.14.9, Node v26.12.1 and Git 2.47.3. These observations do not prove that identical hosted tool distributions are available or that a hosted run has passed. At workflow implementation, verify available supported runtime distributions, choose explicit versions, repeat the local gate on the chosen versions where available, and record the actual hosted result separately.

The initial gate requires no application package installation. Hosted setup actions may download their requested tools and consume GitHub Actions resources; no hosted execution or spending is authorized by this document.

## Browser checks are a separate proposed stage

`run-gates.py --native` is unsupported in this source-import candidate, both locally and in hosted CI: native drivers and their additional dependencies were intentionally excluded. Do not invoke that option here. The original native-driver implementations also have environment-specific Chrome paths and a disclosed shared-name screenshot output defect; importing or repairing them requires a separate approved task.

A future browser-CI task needs its own bounded implementation and verification of executable discovery, deterministic clock contexts, temporary profiles, output namespaces, dependency-complete synthetic fixtures, real native file/IndexedDB flows and the actual network-offline boundary. Do not claim Linux-hosted browser checks establish physical iPad behavior.

Previously executed local browser results remain bound to their original source hashes and evidence; they are not newly executed results on the imported Git tree.

## Proposed merge and publication boundaries

1. A source PR targets `main`. Its baseline import and v0.28 delta must be distinguishable, preferably in separate commits after exact-diff review and owner authorization.
2. A source PR is not itself publication permission. Do not merge it automatically.
3. A later release PR targets the confirmed Pages publishing branch and promotes only the reviewed six static app files. Merging that release PR is a deployment action.
4. Publication requires exact asset/hash/MIME and waiting-update checks, followed by separately agreed owner-device checks. Never clear device storage to force the update.

## Required before claiming CI readiness

- Exact source/dependency allowlist approved for public upload.
- Local clean-layout build/test gate actually executed and its raw results retained.
- Imported runtime bytes match the reviewed release.
- Proposed workflow independently reviewed before it is installed.
- Pages publishing settings confirmed by the owner or an authorized settings read.
- Hosted workflow actually executed and checked at its exact source commit.

Until then, this remains a proposal, not working GitHub CI.

# Renato GitHub integration acceptance test

## Purpose

Exercise the installed restricted GitHub client against the approved repository using one feature branch, one atomic two-file commit and one draft pull request.

## Approved scope

- Repository: `limzhiyuanzy/investmenttracker`.
- Base branch: `main`.
- Test branch: `renato/verify-atomic-github-workflow`.
- Add this document and `docs/plans/renato-atomic-workflow-test.md` only.
- Use `commit_changes` with an explicit manifest and the independently verified branch HEAD as `expected_sha`.

## Acceptance evidence

Independently read GitHub objects after each write. Verify the branch, a single commit with the expected parent, exactly two added paths, exact uploaded bytes, and an open draft pull request targeting `main`. Compare the final `main` and `feature/quiet-banking-pages` SHAs with their recorded baselines.

This document describes the test contract, not an assertion that execution has passed. The final execution report supplies the verified commit and pull request identifiers.

## Safety boundaries

All GitHub writes must use the installed restricted client and bridge. Do not modify existing files, application code, Actions configuration or protected branches. Do not merge, deploy, access credentials or upload personal data or financial records. Stop at any failed operation and reconcile uncertain remote outcomes without blindly repeating writes.

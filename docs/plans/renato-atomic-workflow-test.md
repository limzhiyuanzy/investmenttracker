# Atomic GitHub workflow test plan

## Preconditions

1. Confirm the installed restricted client exposes `commit_changes` and the bridge socket is present.
2. Independently inspect the repository and confirm `main` is its default branch.
3. Record the SHAs of `main` and `feature/quiet-banking-pages`.
4. Confirm both approved document paths, the requested test branch and any matching pull request are absent.

## Execution

1. Create only `renato/verify-atomic-github-workflow` through the restricted client.
2. Independently verify its HEAD equals the recorded `main` baseline.
3. Prepare exactly `docs/renato-github-integration-test.md` and `docs/plans/renato-atomic-workflow-test.md` locally.
4. Validate the explicit manifest, destination paths, regular non-symlink sources, UTF-8 content, byte limits and absence of sensitive content. Retain exact content hashes.
5. Re-read the test branch HEAD and bind it to the manifest's `expected_sha`.
6. Submit both documents in one `commit_changes` operation.
7. Independently verify the resulting commit has one expected parent, exactly two added files and byte-for-byte content equality. Confirm the branch points to that commit.
8. Check again for an existing matching pull request, then create one draft pull request targeting `main`.
9. Independently verify the exact pull request is open, unmerged and draft, with the correct repository, head, base, one commit and exactly two added files.
10. Re-read both protected baseline refs and confirm neither SHA changed.

## Completion and failure handling

Report the verified branch, full commit SHA, document paths, draft pull request URL and each acceptance check. Stop on failure and report the exact stage. Do not retry an uncertain write without independently reconciling remote state. No fallback writes, extra branches, extra pull requests, existing-file edits, merges or deployments are permitted.

This plan contains test instructions only, not credentials, personal data or financial records.

# Quiet Banking v0.29 — local implementation and evidence

## State and authority

Local candidate only. Baseline `0d965610a2d776f47d48e110cf4290c665945220`, branch `feature/quiet-banking-v0.29`. Approved scope is the preserved contract and plan; this document does not amend either. Publication remains v0.28. No staging, commit, push, deployment, dependency installation, provider/configuration change, owner profile or actual records were used. Stock opening-date correction and unrelated bugs remain parked. Risk remains **trunk**: the worker selects executable code, even though it never opens financial storage.

This continuation resumed the preserved candidate rather than reimplementing it. Runtime templates, builder and generated asset bytes were not changed by the retry. Changes are CI wiring, a CI-wiring regression, a native failure supplement and this document. The existing new CI entry now invokes both adversarial and client files and checks that every currently named client subtest actually appears in TAP. An authentic pre-change run passed worker tests but failed the assertion requiring client behaviour; raw RED and GREEN are preserved under `retry-implementation/round-01/`.

Implementation evidence is not independent specification/security review or release readiness. Two source/design concerns below remain explicit review/owner gates.

## Exact package

Build **`ca3a6cd70613351f6b916829`**, directory `app/quiet-banking-v0.29/`:

| File | SHA256 |
|---|---|
| index.html | `5c805bbed34c96633422c12b5bb84bd42a3f7bc1f8db0be32be30c9229a30079` |
| sw.js | `204411aa991c6926f894b641b654d94b88675628785417aa033227ac39131949` |
| manifest.webmanifest | `7f4549c20352c364ebeae1b577aa5507801d3d815c5c0c9b34a7007fb2e665d7` |
| icon-180.png | `fec04371e4e3593012cc7edda2c1b3bdad90fca7d84d8c99f57b9974140637f8` |
| icon-192.png | `d5e9cb27cde17489a875d4de31db87a78b8180707f5d8b5f525e54390237aac7` |
| icon-512.png | `7c5677b7487cb4744a1f1ad6f165f62889064fb57b56652ffef5559d7b9a536f` |

The six-file package contains a worker, but the worker caches **five static files plus one exact non-financial build marker**; it does not cache its own worker script. No recovery page, archive, new hosting or financial-data cache is added.

`build.py` derives the page exclusively from frozen v0.28 HTML, asserting its full SHA256 `f1255a2caf4b66b5ceb7220571259cc9f5bc36aa5f4203f34f11a592b9abecd2`. It replaces two visible branding strings, the existing PWA client script, build meta content and controls in the existing inline status area. Build identity is the first 24 hex characters of SHA256 over normalized complete HTML, worker template, tag and copied assets. HTML receives that identity; worker config binds the five static asset hashes, sizes and MIME types.

CI builds twice into disposable directories and compares all six bytes against each other and the checked-in-location candidate. It checks full HTML markup normalization against an explicit allowlist, every non-PWA script and all style blocks literally, and copied manifest/icons literally. Inline font/licence/financial handlers/engines/storage/backup scripts therefore remain unchanged, not merely behaviourally similar. No crypto, schema, record, formula, stock-date or backup-format change occurred. The historical asset manifest and existing CI workflow/pins are untouched; the new package is not silently added to an old manifest.

## Static generation commit protocol

1. Cache ownership prefix is `quietbanking:pwa:v029:` + encoded registration scope + build ID + `:`. A random UUID distinguishes generations. Eligibility scans only that exact prefix.
2. A repair is one worker-local promise. Repeated valid requests join it, including requests from multiple window clients. Before staging, preserve one currently eligible generation; delete other generations of this exact scope/build only.
3. Fetch the fixed five URLs in parallel, same-origin credentials, no-store, redirect error. Each must be nonopaque/nonredirected status 200, exact configured MIME, byte length and SHA256. Each fetch/body/verification race has a 4-second abort deadline.
4. Open a new generation, write all five verified responses, then reread and verify all five. Write `__qb_static_complete__` with the exact build ID **last**. The marker write is the commit point; it is not an atomic cache rename or a transaction across files.
5. Reread the marker, require exactly six keys, and independently revalidate all five bytes before acknowledging complete. Every status and allowlisted fetch revalidates the entire generation again. Unmarked/partial/invalid generations are never eligible, including after worker restart. Two complete same-build generations contain identical configured bytes; UUID order is not chronological recency.
6. On rejection, best-effort delete the newly staged generation and return same-build unavailable. The previously verified serving generation is preserved. If cleanup itself fails, restart/status still refuses unverified generations; the next repair attempts same-build cleanup. Cache calls themselves have no independent deadline; the network deadline is not a guarantee against an indefinitely stalled browser storage implementation.

Only GETs for the exact fixed URLs are intercepted, with a navigation alias for the exact scope root. Queries/other resources are not added to the offline allowlist. Messages require a window source resolved through `clients.get`, same origin/app entry path, exactly one port, exactly one data key and one of `GET_STATUS` / `REPAIR_STATIC`. No caller-provided URL or financial payload is accepted.

Install requires complete reconstruction; activation requires an eligible generation. There is no `skipWaiting`, `clients.claim`, unregister, automatic reload, database deletion, localStorage clearing or automatic financial restoration. A verified newer worker waits for old clients to close normally. If the server has moved forward, an old worker rejects different server bytes rather than calling them a same-build repair.

## Controls and work boundaries

- **Verify offline status** queries the current controller, distinguishing preparing, reopen-needed, mismatch, ready, failed and unsupported. Ready means verified static bytes for this page build, **not** financial-save success or possession of a backup.
- **Check for updates** explicitly calls registration update, bounds registration/discovery waits at 6 seconds, and separates checking/discovery-failure from current offline readiness. Preparing, failed install and waiting are observed separately. Discovery completion does not promise that a newer release exists.
- **Repair offline files** sends the narrow worker command and has a 10-second reply deadline. It checks controller/build identity; failure explains newer server/offline/full storage possibilities without claiming a physical cause was diagnosed. It never implicitly forces an update or reload.
- Sequence/controller checks discard stale readiness replies. Repeated update/repair clicks are coalesced in the page. A client timeout is uncertainty, not proof that an already-started worker operation was cancelled.
- Existing financial event guards are unchanged. Native evidence covers precise and blank raw drafts, one real transaction held pending then committed once, delayed native encrypt/decrypt, existing backup-preview retention and explicit offline replacement under the existing pending guard. Worker operations do not advance financial revision. Drafts are session-only; finish/save before intentionally closing windows.

## Reproduction and evidence boundaries

Run from the worktree root with existing Node/Python; no package install or external service:

```sh
python calculations/reliability-v029/build.py
node --test --test-reporter=tap calculations/reliability-v029/adversarial.test.cjs calculations/reliability-v029/client.test.cjs
python calculations/reliability-v029/ci_wiring_test.py
python -m unittest discover -s ci -p 'test_*.py' -v
```

`adversarial.test.cjs` and `client.test.cjs` both import `portable.test.cjs`; Node executes that shared file once in each entry process. The CI command reports **27 passing tests**. Explicitly naming all three files reports **30**, because the three portable cases also run in their own third process. Neither total is 30 distinct behaviours. All TAP fail/cancelled/skipped/todo counts are zero. Python discovery reports **15/15**, and the dedicated wiring regression **1/1**.

Native prerequisites and exact commands used:

```sh
mkdir -p /opt/data/cache/scratch/qbr029-final-02
export TMPDIR=/opt/data/cache/scratch/qbr029-final-02
export QB_CHROME=/opt/data/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
python calculations/reliability-v029/native.py
python calculations/reliability-v029/external.py
python calculations/reliability-v029/native_failures.py
```

For a fresh rerun, select a new owned short TMPDIR. Do not reuse evidence output directories. A repository-deep TMPDIR caused Chromium's Unix singleton socket path to exceed its limit; this is preserved as a harness startup failure, not an application failure. Other preserved harness attempts exposed the special string-valued `window.status` property and the CDP auto-attach pause on restart of the same worker target. The final supplement uses a private reply name and resumes only its explicitly stopped interruption target. No app runtime change was needed.

Environment: Linux container, Python 3.14.9, Node v26.12.1, existing desktop headless Chromium, loopback HTTP secure-context exception, `--no-sandbox` and recorded browser flags. Exact Chromium product/revision, wall-clock events, HTTP records, CDP commands, executed driver copies and full synthetic native oracles are in receipts. Browser/profile setup is disposable; reports confirm profile removal. This is not hosted v0.29, physical iPad/Safari, installed Home-Screen PWA, browser eviction, disk exhaustion, OS power-loss or performance-budget proof.

### Candidate-bound result map

Evidence root: `.local-preparation/reliability-v029/retry-implementation/`.

| Requirement/boundary | Evidence and status |
|---|---|
| CI client omission | `round-01/ci-red.log`: authentic assertion failure before wiring; GREEN and final CI raw logs retained. Named client subtests now required by CI itself. |
| Determinism/full markup/script/style/copied asset parity | Python discovered CI, 15/15, two independent generated directories and comparison to current package. |
| MIME/hash/status/redirect/offline/admission/stale client replies | Production worker/client executed in Node VM with explicit adapters; **portable**, not native browser evidence for every variant. |
| Real repair/missing/corrupt caches, failed newer build retention, server-forward refusal, waiting, native drafts/save/crypto/replacement | `final-02/native-evidence/`, 41/41 named assertions, exit 0. Full DB/preference/revision oracles and actual downloaded/selected encrypted file. |
| Broken-entry actual v0.28 to actual v0.29, then genuine network-offline reopen | `final-02/external-evidence/`, 15/15, exit 0. Ordinary navigation/closing/reopening only during central discovery. Page and actual worker uncached probes fail after listener and accepted sockets close. This browser discovery mechanism was established on v0.28 baseline before v0.29; it is **not newly introduced** by this release. |
| Native interruption/coalescing/failure/overlap supplement | `native_failures.py`: 31/31 in final receipt. Two real app sources/three requests share five downloads; old generation remains ready while held. Real native Cache API writes are interrupted after first file and after marker using explicit CDP worker stop. Partial-only HTML fetch/status refuse; post-marker generation alone passes full verification. Repeated repairs leave two same-build generations. B's real installation stage survives A repair and becomes verified waiting with both A clients still open. Full native DB/preferences/revision and unrelated/future cache sentinels remain exact. |
| Write/quota/publication failure | Supplement injects a narrowly scoped `Cache.prototype.put` rejection/marker corruption **inside the real worker**, using real native caches for successful writes/readbacks. QuotaExceededError is an **adapter injection**, not actual physical/global quota exhaustion. Marker rejection and post-write invalid marker fail without losing old verified generation. Real 5.5-second delayed HTTP response hits the 4-second worker timeout. |
| Independent encrypted-file regression | Parent's unchanged-candidate `parent-native-backup/candidate-v029-r1/`, 55/55, attributed to parent, not re-executed by this implementer. Exact six asset hashes are unchanged, so candidate identity still matches. Native supplement is not a substitute for that larger independent actual-file suite. |
| Old source preservation | Retry independently compared all 70 tracked files to Git baseline; hashes and boolean equality in `final-02/preserved70.json`. Original manifest/workflow/pins unchanged, no staged diff. |

The final handoff JSON supplies exact commands, exits, counts and source/package hashes; later documentation-only edits do not invalidate unchanged runtime results. Earlier failed and successful receipts are retained rather than overwritten.

## Source-audit findings and unresolved gates

**Material storage-policy concern — cross-build accumulation.** Cleanup is bounded **per encoded scope and build**, not globally. A successful normal repair leaves up to two own-build generations (one preserved eligible plus new); the next repair removes extras. Old v0.28 caches, obsolete v0.29-build generations and abandoned other-build installs are not reclaimed. Repeated releases can accumulate code caches and increase storage pressure, potentially causing future installs/repairs to fail. The current policy intentionally protects concurrent old clients and installing/future builds. Deleting all other prefixes/builds would violate that separation and must not be silently introduced. A lifecycle-aware retention policy requires a reviewed scope/compatibility decision. No global cache bound is claimed. This is a review/owner gate, not a proven production quota incident.

**Material tooling concern — builder output ownership.** `generate(output)` / `--output` accepts an arbitrary path, creates it and directly overwrites the six names without an ownership marker, nonempty-directory guard, symlink guard or transactional package publication. Its frozen-baseline assertion protects its input, not the output destination; directing it at an old package could overwrite preserved assets. All executed commands used only the authorized v0.29 output or fresh owned temporary directories; the 70-file rehash proves those earlier files were not changed here. The builder is not exposed to app messages or web callers, but must be treated as a trusted developer tool with a manually checked destination. This hazard is reported rather than silently imposing a new output-ownership protocol on preserved tooling/fixtures. A guard policy and regression on disposable sentinel directories remain required before claiming safe arbitrary-output use.

Other missing gates: fresh sequential independent SPEC then QUALITY/SECURITY assessments; real phone/tablet controls/readability and actual existing Home-Screen iPad update/reboot/reconciliation; separately authorized hosted publication verification. VM rejection cases do not claim every native MIME/redirect/status combination. No globally induced browser quota, physical power loss, eviction, lost-backup/password or offline-corrupt-code recovery guarantee exists. No separate recovery screen was added. Completion of this bounded retry is a local evidence handoff, not approval to release.

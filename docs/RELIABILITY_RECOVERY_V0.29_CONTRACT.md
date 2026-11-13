# Quiet Banking v0.29: reliability and external recovery contract

## Authority and baseline

APPROVED FOR LOCAL IMPLEMENTATION AND DISPOSABLE SYNTHETIC TESTING. The owner said "proceed with reliability and recovery please", parked other app bugs/edits, chose publishing a fixed release as the primary external recovery route, then said "Okay please proceed to next phase". This does not authorise a remote push, PR merge, deployment, owner-device data access, real-client use, new hosting, paid service or permission change.

Source baseline: main `0d965610a2d776f47d48e110cf4290c665945220`. Published v0.28 merge: `02c8f453a0e2676a1215c7b2cdd2754f721d3bdf`. Preserved v0.28 HTML SHA256: `f1255a2caf4b66b5ceb7220571259cc9f5bc36aa5f4203f34f11a592b9abecd2`.

Work is isolated on `feature/quiet-banking-v0.29`, worktree `/opt/data/projects/investmenttracker-reliability-v029`. The original non-Git project, earlier source/builders/artifacts, publication worktrees and all real storage remain untouched. The 70 previously tracked files have a separate pre-change preservation map. Any necessary CI proposal is separate from changing existing CI or asset pins.

## Outcome

A user can explicitly check for app updates and safely repair eligible current-version offline app files. A published, verified replacement is the primary external code-recovery mechanism when an earlier cached dashboard cannot load. Recovery must retain exact local financial records and preferences without operating the broken dashboard, clearing storage or forcibly taking over open work.

Native browser update discovery may already provide external recovery; establish that baseline rather than misrepresenting existing behaviour as a new feature. Treat Git publication, browser discovery, installation, waiting, activation and successful application/data reopening as distinct evidence gates. No promise of immediate push, guaranteed background execution or physical-iPad recovery follows from desktop tests.

## Included

1. A separately versioned deterministic v0.29 builder/package and worker/client sources. Preserve the six-file package convention unless an observed blocking gap requires an approved amendment. Existing financial scripts, schemas, formulas, dates, backup crypto/format, restore guards, applied Custom semantics, style/font/licence, navigation and stock opening-date lock remain unchanged. Only app-version identifiers and the existing static-file/update status area may change.
2. A directly reachable, explicit check-for-updates action invokes the browser registration update mechanism, with bounded pending state and truthful distinction between current offline readiness, update discovery failure, preparing, waiting, failed install, mismatch and reopen-needed. Checking is not force-installing, reloading or proof of file backup possession.
3. A distinct repair-offline-files action for an already-loaded page. The worker fetches only its fixed same-origin static allowlist, rejects redirects, wrong status/type/hash, stages a full verified same-build set, and makes only a verified complete set eligible for serving. The protocol must explain restart reconciliation and avoid claiming whole-cache atomic rename, which the Cache API does not provide.
4. Preserve any usable serving set until a verified replacement is eligible. Interrupted/partial/stale repairs never become ready or mixed builds. Coalesce repeated repair requests, bound network waits and owned staging-cache accumulation, and preserve unrelated caches. Accept commands only through a narrowly validated message surface; diagnostics include no financial data, file contents, passwords or keys.
5. If the server now serves a newer build, the older worker must reject those bytes as a same-build repair. Show current-version repair unavailable and use normal verified replacement installation/waiting. No immutable old-version publication archive is added.
6. External recovery acceptance: install/control A, commit distinguishable synthetic data and applied selection, capture an independent full native-storage oracle, close app clients, corrupt/remove A's cached entry HTML, publish B in a disposable same-origin fixture, and recover by normal online navigation/closing/reopening only. No app registration/update call or browser-protocol forced update is allowed to manufacture discovery in the central no-controls scenario. Record exact attempts and lifecycle/network observations, then reconcile complete records/revision/selection after B activation and offline reopening. A failed browser update/install must not be labelled recovered.
7. Preserve open raw drafts and pending financial save/crypto/replacement boundaries during checks, repair and update preparation. Never call skipWaiting, clients.claim, unregister, automatic reload, record reset, IndexedDB deletion, localStorage clearing or automatic backup restore. Closing unfinished work remains a deliberate user action, not durable draft storage.
8. Existing encrypted-file recovery remains independently verified against the exact successor, including actual native download/file selection, nonwriting preview, explicit replacement and record/selection reconciliation across a genuine network cut. Update or code repair must not itself increment financial revision.

## Scope and risk gates

Highest risk: trunk, because worker lifecycle selects executable app code and may affect access to shared financial workflows. Worst credible failures are partial/mixed-ready code, interrupted work, false offline readiness or destructive recovery. Code rollback is not record rollback.

No separate recovery screen/URL/bootstrap is included by default. If direct external recovery fails in the supported boundary, preserve its reproduction and return the necessary recovery-route decision to the owner rather than silently building another app surface. Do not assume a Safari tab shares the installed iPad app's storage.

Other held work remains excluded: stock opening-date correction, new onboarding, policy schedule editing/history redesign, financial formula changes, schema migration, login, live-store encryption, live pricing, sync, telemetry, automatic/cloud backup, hosting/origin migration and redesign. No guarantee of recovery after storage eviction, lost backup/password/device, or offline code corruption without a usable cached replacement.

## Acceptance and delivery

- Test-first missing behaviours: observable explicit update check and real worker repair admission/publication. Preserve authentic RED evidence and baseline passes. No false RED from import/selector errors.
- Same-build repair, wrong MIME/hash/status, redirects, timeout/offline/quota/write rejection, partial staging, termination/restart, duplicate requests, multiple clients, repair overlapping new-worker install and stale replies. No eligible partial/mixed cache; bounded cleanup restricted to owned code caches.
- Broken-entry A-to-B external update, failed B retention and subsequent good B retry, normal waiting with an open old client, exact native record/preference/revision continuity, and genuine network-offline reopen.
- Pending native financial save and delayed crypto/restore keep records, previews and drafts safe; no duplicate financial commits or unexpected projection changes from code operations.
- Candidate-bound preserved handler/engine/storage/backup regressions, explicit legacy superseded-assertion classification, unchanged module/style/font parity, deterministic repeat build and prior-file preservation.
- Real phone/tablet controls, readable status/failure instructions, runtime error instrumentation and static-only network observations. Record measured environment/workload/timings without asserting unagreed iPad performance budgets.
- Parent re-execution plus fresh sequential independent specification and quality/security assessments on exact frozen candidate identities. Reviewer source assessment is not independent execution.
- Deliver verified local package, maintained source, reproducible commands, exact hashes, failures/limits and publication approval boundary. Actual Pages verification and owner-guided existing-Home-Screen iPad update, backup reconciliation and full reboot are later separately authorised gates. Never damage the owner's cache to test this.

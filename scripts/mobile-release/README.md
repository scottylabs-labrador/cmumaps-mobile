# Mobile release planner

Run from the repository root with Bun, Node, and the mobile dependencies installed.
No additional dependencies are needed. Production also needs authenticated `gh`
on PATH with `contents: write` permission; planning uses read-only API calls.
The Bun CLI invokes a Node worker for Expo's TypeScript-config loader, which uses
Node-specific CommonJS internals and fails when called directly inside Bun.

## Plan

```sh
bun scripts/mobile-release/plan.ts
```

Environment:

- `PLATFORM`: `ios` or `android`.
- `RELEASE_MODE`: `auto` or `validate`.
- `GITHUB_SHA`: full checked-out commit SHA.
- `GITHUB_REPOSITORY`, `GH_TOKEN`: required for `auto` only.
- `MOBILE_BUILD_NUMBER_BASE`: positive integer required for `auto`.
- `GITHUB_RUN_NUMBER`: positive integer required when a base is supplied.
- `GITHUB_OUTPUT`: optional output file, normally supplied by GitHub Actions.

Outputs, both JSON on stdout and GitHub output lines:

- `fingerprint`: the platform's Expo fingerprint hash.
- `runtime`: exactly the same hash, from Expo's fingerprint runtime policy.
- `version`: explicit Expo app config `version`.
- `action`: `build`, `update`, or `none`.
- `build_number`: base + run number, or empty in validation without a base.

`auto` reads the platform marker and remote `main`. Missing state builds; an
uploaded binary matching platform/fingerprint/runtime/version allows an OTA;
an already-recorded publication at the same SHA is a no-op. Native/runtime or
version changes require a binary. A stale SHA is a no-op. API failures or
malformed state fail closed, rather than masquerading as a first release.

`validate` calculates real config/fingerprint without GitHub access and always
outputs `action=build` for unsigned branch compilation. A seed/token/repository is not needed. It does not publish,
record state, or query remote main.

## Record only after successful publication

```sh
PUBLICATION_SUCCEEDED=true \
RELEASE_ACTION="$ACTION" \
RELEASE_FINGERPRINT="$FINGERPRINT" \
RELEASE_RUNTIME="$RUNTIME" \
RELEASE_VERSION="$VERSION" \
bun scripts/mobile-release/state.ts
```

Pass the exact plan outputs, together with the same standard environment and
build-number inputs. Invoke only when the store binary upload (for `build`) or
production EAS update publication (for `update`) has succeeded. Do not use
`always()` to execute this step after failures. `none` must skip it.
`PUBLICATION_SUCCEEDED` is the workflow's explicit attestation, not independent
verification of App Store / Play acceptance.

State is a JSON body in a non-draft GitHub prerelease, tagged
`mobile-release-state-ios` or `mobile-release-state-android`. It stores the
successful binary identity/build number and latest publication identity/action
separately, preserving binary provenance through OTA updates. It does not use a
cache or depend on local files. Never delete or manually alter these releases.
The marker tag is a stable identifier, not a moving branch or source-of-truth
commit pointer; commit provenance is in its JSON body.

## Workflow requirements and assumptions

- Parent sets app config `runtimeVersion: { policy: "fingerprint" }`. Platform
  overrides must also use that policy. Planner fails closed for other policies.
- Uses the installed `expo-updates/utils/build/resolveRuntimeVersionAsync.js`,
  the same policy implementation Expo uses, with no custom options. That calls
  `expo/fingerprint` with `platforms: [PLATFORM]`; managed projects additionally
  ignore `android/**/*` and `ios/**/*`. Expo and mobile must resolve the exact same
  `@expo/fingerprint` installation. An Expo internal API change requires review.
- Run planning **before prebuild**, in the same dependency/config environment as
  the production binary and OTA export. EAS environment variables, public config
  inputs, fingerprint configuration, and Node/package-manager versions must be
  consistent. Never replace the runtime with a hand-constructed hash.
- Leave `MOBILE_RUNTIME_VERSION` unset during planning so config uses fingerprint
  policy. After planning, set it to `steps.plan.outputs.runtime` for prebuild,
  native compilation, and OTA export. Config must honor this explicit runtime
  override to prevent post-prebuild managed/generic fingerprint drift.
- The fingerprint implementation decides what counts as native. Tests exercise
  release decisions given hash changes, not a substitute hashing algorithm.
- Apply `build_number` as iOS buildNumber / Android versionCode. The base must
  exceed historical store numbering after accounting for run numbers. Keep it
  fixed after rollout; changing it must never lower the computed number.
  Computed numbers must be <= 2,100,000,000. Reruns reuse their run number.
- Serialize production jobs **per platform**, across the whole plan/build-or-
  update/record transaction, with a stable concurrency group and
  `cancel-in-progress: false`. Marker updates do not offer compare-and-swap.
- Recheck remote main immediately before every external upload/update. Planner
  skips stale commits; recorder rechecks before writing and fails if stale.
  GitHub cannot atomically combine checking a branch with a release mutation or
  a store upload: an unavoidable check/write race remains. Workflow guards and
  serialization are required; these scripts cannot revoke an in-flight upload.
- After successful upload but failed marker recording, a rerun may attempt the
  same build number again. Publication steps must reconcile an already-uploaded
  identical artifact before attesting success. No marker is written on failure.
- An OTA published successfully but not recorded can likewise be republished on
  retry. This is at-least-once publication, not an exactly-once transaction.

## Tests

```sh
bun test scripts/mobile-release
```

Tests require neither network nor mobile dependencies. They cover first release,
JS-only/native/version/runtime changes, repeat runs, stale/failed writes, OTA
provenance, per-platform marker names, corrupt state, monotonic numbers, Android
limits, and CLI guards.

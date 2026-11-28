# GitHub mobile releases

All release execution lives in GitHub Actions. Expo Updates remains the OTA
hosting service; there are no EAS Workflow, EAS cloud build, or EAS Submit jobs.

## Routing and safety

`Release` classifies pushes. Mobile inputs run the Android/Linux and iOS/macOS
pipelines; Fastlane changes run independent store metadata jobs. Server, policy,
and documentation changes do not deploy the app. The migration branch runs
validation only: it cannot publish updates, upload store binaries, or upload
metadata. Manual `metadata` and `validate` modes remain available for recovery.

Production jobs must run against the current `main` commit. Releases are
serialized, and matching native runtimes are identified through durable GitHub
release manifests, not cache entries. A failed build/upload must never become a
compatible-runtime marker.

## Bootstrap

The migration switches runtime compatibility from marketing version to native
fingerprint. Both platforms need a new binary before users can receive updates
for the new runtimes. Existing `1.0.0`-runtime installations remain on their old
runtime; the migration does not publish fingerprint updates to them.

Configure signing secrets as described in
[`GITHUB_SIGNING.md`](../apps/mobile/fastlane/GITHUB_SIGNING.md).
Set repository variable `MOBILE_BUILD_NUMBER_BASE` above all previously used
Android version codes and iOS build numbers. The release workflow derives a
monotonic number from this base and its run number. Do not lower or reset the
base after production use.

Supply `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in GitHub secrets. Production jobs pull
readable Expo production environment variables before fingerprinting and
prebuild. Secret-visibility values cannot be downloaded from Expo: migrate all
build-critical values to GitHub secrets. Keep identical effective configuration
for native builds and OTA exports. No secret belongs in release manifests.

Before cutover, verify both signed artifacts on the migration branch. Missing
signing secrets are a hard blocker, not a reason to generate a new upload
identity. Validate all API credentials and genuine review information separately.
Do not enable a store rollout or Apple review submission during migration.

## Costs and maintenance

Standard hosted runners in this public repository avoid EAS execution quotas.
GitHub artifact storage, nonstandard runners, Expo Updates delivery, and developer
account charges have separate limits and billing. Artifacts expire after seven
days; release manifests are durable. Never store keys in build artifacts.

Pin compatible Xcode/Node/Java/Bun versions and review runner image changes.
Renew provisioning profiles/certificates before expiration.

## Rollback

If a pipeline fails, leave its runtime unrecorded and fix/retry it. Do not bypass
compatibility checks to ship an update. For a bad OTA use Expo Updates rollback
to the embedded bundle for that exact runtime. To stop automatic production
publication, disable the Release workflow while preserving metadata recovery.
Restoring the old EAS workflow is not a quota-free fallback.

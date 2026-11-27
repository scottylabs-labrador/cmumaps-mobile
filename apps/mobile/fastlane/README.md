# Store publishing

EAS builds/submits binaries and publishes OTA updates. After the production EAS
workflow succeeds, independent GitHub Actions matrix jobs publish Google Play
and Apple metadata with Ruby 3.3.6 and Fastlane 2.242.0. Either store can fail
without cancelling the other. Directly running the EAS workflow does not publish
store metadata.

For metadata-only publishing, manually dispatch the GitHub **Release** workflow.
Manual runs skip EAS entirely (no fingerprint, build, submission, or OTA update)
and run both store metadata jobs using the selected ref:

```sh
gh workflow run release.yml --ref main
```

The usual credentials and iOS review-information validation still apply.
Push-triggered runs continue to require a successful EAS release first.

Neither lane uploads binaries, promotes tracks, submits an Apple review, or
releases an app directly. Google metadata edits use the automatic review policy:
`changes_not_sent_for_review` is omitted because Google rejects it for this app.
Committing an edit may send changes for review automatically; approval and
publication timing are governed by Play Console settings. Errors requesting a
different review policy fail rather than silently changing that policy.

## Credentials

Configure repository Actions secrets in GitHub Settings → Secrets and variables
→ Actions. Never commit keys, place them in asset folders, or paste them into chat.

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: entire service-account JSON key contents.
  Enable Google Play Android Developer API in its Cloud project. Invite its
  `client_email` in Play Console, scoped to CMU Maps, with app visibility and
  Manage store presence permissions. Admin and production-release permissions
  are not required for this metadata-only lane. The app must already be
  initialized in Play Console with an initial build. An existing EAS Submit
  service account may be reused, but EAS credentials are not automatically
  exposed to GitHub.
- `APP_STORE_CONNECT_API_KEY_ID`: Apple team API key ID.
- `APP_STORE_CONNECT_ISSUER_ID`: Apple's team issuer ID.
- `APP_STORE_CONNECT_API_PRIVATE_KEY`: full `.p8` contents, preserving line
  breaks and BEGIN/END markers. Generate a team App Store Connect API key with
  App Manager access in Users and Access → Integrations. Team keys can access
  other team apps; protect this credential accordingly. Download is available
  once. No Apple password or signing certificate is needed.

Keep the existing `EXPO_TOKEN` for EAS. Rotate/revoke keys when no longer needed.

## Text and age ratings

English text lives in `metadata/android/en-US/` and `metadata/ios/en-US/`.
Edit each store's files directly; the stores have different limits and fields.
Apple categories are specified in `Fastfile`; copyright is in
`metadata/ios/copyright.txt`.

All previously configured EAS Apple text, URLs, categories, copyright, and age
rating answers are migrated. `age_rating.json` uses Apple's current API fields;
the old `ageRatingOverride` maps to `ageRatingOverrideV2`. Other original age
rating keys retain their API names. The old EAS `version: "1.0"` is deliberately
replaced by the resolved Expo marketing version (`1.0.0` initially).

Newer age-rating questions not answered in the original configuration must be
reviewed in App Store Connect; no new policy answers are invented here. App
Privacy, export compliance, pricing, availability,
Google Data safety, content rating, privacy-policy URL, support contact details,
and Play category remain console-managed. Google's listing API does not cover
all of these fields. Apple support/privacy URLs are automated.

Apple review contact details and instructions are uploaded using
`app_review_information` from `review_information.json`. Replace all
`REPLACE_ME` values with genuine contact details before manually submitting for
review. Draft uploads allow contact placeholders but reject empty required
fields; Apple may still reject placeholder values during API validation.
Set the GitHub Actions secret `APP_REVIEW_PASSWORD` to the same password as the
server's `PASSWORD_SIGN_IN`, and enable that server setting before review.
The password is supplied through the environment, never committed to metadata.
Fastlane creates or updates the review-detail record before handling attachments.
There is no attachment workaround; Fastlane 2.242.0's default behavior deletes
existing review attachments when none is supplied. Review submission remains
manual (`submit_for_review: false`).

## iOS version policy

The lane resolves `app.config.ts` through Expo, using its marketing version and
bundle identifier (and the Android package for Play). It reuses only matching
versions in PREPARE_FOR_SUBMISSION, DEVELOPER_REJECTED, REJECTED,
METADATA_REJECTED, or INVALID_BINARY. Otherwise it fails before uploading.
It creates a matching version only when no conflicting pending version exists;
it never renames another draft. Apple can still reject creation, for example
when the requested version is older than the live version.

**OTA-only releases also fail Apple publishing if that marketing version is
already live or locked for review.** This is intentional. A successful binary
upload to TestFlight does not make a published App Store version editable.
Prepare a new marketing version when appropriate; review submission remains
manual. Google publishing still runs independently.

## Screenshots and graphics

Platform-sized Figma exports live in these tracked locations:

- Android: `metadata/android/en-US/images/featureGraphic.png` (1024×500),
  optional `icon.png` (512×512), and `phoneScreenshots/01.png`–`03.png`.
  These are regular directories using Fastlane Supply's required layout.
- Apple: `metadata/shared/screenshots/en-US/01.png`–`03.png`. Fastlane identifies
  device/display classes by size. No iPad screenshots are supplied. Native iPad
  support is controlled separately by `ios.supportsTablet` in `app.config.ts`;
  removing screenshots does not change supported devices.

The current exports reuse the supplied Figma designs on both platforms at the
user's request. Android screenshots are 1024×2048; Apple exports are 1290×2796
for iPhone. Both sets use the same designs, but require
separate upload exports because their aspect-ratio requirements differ.
Designs are proportionally scaled and centered
on white canvases without cropping or distortion. The feature graphic is
upscaled to 1024×500 and is Android-only.

Upscaling does not restore detail. Replace these with high-resolution,
device-accurate exports before review when possible. Figma designs must reflect
the actual shipped app; dimension compliance does not guarantee acceptance.
There are no custom metadata-length or image-dimension checks; Fastlane and the
store APIs validate uploads. Filename
sorting determines ordering. Android requires 320–3840 pixels per side, with
the longer side no more than twice the shorter side.

Android uploads **replace supplied screenshot sets**; absent image types and
screenshot sets remain untouched. Hash-based sync avoids unchanged uploads.
Apple uploads are additive (`overwrite_screenshots: false`), preserving remote
screenshots. To replace/remove Apple screenshots, curate them in App Store
Connect; repeated uploads of different images can eventually fill a set.
Empty local Apple directories skip screenshots entirely.

Low-resolution source copies are not retained in the repository.
Apple has no separate feature graphic; its app icon comes from the binary.

## Manual publishing

### App Review sign-in

Set `PASSWORD_SIGN_IN` on the server for the review period and restart/redeploy
the server to apply it. The welcome screen then shows **App Review sign-in**.
Reviewers tap it and enter the review password in the inline form; there is no
long-press gesture. Put the same password and these instructions in App Store
Connect review notes. The review account can browse maps and directions but
cannot edit map data. Unset or empty the variable and restart/redeploy to disable
password sign-in and hide the button.

From `apps/mobile`, with Bun dependencies installed and Ruby 3.3.6:

```sh
bundle install
```

The following commands **write to the stores** and require the respective
environment secrets. Run only when publishing is intended:

```sh
bundle exec fastlane android metadata
bundle exec fastlane ios metadata
```

Production publishing waits for the
entire EAS workflow, so an EAS failure on either platform prevents both metadata
jobs from starting.

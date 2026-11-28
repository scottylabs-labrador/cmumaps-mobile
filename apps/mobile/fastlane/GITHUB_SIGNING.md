# GitHub native builds and signing

Run these commands from `apps/mobile` after installing repository dependencies:

```sh
bundle exec fastlane android build
bundle exec fastlane android upload
bundle exec fastlane ios build
bundle exec fastlane ios upload
```

Build and upload are separate operations. Builds use local Expo prebuild plus
Gradle or Xcode/Fastlane gym, never EAS Build. Existing `android metadata` and
`ios metadata` lanes retain their existing behavior and environment contracts.
Generated `android/` and `ios/` directories are disposable: every build runs
`expo prebuild --clean --no-install` for its platform. Use an isolated checkout,
not a developer's hand-maintained native project.

## Runner prerequisites

- Install dependencies with `bun install --frozen-lockfile` from the repository
  root and `bundle install` with the mobile Gemfile. Node 22 and Bun 1.3.5 match
  the workflow. Expo SDK 58 / React Native 0.88 supply native templates, SDK,
  NDK, and native dependency versions; do not copy an older EAS native project.
- Android: Java 17, Android SDK, accepted SDK licenses, and network access for
  the generated Gradle wrapper, Maven dependencies, SDK/NDK downloads.
- iOS: macOS, selected Xcode 26.3 with iOS and iOS Simulator SDKs, accepted
  Xcode license, and CocoaPods **in the Ruby bundle**. The lane invokes
  `bundle exec pod install`; the Gemfile must declare `cocoapods` and the lockfile
  must include it. Fastlane alone does not install CocoaPods.
- Xcode and Gradle must have network access for dependency installation. Local
  syntax/contract tests are not evidence of a successful signed native build.

## Common environment

- `RELEASE_MODE`: `auto` (default) or `validate`. `auto` requires complete
  production signing. `validate` permits unsigned compilation only when **all**
  signing fields for that platform are absent. Partially configured signing
  fails with the missing field names. Upload always refuses `validate`.
- `MOBILE_BUILD_NUMBER`: required positive integer, at most `2100000000`;
  becomes Android `versionCode` and iOS `CFBundleVersion`. Allocate monotonically
  increasing numbers above all existing Play/App Store Connect/EAS build numbers.
  EAS remote auto-increment is not consulted. The same immutable build number
  must reach Expo config, fingerprint planning, prebuild, and upload.
- `PLATFORM`: used by the workflow to choose the lane, not read by the helper.
- Production environment configuration, including `EXPO_PUBLIC_*`, must be
  available before resolving config/prebuilding. `NODE_ENV=production` and
  `CI=1` are set for native compilation. Android `auto` requires
  `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`; validate can compile without it, but maps
  will not function in that artifact. Restrict the key to the package and
  appropriate Android signing certificate.
- Runtime version and `expo-channel-name: production` request headers are owned
  by `app.config.ts`; native tooling does not replace the fingerprint runtime or
  patch native update headers. Native and OTA jobs must resolve identical
  production environment/configuration to avoid incompatible runtimes.
- `ANDROID_AAB_PATH`, `IOS_IPA_PATH`: optional artifact path overrides, used by
  both build and upload. `IOS_SIMULATOR_APP_PATH`: optional unsigned simulator
  tarball override. Relative paths resolve from `apps/mobile`, not Fastlane's
  working directory. Keep defaults for the workflow's `build/*` artifact glob.
  Builds refuse to overwrite an existing destination.

Default outputs:

- Signed Android: `apps/mobile/build/cmumaps.aab`.
- Unsigned Android validation: `apps/mobile/build/cmumaps-UNSIGNED.aab`.
- Signed iOS: `apps/mobile/build/cmumaps.ipa`, `CMUMaps.xcarchive`, gym logs,
  and any gym-produced symbols in `apps/mobile/build/`.
- Unsigned iOS validation:
  `apps/mobile/build/cmumaps-UNSIGNED-simulator.app.tar.gz`, containing the
  Release simulator `.app`. This is a compile check, **not** a device archive,
  uploadable IPA, signing test, or simulator runtime test. The lane does not
  boot or launch a simulator.

Unsigned outputs are conspicuously named and logged. Android explicitly removes
the template's debug signing from the release build, rather than passing a
debug-signed bundle off as a production build.

## Android signing and upload

Build secrets:

- `ANDROID_KEYSTORE_BASE64`: base64 of the existing Play **upload keystore**.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password.
- `ANDROID_KEY_ALIAS`: alias of the upload private key.
- `ANDROID_KEY_PASSWORD`: private-key password.

Use the existing application's upload identity, not a new random keystore. Play
App Signing's app-signing private key is not normally used by CI. Verify the
upload certificate in Play Console and export/back up the keystore before
retiring EAS credentials. The lane decodes it into a private temporary directory,
passes its path through an environment variable, and deletes it on success or
exception. Passwords are not interpolated into Gradle files or command arguments.

Upload secrets/options:

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: raw service-account JSON (not base64 or a
  filename), matching the existing metadata lane.
- `GOOGLE_PLAY_TRACK`: defaults to `production`; may be `internal`, `alpha`,
  `beta`, or an existing custom track.

Link/authorize the service account in Play Console with access to this app and
the selected track. Create the Play app and complete any required initial
manual upload/store setup first. Upload uses Supply's API and forces
`release_status: "draft"`; it does not roll out the release or alter listing
metadata. It does not silently retry Google's review-policy errors.

## Apple signing and upload

Build secrets:

- `IOS_DISTRIBUTION_P12_BASE64`: base64 of an Apple Distribution certificate
  **and its private key**, exported as PKCS#12.
- `IOS_DISTRIBUTION_P12_PASSWORD`: nonempty PKCS#12 export password.
- `IOS_PROVISION_PROFILE_BASE64`: base64 of an unexpired App Store distribution
  `.mobileprovision` for `org.scottylabs.cmumaps`.
- `APPLE_TEAM_ID`: Apple Developer team ID owning the app and certificate.

Create/renew the explicit App ID with the app's required capabilities, including
Associated Domains and Keychain Sharing as generated by Expo plugins. Generate
an App Store distribution profile for that ID containing the supplied certificate.
Confirm entitlements match the generated app (especially associated domains and
keychain access groups). Development/ad-hoc/enterprise profiles are rejected.
The profile's application-identifier prefix is read from the profile; it need
not equal the team ID for older developer accounts.

The lane imports the PKCS#12 into a randomly password-protected temporary
keychain, grants noninteractive codesign access, adds it to the user search list,
and installs the profile in Xcode's provisioning-profile directory. It uses
manual signing and never requests automatic provisioning or developer-portal
credential downloads. After gym succeeds or raises, it restores the prior
keychain search list and any preexisting profile, deletes the temporary
keychain, and removes decoded credential files. Only a single application target
without extensions is supported; new extensions require explicit additional
profile mappings.

Upload secrets (same raw values as the existing metadata lane):

- `APP_STORE_CONNECT_API_KEY_ID`
- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_API_PRIVATE_KEY`: raw multiline `.p8` key content, not base64.

Create the App Store Connect app first (bundle `org.scottylabs.cmumaps`, existing
Apple app ID `6839466073`). Give the API key access to that app and binary
uploads. An API key is **not** a distribution signing identity.

Upload uses Pilot with `skip_submission: true`,
`skip_waiting_for_build_processing: true`, and `distribute_external: false`.
It only sends the IPA to App Store Connect; it does not submit Apple App Review,
submit TestFlight beta review, distribute to external tester groups, choose a
store version, or enable automatic release. App Store Connect may independently
auto-distribute to already configured internal tester groups. Successful upload
is not successful Apple processing: check processing status and resolve any
subsequent Apple validation errors before manual release.

## Cleanup and operational limits

Use ephemeral GitHub-hosted runners and avoid parallel lanes sharing one macOS
user's keychain search list. Ruby `ensure` handles ordinary failures, but no
process can promise cleanup after `SIGKILL`, host loss, or hard job cancellation.
Do not cache/upload temporary signing directories, keychains, `.env.local`,
provisioning profiles, or the entire checkout. Restrict artifacts to `build/*`.
Cleanup failures emit a warning; discard that runner. The workflow should remove
production environment files in an `always()` cleanup step and must never print
secrets with shell tracing.

Unsigned compilation does not prove real-device linking, distribution signing,
store authorization, or upload acceptance. Production signing and live store
uploads require the above credentials and are intentionally not exercised by
local contract checks. No local test should mutate external stores.

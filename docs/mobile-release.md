# Release the mobile app

A push to `main` is a production release. The Release workflow runs [apps/mobile/.eas/workflows/deploy-production.yml](../apps/mobile/.eas/workflows/deploy-production.yml) for that commit. The committed `version` in [apps/mobile/app.config.ts](../apps/mobile/app.config.ts) is the store version. `runtimeVersion` uses policy `appVersion`, so that same value is the runtime version. An over-the-air update applies only to binaries built with that version. Leave `version` unchanged when the update should reach those binaries. Raise `version` when the native project changes, so the new binaries have their own runtime version.

The fingerprint decides the release. `version`, `ios.buildNumber`, and `android.versionCode` stay out of the hash.

- A platform with a production build for its fingerprint: publish that platform's over-the-air update. Binaries built with the committed version receive it.
- A platform with no production build for its fingerprint, including the first release: build and submit that platform. Today the first version is `1.0.0`.

Android uploads a draft release on the Play production track (`releaseStatus: "draft"` in [apps/mobile/eas.json](../apps/mobile/eas.json)) until the Play Console app is fully set up. After that, switch `releaseStatus` to `completed` so later submits go live on production. iOS is uploaded to TestFlight. After an iOS submit, the workflow runs `eas metadata:push` from [apps/mobile/store.config.json](../apps/mobile/store.config.json) (Apple only). A person submits the iOS build for App Review. Pull requests, `staging`, and other branches do not release.

The store version and the runtime version are the committed `version`. EAS `autoIncrement` sets `ios.buildNumber` and `android.versionCode`. Those build numbers stay off the runtime version.

The Expo project is `@scottylabs/cmumaps` (`6158b479-bc89-41f9-a0cf-d6b56143f4e4`). Create the robot user on that account. `extra.eas.projectId` and `updates.url` in [apps/mobile/app.config.ts](../apps/mobile/app.config.ts) both use that id.

## One-time setup

Run the EAS commands from `apps/mobile`.

1. Invite a robot user that can build, submit, and publish updates. Create an access token for it and store the token as the GitHub Actions secret `EXPO_TOKEN`.
2. Link this GitHub repository to the Expo project. The release job runs the workflow from the commit with `eas workflow:run --ref`, which requires that link.
3. Store the Google Maps key for the iOS and Android Maps SDKs where the fingerprint job and the cloud build can read it. Use visibility `sensitive`. A secret is hidden from app config, so the Maps plugin would be omitted and the fingerprint would not match. In Google Cloud, that key must allow the Maps SDK for iOS and the Maps SDK for Android. One key can be restricted to Android apps or to iOS apps, not both. Use two keys if you want app restrictions, or one key restricted only by those two APIs.

   ```sh
   bunx eas-cli env:set --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value "$GOOGLE_MAPS_API_KEY" --environment production --visibility sensitive --non-interactive
   ```

4. Let EAS create the signing credentials, and give EAS an App Store Connect API key plus a Play Console service account:

   ```sh
   bunx eas-cli credentials:configure-build -p ios -e production
   bunx eas-cli credentials:configure-build -p android -e production
   bunx eas-cli credentials -p ios
   bunx eas-cli credentials -p android
   ```

5. Create the App Store Connect app and the Play Console app for `org.scottylabs.cmumaps`. Finish the store listing: description, screenshots, privacy policy, and age rating. Put the numeric Apple ID into `submit.production.ios.ascAppId` in [apps/mobile/eas.json](../apps/mobile/eas.json), replacing `REPLACE_WITH_APP_STORE_CONNECT_APP_ID`.
6. Finish the Play Console app listing (store listing, content rating, privacy policy, target audience). Until that is done, keep `submit.production.android.releaseStatus` as `draft` so EAS can upload the AAB. After the first draft lands and the app leaves draft-only setup, set `releaseStatus` to `completed` for production rollouts.

The `production` channel on `@scottylabs/cmumaps` points at the `production` branch. If the project moves to another Expo account, update the project id and the updates URL, then point the channel at that branch again:

```sh
bunx eas-cli channel:create production --non-interactive
bunx eas-cli channel:edit production --branch production --non-interactive
```

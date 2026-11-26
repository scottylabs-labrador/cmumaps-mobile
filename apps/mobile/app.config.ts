import type { ExpoConfig } from "expo/config";
import { associatedDomains } from "./src/env.ts";

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const projectId = "6158b479-bc89-41f9-a0cf-d6b56143f4e4";
const bundleIdentifier = "org.scottylabs.cmumaps";
const slug = "cmumaps";

const plugins: NonNullable<ExpoConfig["plugins"]> = [
  "expo-router",
  "expo-updates",
  "expo-secure-store",
  [
    "expo-location",
    {
      locationWhenInUsePermission:
        "CMU Maps uses your location for your map position, nearby searches, and navigation directions.",
    },
  ],
];

// iOS uses Apple Maps (no key). Android standalone builds need this key;
// Expo Go already ships one for local Android testing.
if (googleMapsApiKey) {
  plugins.push([
    "react-native-maps",
    {
      androidGoogleMapsApiKey: googleMapsApiKey,
    },
  ]);
}

const config: ExpoConfig = {
  name: "CMU Maps",
  slug,
  scheme: slug,
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier,
    supportsTablet: true,
    associatedDomains,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "CMU Maps uses your location for your map position, nearby searches, and navigation directions.",
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: bundleIdentifier,
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: associatedDomains.map((domain) => ({
          scheme: "https",
          host: domain.slice("applinks:".length),
          pathPrefix: "/",
        })),
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins,
  runtimeVersion: {
    policy: "appVersion",
  },
  updates: {
    url: `https://u.expo.dev/${projectId}`,
  },
  extra: {
    eas: {
      projectId,
    },
  },
  experiments: {
    typedRoutes: false,
  },
};

export default config;

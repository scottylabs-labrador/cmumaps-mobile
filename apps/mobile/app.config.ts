import type { ExpoConfig } from "expo/config";

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const plugins: NonNullable<ExpoConfig["plugins"]> = [
  "expo-router",
  "expo-secure-store",
  [
    "expo-location",
    {
      locationWhenInUsePermission:
        "CMU Maps uses your location to show where you are and to start directions.",
    },
  ],
];

if (googleMapsApiKey) {
  plugins.push([
    "react-native-maps",
    {
      androidGoogleMapsApiKey: googleMapsApiKey,
      iosGoogleMapsApiKey: googleMapsApiKey,
    },
  ]);
}

const config: ExpoConfig = {
  name: "CMU Maps",
  slug: "cmumaps",
  scheme: "cmumaps",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  ios: {
    bundleIdentifier: "org.scottylabs.cmumaps",
    supportsTablet: true,
    associatedDomains: ["applinks:maps.scottylabs.org", "applinks:maps.slabs-staging.org"],
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "CMU Maps uses your location to show where you are and to start directions.",
    },
  },
  android: {
    package: "org.scottylabs.cmumaps",
    permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "maps.scottylabs.org",
            pathPrefix: "/",
          },
          {
            scheme: "https",
            host: "maps.slabs-staging.org",
            pathPrefix: "/",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  plugins,
  experiments: {
    typedRoutes: false,
  },
};

export default config;

export default /** @satisfies {import("syncpack").RcFile} */ ({
  versionGroups: [
    // https://stackoverflow.com/questions/79470698/with-syncpack-on-a-turborepo-how-to-set-app-version-dependencies-through-a-packa/79477388#79477388
    {
      label: "use workspace protocol for local dependencies",
      packages: ["**"],
      dependencies: ["$LOCAL"],
      dependencyTypes: ["!local"],
      pinVersion: "workspace:*",
    },
    {
      label: "openapi-typescript needs the TypeScript 5 compiler API",
      packages: ["@cmumaps/openapi-codegen"],
      dependencies: ["typescript"],
      pinVersion: "5.9.3",
    },
  ],
  // https://jamiemason.github.io/syncpack/semver-groups/
  semverGroups: [
    {
      label: "pin react-native-maps to the Expo Go release",
      dependencies: ["react-native-maps"],
      packages: ["@cmumaps/mobile"],
      range: "",
    },
    {
      label: "pin the TypeScript 5 compiler API for openapi-typescript",
      dependencies: ["typescript"],
      packages: ["@cmumaps/openapi-codegen"],
      range: "",
    },
    {
      dependencyTypes: ["prod", "resolutions", "overrides", "pnpmOverrides", "local"],
      range: "^",
    },
    {
      dependencyTypes: ["dev"],
      range: "^",
    },
    {
      dependencyTypes: ["peer"],
      range: "^",
    },
  ],
});

import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const before = process.env.BEFORE_SHA;
const files =
  before && !/^0+$/.test(before)
    ? execFileSync("git", ["diff", "--name-only", before, "HEAD"], {
        encoding: "utf8",
      })
        .trim()
        .split("\n")
    : execFileSync("git", ["ls-files"], { encoding: "utf8" }).trim().split("\n");
const mobile = files.some(
  (file) =>
    /^(packages\/common\/|package\.json$|bun\.lock$|scripts\/mobile-release\/)/.test(file) ||
    (file.startsWith("apps/mobile/") &&
      !/^apps\/mobile\/(fastlane\/|\.eas\/|.*\.md$)/.test(file)) ||
    file === ".github/workflows/mobile-native.yml",
);
const metadata = files.some(
  (file) => file.startsWith("apps/mobile/fastlane/") || file === ".github/workflows/release.yml",
);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `mobile=${mobile}\nmetadata=${metadata}\n`);
}
console.log(JSON.stringify({ mobile, metadata }));

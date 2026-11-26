import { describe, expect, test } from "vite-plus/test";
import { cameraForRegion } from "./geometry";

describe("cameraForRegion", () => {
  test("returns center/altitude/zoom without heading so animateCamera keeps rotation", () => {
    const camera = cameraForRegion(
      {
        latitude: 40.4435,
        longitude: -79.9421,
        latitudeDelta: 0.0012,
        longitudeDelta: 0.0012,
      },
      { width: 390, height: 844 },
    );

    expect(camera.center).toEqual({ latitude: 40.4435, longitude: -79.9421 });
    expect(camera.altitude).toBeGreaterThan(0);
    expect(camera.zoom).toBeGreaterThan(0);
    expect(camera).not.toHaveProperty("heading");
    expect(camera).not.toHaveProperty("pitch");
  });

  test("uses a larger altitude for a wider region", () => {
    const viewport = { width: 390, height: 844 };
    const tight = cameraForRegion(
      {
        latitude: 40.4435,
        longitude: -79.9421,
        latitudeDelta: 0.0005,
        longitudeDelta: 0.0005,
      },
      viewport,
    );
    const wide = cameraForRegion(
      {
        latitude: 40.4435,
        longitude: -79.9421,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
      viewport,
    );

    expect(wide.altitude).toBeGreaterThan(tight.altitude);
    expect(wide.zoom).toBeLessThan(tight.zoom);
  });
});

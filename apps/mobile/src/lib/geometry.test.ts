import { describe, expect, test } from "vite-plus/test";
import type { Building, GeoCoordinate } from "@cmumaps/common";
import { buildingsInView, cameraForRegion } from "./geometry";

describe("buildingsInView", () => {
  const point = (longitude: number, latitude: number): GeoCoordinate => ({ latitude, longitude });
  const region = { latitude: 0, longitude: 0, latitudeDelta: 2, longitudeDelta: 2 };
  const visible = (shape: GeoCoordinate[][]) => {
    const building: Building = {
      code: "TEST",
      name: "Test",
      floors: ["1"],
      defaultFloor: "1",
      defaultOrdinal: 1,
      labelLatitude: 100,
      labelLongitude: 100,
      shape,
      hitbox: [],
      isMapped: true,
    };
    return buildingsInView({ TEST: building }, region).length === 1;
  };
  test("includes footprints contained in, containing, or crossing the viewport with labels offscreen", () => {
    expect(visible([[point(-0.1, -0.1), point(0.1, -0.1), point(0, 0.1)]])).toBe(true);
    expect(visible([[point(-5, -5), point(5, -5), point(5, 5), point(-5, 5)]])).toBe(true);
    expect(visible([[point(-5, -0.1), point(5, -0.1), point(5, 0.1), point(-5, 0.1)]])).toBe(true);
  });
  test("uses padding and includes boundary contact", () => {
    expect(visible([[point(1.1, 0), point(1.15, 0), point(1.1, 0.1)]])).toBe(true);
    expect(visible([[point(1.2, 0), point(2, 0), point(2, 1)]])).toBe(true);
    expect(visible([[point(1.3, 0), point(2, 0), point(2, 1)]])).toBe(false);
  });
  test("rejects bounding-box-only overlap, empty shapes, and viewports inside holes", () => {
    expect(visible([[point(1, 3), point(3, 1), point(3, 3)]])).toBe(false);
    expect(visible([])).toBe(false);
    expect(
      visible([
        [point(-5, -5), point(5, -5), point(5, 5), point(-5, 5)],
        [point(-2, -2), point(2, -2), point(2, 2), point(-2, 2)],
      ]),
    ).toBe(false);
  });
});

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

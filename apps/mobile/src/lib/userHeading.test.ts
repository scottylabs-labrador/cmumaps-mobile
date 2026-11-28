import { describe, expect, test } from "vite-plus/test";
import { headingArrow, headingArrowRadius, reliableHeading } from "./userHeading";

describe("headingArrowRadius", () => {
  const mapHeight = 800;
  const screenRadius = (metersPerPoint: number) =>
    headingArrowRadius((metersPerPoint * mapHeight) / 111_320, mapHeight) / metersPerPoint;

  test("grows gradually rather than proportionally to zoom", () => {
    expect(screenRadius(0.8)).toBeCloseTo(32);
    expect(screenRadius(0.4)).toBeGreaterThan(screenRadius(0.8));
    expect(screenRadius(0.4)).toBeLessThan(2 * screenRadius(0.8));
  });

  test("bounds screen size at both zoom extremes", () => {
    expect(screenRadius(100)).toBeCloseTo(24);
    expect(screenRadius(0.001)).toBeCloseTo(48);
  });

  test("uses the map's actual height to preserve screen size", () => {
    const delta = 0.006;
    expect(headingArrowRadius(delta, 400)).toBeCloseTo(headingArrowRadius(delta * 2, 800));
  });
});

describe("reliableHeading", () => {
  test("prefers true north and falls back to magnetic north", () => {
    expect(reliableHeading({ trueHeading: 0, magHeading: 12, accuracy: 3 })).toBe(0);
    expect(reliableHeading({ trueHeading: -1, magHeading: 90, accuracy: 2 })).toBe(90);
  });

  test("hides uncalibrated, low accuracy, and invalid headings", () => {
    for (const accuracy of [0, 1]) {
      expect(reliableHeading({ trueHeading: 10, magHeading: 12, accuracy })).toBeNull();
    }
    for (const magHeading of [-1, 360, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(reliableHeading({ trueHeading: -1, magHeading, accuracy: 3 })).toBeNull();
    }
  });
});

describe("headingArrow", () => {
  const position = { latitude: 40.4433, longitude: -79.9436 };

  test("points north, east, south, and west with a four-vertex arrowhead", () => {
    for (const heading of [0, 90, 180, 270]) {
      const arrow = headingArrow(position, heading, 10);
      expect(arrow).toHaveLength(4);
      const tip = arrow[0]!;
      const radians = (heading * Math.PI) / 180;
      expect(tip.latitude).toBeCloseTo(position.latitude + (Math.cos(radians) * 8.5) / 111_320, 10);
      expect(tip.longitude).toBeCloseTo(
        position.longitude +
          (Math.sin(radians) * 8.5) / (111_320 * Math.cos((position.latitude * Math.PI) / 180)),
        10,
      );
    }
  });

  test("wraps around north continuously and scales with zoom radius", () => {
    expect(headingArrow(position, 0, 10)).toEqual(headingArrow(position, 360, 10));
    const small = headingArrow(position, 0, 10)[0]!;
    const large = headingArrow(position, 0, 20)[0]!;
    expect(large.latitude - position.latitude).toBeCloseTo(
      2 * (small.latitude - position.latitude),
      10,
    );
  });

  test("has symmetric wings and a recessed tail ahead of the location dot", () => {
    const [tip, right, tail, left] = headingArrow(position, 0, 10);
    expect(right!.latitude).toBe(left!.latitude);
    expect(right!.longitude - position.longitude).toBeCloseTo(
      position.longitude - left!.longitude,
      10,
    );
    expect(tail!.latitude).toBeGreaterThan(right!.latitude);
    expect(tail!.latitude).toBeLessThan(tip!.latitude);
    expect(right!.latitude).toBeGreaterThan(position.latitude);
  });
});

import type { GeoCoordinate } from "@cmumaps/common";
import type { LocationHeadingObject } from "expo-location";

/** Grow gently with zoom, keeping the arrow visible without overwhelming the map. */
export const headingArrowRadius = (latitudeDelta: number, mapHeight: number): number => {
  const metersPerPoint = (Math.max(latitudeDelta, 1e-9) * 111_320) / Math.max(mapHeight, 1);
  const radiusPoints = Math.min(48, Math.max(24, 32 * Math.pow(0.8 / metersPerPoint, 0.2)));
  return radiusPoints * metersPerPoint;
};

export const reliableHeading = (heading: LocationHeadingObject): number | null => {
  if (heading.accuracy < 2) return null;
  const degrees = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
  return Number.isFinite(degrees) && degrees >= 0 && degrees < 360 ? degrees : null;
};

/** A geographic arrowhead stays aligned with north even when the map rotates. */
export const headingArrow = (
  position: GeoCoordinate,
  heading: number,
  radiusMeters: number,
): GeoCoordinate[] => {
  const latitudeScale = radiusMeters / 111_320;
  const longitudeScale =
    latitudeScale / Math.max(Math.cos((position.latitude * Math.PI) / 180), 1e-6);
  const angle = (heading * Math.PI) / 180;
  // Local coordinates: forward points toward the heading, right is perpendicular.
  // The recessed tail leaves the native blue location dot visible.
  return [
    [0.85, 0],
    [0.2, 0.32],
    [0.35, 0],
    [0.2, -0.32],
  ].map(([forward = 0, right = 0]) => ({
    latitude:
      position.latitude + (forward * Math.cos(angle) - right * Math.sin(angle)) * latitudeScale,
    longitude:
      position.longitude + (forward * Math.sin(angle) + right * Math.cos(angle)) * longitudeScale,
  }));
};

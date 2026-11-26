import type { Buildings, GeoCoordinate } from "@cmumaps/common";

// Same cutoff the website uses: screen width divided by longitude span.
export const FLOOR_ZOOM_DENSITY = 350_000;

export const isInPolygon = (point: GeoCoordinate, vertices: GeoCoordinate[]) => {
  const x = point.longitude;
  const y = point.latitude;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const vi = vertices[i];
    const vj = vertices[j];
    if (!vi || !vj) {
      continue;
    }
    const intersect =
      vi.latitude > y !== vj.latitude > y &&
      x <
        ((vj.longitude - vi.longitude) * (y - vi.latitude)) / (vj.latitude - vi.latitude) +
          vi.longitude;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
};

export const buildingAt = (buildings: Buildings, point: GeoCoordinate) =>
  Object.values(buildings).find((building) => isInPolygon(point, building.shape[0] ?? []));

export const regionForCoordinates = (
  coords: GeoCoordinate[],
  padding = 1.4,
): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} | null => {
  if (coords.length === 0) {
    return null;
  }
  let minLat = coords[0]!.latitude;
  let maxLat = coords[0]!.latitude;
  let minLon = coords[0]!.longitude;
  let maxLon = coords[0]!.longitude;
  for (const point of coords) {
    minLat = Math.min(minLat, point.latitude);
    maxLat = Math.max(maxLat, point.latitude);
    minLon = Math.min(minLon, point.longitude);
    maxLon = Math.max(maxLon, point.longitude);
  }
  const latitudeDelta = Math.max((maxLat - minLat) * padding, 0.0012);
  const longitudeDelta = Math.max((maxLon - minLon) * padding, 0.0012);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

export const buildingsInView = (
  buildings: Buildings,
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
) => {
  const minLat = region.latitude - region.latitudeDelta / 2;
  const maxLat = region.latitude + region.latitudeDelta / 2;
  const minLon = region.longitude - region.longitudeDelta / 2;
  const maxLon = region.longitude + region.longitudeDelta / 2;
  return Object.values(buildings).filter((building) => {
    const lat = building.labelLatitude;
    const lon = building.labelLongitude;
    return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
  });
};

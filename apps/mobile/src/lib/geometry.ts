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

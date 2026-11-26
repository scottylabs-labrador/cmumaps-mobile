import type { Building, Buildings, GeoCoordinate } from "@cmumaps/common";

// Screen width divided by longitude span required before rendering indoor floorplans.
export const FLOOR_ZOOM_DENSITY = 500_000;
export const ROOM_LABEL_ZOOM_DENSITY = 750_000;

const METERS_PER_DEGREE_LAT = 111_320;
// Apple MapKit uses a 30-degree vertical field of view at 0 pitch.
const MAPKIT_HALF_FOV_TAN = Math.tan(Math.PI / 12);

/**
 * Converts a target region to `animateCamera` parameters (`altitude` for iOS
 * MapKit, `zoom` for Android Google Maps) without `heading`, so programmatic
 * camera moves preserve the user's current map rotation.
 */
export const cameraForRegion = (
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  },
  viewport: { width: number; height: number },
) => {
  const cosLat = Math.max(Math.cos((region.latitude * Math.PI) / 180), 1e-6);
  const latMeters = region.latitudeDelta * METERS_PER_DEGREE_LAT;
  const lonMeters = region.longitudeDelta * METERS_PER_DEGREE_LAT * cosLat;
  const aspect = viewport.width > 0 ? viewport.height / viewport.width : 1;
  const altitude = Math.max(latMeters, lonMeters * aspect) / (2 * MAPKIT_HALF_FOV_TAN);

  const zoomLon = Math.log2((360 * (Math.max(viewport.width, 1) / 256)) / region.longitudeDelta);
  const zoomLat = Math.log2(
    (360 * cosLat * (Math.max(viewport.height, 1) / 256)) / region.latitudeDelta,
  );
  const zoom = Math.min(zoomLon, zoomLat);

  return {
    center: { latitude: region.latitude, longitude: region.longitude },
    altitude,
    zoom,
  };
};

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
  minDelta = 0.0012,
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
  const latitudeDelta = Math.max((maxLat - minLat) * padding, minDelta);
  const longitudeDelta = Math.max((maxLon - minLon) * padding, minDelta);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

export const regionForBuilding = (building: Building) => {
  const shapeRegion = regionForCoordinates(building.shape.flat(), 1.25, 0.0006);
  if (shapeRegion) {
    return shapeRegion;
  }
  return {
    latitude: building.labelLatitude,
    longitude: building.labelLongitude,
    latitudeDelta: 0.0012,
    longitudeDelta: 0.0012,
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

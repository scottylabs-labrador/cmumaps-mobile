import type { Buildings, GeoRooms, Pois, PreciseRoute } from "@cmumaps/common";

export interface SearchDocument {
  id: string;
  nameWithSpace: string;
  fullNameWithSpace: string;
  labelPosition: { latitude: number; longitude: number } | null;
  type: "room" | "building" | "floor";
  roomType?: string;
  floor?: { buildingCode: string; level: string };
  alias: string;
}

export interface CampusDataAdapter {
  getBuildings: () => Promise<Buildings>;
  search: (query: string) => Promise<SearchDocument[]>;
  getFloorplan: (floorCode: string) => Promise<GeoRooms>;
  getPois: (floorCode: string) => Promise<Pois>;
  getRoutes: (start: string, end: string) => Promise<Record<string, PreciseRoute>>;
}

import type {
  Buildings,
  GeoRooms,
  Pois,
  PreciseRoute,
} from "@cmumaps/common";
import { authClient } from "@/auth/client";
import { env } from "@/env";

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

const apiGet = async <T>(path: string): Promise<T> => {
  const headers: Record<string, string> = { accept: "application/json" };
  const cookie = await authClient.getCookie();
  if (cookie) {
    headers.cookie = cookie;
  }
  const response = await fetch(`${env.serverUrl}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${path}`);
  }
  return (await response.json()) as T;
};

export const fetchBuildings = () => apiGet<Buildings>("/buildings");

export const fetchSearch = (query: string) => {
  const params = new URLSearchParams({ query });
  return apiGet<SearchDocument[]>(`/search?${params.toString()}`);
};

export const fetchFloorplan = (floorCode: string) =>
  apiGet<GeoRooms>(`/floors/${encodeURIComponent(floorCode)}/floorplan`);

export const fetchPois = (floorCode: string) =>
  apiGet<Pois>(`/floors/${encodeURIComponent(floorCode)}/pois`);

export const fetchRoutes = (start: string, end: string, signedIn: boolean) => {
  const params = new URLSearchParams({ start, end });
  const path = signedIn ? "/path" : "/path/public";
  return apiGet<Record<string, PreciseRoute>>(`${path}?${params.toString()}`);
};

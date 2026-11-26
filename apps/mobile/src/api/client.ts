import type { Buildings, GeoRooms, Pois, PreciseRoute } from "@cmumaps/common";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { CampusDataAdapter, SearchDocument } from "@/api/adapter";
import { authClient } from "@/auth/client";
import { env } from "@/env";

export type { CampusDataAdapter, SearchDocument } from "@/api/adapter";

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

export const httpCampusDataAdapter: CampusDataAdapter = {
  getBuildings: () => apiGet<Buildings>("/buildings"),
  search: (query) => {
    const params = new URLSearchParams({ query });
    return apiGet<SearchDocument[]>(`/search?${params.toString()}`);
  },
  getFloorplan: (floorCode) =>
    apiGet<GeoRooms>(`/floors/${encodeURIComponent(floorCode)}/floorplan`),
  getPois: (floorCode) => apiGet<Pois>(`/floors/${encodeURIComponent(floorCode)}/pois`),
  getRoutes: (start, end, signedIn) => {
    const params = new URLSearchParams({ start, end });
    const path = signedIn ? "/path" : "/path/public";
    return apiGet<Record<string, PreciseRoute>>(`${path}?${params.toString()}`);
  },
};

export const useBuildings = () =>
  useQuery({
    queryKey: ["buildings"],
    queryFn: () => httpCampusDataAdapter.getBuildings(),
  });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ["search", query],
    queryFn: () => httpCampusDataAdapter.search(query),
    enabled: query.trim().length > 0,
  });

export const useFloorplan = (floorCode: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["floorplan", floorCode],
    queryFn: () => httpCampusDataAdapter.getFloorplan(floorCode ?? ""),
    enabled: Boolean(floorCode) && enabled,
  });

export const useFloorplans = (floorCodes: string[], enabled: boolean) =>
  useQueries({
    queries: floorCodes.map((floorCode) => ({
      queryKey: ["floorplan", floorCode],
      queryFn: () => httpCampusDataAdapter.getFloorplan(floorCode),
      enabled: enabled && floorCodes.length > 0,
    })),
  });

export const usePois = (floorCode: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["pois", floorCode],
    queryFn: () => httpCampusDataAdapter.getPois(floorCode ?? ""),
    enabled: Boolean(floorCode) && enabled,
  });

export const useRoutePaths = (
  start: string | undefined,
  end: string | undefined,
  signedIn: boolean,
  enabled: boolean,
) =>
  useQuery({
    queryKey: ["routes", signedIn, start, end],
    queryFn: () => httpCampusDataAdapter.getRoutes(start ?? "", end ?? "", signedIn),
    enabled: Boolean(start && end) && enabled,
  });

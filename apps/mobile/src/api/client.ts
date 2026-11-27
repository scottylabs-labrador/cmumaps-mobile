import type { Buildings, GeoRooms, Pois, PreciseRoute } from "@cmumaps/common";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { CampusDataAdapter, SearchDocument } from "@/api/adapter";
import { authClient } from "@/auth/client";
import { notifySession } from "@/auth/sessionEvents";
import { env } from "@/env";

export type { CampusDataAdapter, SearchDocument } from "@/api/adapter";

const apiGet = async <T>(path: string, signal?: AbortSignal): Promise<T> => {
  const headers: Record<string, string> = { accept: "application/json" };
  const cookie = await authClient.getCookie();
  if (cookie) {
    headers.cookie = cookie;
  }
  const response = await fetch(`${env.serverUrl}${path}`, { headers, signal });
  if (!response.ok) {
    if (response.status === 401) notifySession("unauthorized");
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
  getRoutes: (start, end) => {
    const params = new URLSearchParams({ start, end });
    return apiGet<Record<string, PreciseRoute>>(`/path?${params.toString()}`);
  },
};

export const useBuildings = () =>
  useQuery({
    queryKey: ["buildings"],
    queryFn: ({ signal }) => apiGet<Buildings>("/buildings", signal),
  });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ["search", query],
    queryFn: ({ signal }) =>
      apiGet<SearchDocument[]>(`/search?${new URLSearchParams({ query })}`, signal),
    enabled: query.trim().length > 0,
  });

export const useFloorplan = (floorCode: string | null, enabled = true) =>
  useQuery({
    queryKey: ["floorplan", floorCode],
    queryFn: ({ signal }) =>
      apiGet<GeoRooms>(`/floors/${encodeURIComponent(floorCode ?? "")}/floorplan`, signal),
    enabled: Boolean(floorCode) && enabled,
  });

export const useFloorplans = (floorCodes: string[], enabled: boolean) =>
  useQueries({
    queries: floorCodes.map((floorCode) => ({
      queryKey: ["floorplan", floorCode],
      queryFn: ({ signal }) =>
        apiGet<GeoRooms>(`/floors/${encodeURIComponent(floorCode)}/floorplan`, signal),
      enabled: enabled && floorCodes.length > 0,
    })),
  });

export const usePois = (floorCode: string | null, enabled = true) =>
  useQuery({
    queryKey: ["pois", floorCode],
    queryFn: ({ signal }) =>
      apiGet<Pois>(`/floors/${encodeURIComponent(floorCode ?? "")}/pois`, signal),
    enabled: Boolean(floorCode) && enabled,
  });

export const useRoutePaths = (start: string | undefined, end: string | undefined, enabled = true) =>
  useQuery({
    queryKey: ["routes", start, end],
    queryFn: ({ signal }) =>
      apiGet<Record<string, PreciseRoute>>(
        `/path?${new URLSearchParams({ start: start ?? "", end: end ?? "" })}`,
        signal,
      ),
    enabled: Boolean(start && end) && enabled,
  });

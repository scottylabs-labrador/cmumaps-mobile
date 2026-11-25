import type { Buildings, GeoRooms, Pois, PreciseRoute } from "@cmumaps/common";
import { useQuery } from "@tanstack/react-query";
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

export const useBuildings = () =>
  useQuery({
    queryKey: ["buildings"],
    queryFn: () => apiGet<Buildings>("/buildings"),
  });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ["search", query],
    queryFn: () => {
      const params = new URLSearchParams({ query });
      return apiGet<SearchDocument[]>(`/search?${params.toString()}`);
    },
    enabled: query.trim().length > 0,
  });

export const useFloorplan = (floorCode: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["floorplan", floorCode],
    queryFn: () => apiGet<GeoRooms>(`/floors/${encodeURIComponent(floorCode ?? "")}/floorplan`),
    enabled: Boolean(floorCode) && enabled,
  });

export const usePois = (floorCode: string | null, enabled: boolean) =>
  useQuery({
    queryKey: ["pois", floorCode],
    queryFn: () => apiGet<Pois>(`/floors/${encodeURIComponent(floorCode ?? "")}/pois`),
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
    queryFn: () => {
      const params = new URLSearchParams({ start: start ?? "", end: end ?? "" });
      const path = signedIn ? "/path" : "/path/public";
      return apiGet<Record<string, PreciseRoute>>(`${path}?${params.toString()}`);
    },
    enabled: Boolean(start && end) && enabled,
  });

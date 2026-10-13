import { useQuery } from "@tanstack/react-query";
import type { Buildings, GeoCoordinate } from "@cmumaps/common";
import { fetchRoutes } from "@/api/client";
import { useSignedInUser, useWaypoint } from "@/hooks/useWaypoint";
import type { RouteKind } from "@/store";

export const routeLine = (
  routes: Record<string, { path: { path: { coordinate: GeoCoordinate }[] } }> | undefined,
  selected: RouteKind,
) => {
  const route = routes?.[selected] ?? routes?.Fastest ?? routes?.Inside;
  return route?.path.path.map((node) => node.coordinate) ?? [];
};

export const useRoutes = (src: string, dst: string) => {
  const { user, isPending } = useSignedInUser();
  const start = useWaypoint(src);
  const end = useWaypoint(dst);
  const signedIn = Boolean(user);
  const routes = useQuery({
    queryKey: ["routes", signedIn, start.query, end.query],
    queryFn: () => fetchRoutes(start.query ?? "", end.query ?? "", signedIn),
    enabled: Boolean(start.query && end.query && !isPending),
  });

  return { start, end, routes, signedIn };
};

export const buildingCenter = (buildings: Buildings | undefined, code: string) => {
  const building = buildings?.[code];
  if (!building) {
    return null;
  }
  return {
    latitude: building.labelLatitude,
    longitude: building.labelLongitude,
  };
};

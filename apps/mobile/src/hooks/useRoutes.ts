import { useRoutePaths } from "@/api/client";
import { useWaypoint } from "@/hooks/useWaypoint";
import { buildRoutePlan, type RouteKind } from "@/lib/routePlan";
import { useMapStore } from "@/store";

export const useRoutes = (src: string, dst: string, selectedKind: RouteKind) => {
  const userPosition = useMapStore((state) => state.userPosition);
  const start = useWaypoint(src);
  const end = useWaypoint(dst);
  const routes = useRoutePaths(start.query, end.query);

  const plan = buildRoutePlan({
    srcToken: src,
    dstToken: dst,
    start,
    end,
    userPosition,
    selectedKind,
    routes: routes.data,
    isLoading: routes.isLoading,
    isError: routes.isError,
  });

  return { start, end, plan };
};

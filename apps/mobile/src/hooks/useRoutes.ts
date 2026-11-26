import { useRoutePaths } from "@/api/client";
import { useSignedInUser, useWaypoint } from "@/hooks/useWaypoint";
import { buildRoutePlan, type RouteKind } from "@/lib/routePlan";
import { useMapStore } from "@/store";

export const useRoutes = (src: string, dst: string, selectedKind: RouteKind) => {
  const { user, isPending } = useSignedInUser();
  const userPosition = useMapStore((state) => state.userPosition);
  const start = useWaypoint(src);
  const end = useWaypoint(dst);
  const signedIn = Boolean(user);
  const routes = useRoutePaths(start.query, end.query, signedIn, !isPending);

  const plan = buildRoutePlan({
    srcToken: src,
    dstToken: dst,
    start,
    end,
    userPosition,
    selectedKind,
    routes: routes.data,
    isLoading: routes.isLoading || isPending,
    isError: routes.isError,
  });

  return { start, end, plan, signedIn };
};

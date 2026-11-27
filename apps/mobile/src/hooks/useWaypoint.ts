import { useBuildings, useFloorplan } from "@/api/client";
import { authClient } from "@/auth/client";
import { formatFloorCode, parseWaypointToken } from "@/lib/campusTarget";
import { resolveWaypointData, type Waypoint } from "@/lib/routePlan";
import { useMapStore } from "@/store";

export type { Waypoint } from "@/lib/routePlan";

export const useSignedInUser = () => {
  const session = authClient.useSession();
  return {
    user: session.data?.user ?? null,
    isPending: session.isPending,
  };
};

export const useWaypoint = (token: string): Waypoint => {
  const userPosition = useMapStore((state) => state.userPosition);
  const buildings = useBuildings();
  const parsed = parseWaypointToken(token, buildings.data);

  const floorCode =
    parsed.kind === "room" && parsed.buildingCode !== "outside"
      ? formatFloorCode({ buildingCode: parsed.buildingCode, floor: parsed.floor })
      : null;
  const rooms = useFloorplan(floorCode);

  return resolveWaypointData(token, buildings.data, rooms.data, userPosition);
};

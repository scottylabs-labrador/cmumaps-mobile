import { useBuildings, useFloorplan } from "@/api/client";
import { authClient } from "@/auth/client";
import { getFloorLevelFromRoomName } from "@/lib/place";
import { isPublicBuilding } from "@/lib/publicBuilding";
import { useMapStore } from "@/store";

const FLOOR_WAYPOINT_PREFIX = "floor:";

export interface Waypoint {
  query?: string;
  label: string;
  buildingCode?: string;
  error?: string;
}

export const useSignedInUser = () => {
  const session = authClient.useSession();
  return {
    user: session.data?.user ?? null,
    isPending: session.isPending,
  };
};

export const useWaypoint = (point: string): Waypoint => {
  const { user } = useSignedInUser();
  const userPosition = useMapStore((state) => state.userPosition);
  const buildings = useBuildings();

  const normalized = point.startsWith(FLOOR_WAYPOINT_PREFIX)
    ? point.slice(FLOOR_WAYPOINT_PREFIX.length)
    : point;
  const [buildingCode, ...restParts] = normalized.split("-");
  const rest = restParts.join("-");
  const floorName = point.startsWith(FLOOR_WAYPOINT_PREFIX)
    ? rest
    : getFloorLevelFromRoomName(rest);
  const floorCode =
    buildingCode && floorName && buildingCode !== "outside"
      ? `${buildingCode}-${floorName}`
      : null;
  const canSeeFloor =
    isPublicBuilding(buildingCode) || Boolean(user);
  const rooms = useFloorplan(floorCode, canSeeFloor);

  if (point === "" || point === "user") {
    if (point === "") {
      return { label: "" };
    }
    if (!userPosition) {
      return { label: "Your location" };
    }
    return {
      query: `${userPosition.latitude},${userPosition.longitude}`,
      label: "Your location",
    };
  }

  if (point.includes(",")) {
    return { query: point, label: "Pinned place" };
  }

  if (!normalized.includes("-")) {
    const building = buildingCode ? buildings.data?.[buildingCode] : undefined;
    if (!building) {
      return { label: point, error: buildings.data ? "Unknown building" : undefined };
    }
    return { query: buildingCode, label: building.name, buildingCode };
  }

  const building = buildingCode ? buildings.data?.[buildingCode] : undefined;
  if (!(buildingCode && building)) {
    return { label: point, buildingCode, error: "Unknown building" };
  }

  const isFloor =
    point.startsWith(FLOOR_WAYPOINT_PREFIX) ||
    (Boolean(rest) && building.floors.includes(rest));
  if (isFloor) {
    if (!building.floors.includes(rest)) {
      return { label: point, buildingCode, error: "Unknown floor" };
    }
    return {
      query: `${FLOOR_WAYPOINT_PREFIX}${buildingCode}-${rest}`,
      label: `${building.name} floor ${rest}`,
      buildingCode,
    };
  }

  const room = rest ? rooms.data?.[rest] : undefined;
  if (!room) {
    return {
      label: `${buildingCode} ${rest}`,
      buildingCode,
      error: rooms.data ? "Unknown room" : undefined,
    };
  }
  return {
    query: room.id,
    label: room.alias || `${building.name} ${rest}`,
    buildingCode,
  };
};

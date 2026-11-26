import { useBuildings, useFloorplan } from "@/api/client";
import { authClient } from "@/auth/client";
import { canViewFloor, formatFloorCode, parseWaypointToken } from "@/lib/campusTarget";
import { useMapStore } from "@/store";

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

export const useWaypoint = (token: string): Waypoint => {
  const { user } = useSignedInUser();
  const userPosition = useMapStore((state) => state.userPosition);
  const buildings = useBuildings();
  const parsed = parseWaypointToken(token, buildings.data);

  const floorCode =
    parsed.kind === "room" && parsed.buildingCode !== "outside"
      ? formatFloorCode({ buildingCode: parsed.buildingCode, floor: parsed.floor })
      : null;
  const rooms = useFloorplan(
    floorCode,
    parsed.kind === "room" && canViewFloor(parsed.buildingCode, Boolean(user)),
  );

  switch (parsed.kind) {
    case "empty":
      return { label: "" };
    case "user":
      if (!userPosition) {
        return { label: "Your Location (unavailable)" };
      }
      return {
        query: `${userPosition.latitude},${userPosition.longitude}`,
        label: "Your Location",
      };
    case "coordinate":
      return { query: parsed.token, label: "Pinned place" };
    case "building":
      return {
        query: parsed.buildingCode,
        label: buildings.data?.[parsed.buildingCode]?.name ?? parsed.buildingCode,
        buildingCode: parsed.buildingCode,
      };
    case "floor":
      return {
        query: `floor:${formatFloorCode(parsed)}`,
        label: `${buildings.data?.[parsed.buildingCode]?.name ?? parsed.buildingCode} floor ${parsed.floor}`,
        buildingCode: parsed.buildingCode,
      };
    case "room": {
      const building = buildings.data?.[parsed.buildingCode];
      const room = rooms.data?.[parsed.roomName];
      if (!room) {
        return {
          label: `${parsed.buildingCode} ${parsed.roomName}`,
          buildingCode: parsed.buildingCode,
          error: rooms.data ? "Unknown room" : undefined,
        };
      }
      return {
        query: room.id,
        label: room.alias || `${building?.name ?? parsed.buildingCode} ${parsed.roomName}`,
        buildingCode: parsed.buildingCode,
      };
    }
    case "invalid":
      return {
        label: parsed.label,
        buildingCode: parsed.buildingCode,
        error: parsed.error,
      };
  }
};

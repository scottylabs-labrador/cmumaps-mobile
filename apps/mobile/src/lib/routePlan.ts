import type { Buildings, GeoCoordinate, GeoRooms, PreciseRoute } from "@cmumaps/common";
import type { CampusDataAdapter } from "../api/adapter";
import { formatFloorCode, parseWaypointToken } from "./campusTarget";

export type RouteKind = "Fastest" | "Inside";

export const ROUTE_KINDS: readonly RouteKind[] = ["Fastest", "Inside"];

export interface Waypoint {
  query?: string;
  label: string;
  buildingCode?: string;
  error?: string;
}

export interface RouteSummary {
  feet: number;
  distanceValue: string;
  distanceUnit: "ft" | "mi";
  minutes: number;
  arrival: string;
}

export interface RoutePlan {
  status: "idle" | "loading" | "unavailable" | "ready";
  selectedKind: RouteKind;
  availableKinds: RouteKind[];
  activeRoute: PreciseRoute | undefined;
  summary: RouteSummary | null;
  line: GeoCoordinate[];
  error?: string;
  canGo: boolean;
}

export const summarizeDistance = (distance: number, now = Date.now()): RouteSummary => {
  const feet = Math.max(0, Math.round(distance));
  const minutes = feet <= 0 ? 0 : Math.max(1, Math.round(feet / 250));
  const arrival = new Date(now + minutes * 60 * 1000).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const distanceValue = feet >= 1000 ? (feet / 5280).toFixed(1) : String(feet);
  const distanceUnit = feet >= 1000 ? "mi" : "ft";
  return { feet, distanceValue, distanceUnit, minutes, arrival };
};

export const summarizeRoute = (
  route: PreciseRoute | undefined,
  now = Date.now(),
): RouteSummary | null => {
  if (!route) {
    return null;
  }
  return summarizeDistance(route.path.distance, now);
};

export const resolveWaypointData = (
  token: string,
  buildings: Buildings | undefined,
  rooms: GeoRooms | undefined,
  userPosition: GeoCoordinate | null,
): Waypoint => {
  const parsed = parseWaypointToken(token, buildings);

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
        label: buildings?.[parsed.buildingCode]?.name ?? parsed.buildingCode,
        buildingCode: parsed.buildingCode,
      };
    case "floor":
      return {
        query: `floor:${formatFloorCode(parsed)}`,
        label: `${buildings?.[parsed.buildingCode]?.name ?? parsed.buildingCode} floor ${parsed.floor}`,
        buildingCode: parsed.buildingCode,
      };
    case "room": {
      const building = buildings?.[parsed.buildingCode];
      const room = rooms?.[parsed.roomName];
      if (!room) {
        return {
          label: `${parsed.buildingCode} ${parsed.roomName}`,
          buildingCode: parsed.buildingCode,
          error: rooms ? "Unknown room" : undefined,
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

export const buildRoutePlan = (input: {
  srcToken: string;
  dstToken: string;
  start: Waypoint;
  end: Waypoint;
  userPosition: GeoCoordinate | null;
  selectedKind: RouteKind;
  routes: Record<string, PreciseRoute> | undefined;
  isLoading: boolean;
  isError: boolean;
  now?: number;
}): RoutePlan => {
  const {
    srcToken,
    dstToken,
    start,
    end,
    userPosition,
    selectedKind,
    routes,
    isLoading,
    isError,
    now,
  } = input;

  if (!srcToken && !dstToken) {
    return {
      status: "idle",
      selectedKind,
      availableKinds: [],
      activeRoute: undefined,
      summary: null,
      line: [],
      canGo: false,
    };
  }

  const originReady = srcToken !== "user" || Boolean(userPosition);
  if (!originReady) {
    return {
      status: "unavailable",
      selectedKind,
      availableKinds: [],
      activeRoute: undefined,
      summary: null,
      line: [],
      error: "Path unavailable",
      canGo: false,
    };
  }

  const endpointError = start.error ?? end.error;
  if (endpointError) {
    return {
      status: "unavailable",
      selectedKind,
      availableKinds: [],
      activeRoute: undefined,
      summary: null,
      line: [],
      error: endpointError,
      canGo: false,
    };
  }

  if (isError) {
    return {
      status: "unavailable",
      selectedKind,
      availableKinds: [],
      activeRoute: undefined,
      summary: null,
      line: [],
      error: "Path unavailable",
      canGo: false,
    };
  }

  const availableKinds = ROUTE_KINDS.filter((kind) => Boolean(routes?.[kind]));
  const effectiveKind: RouteKind = routes?.[selectedKind]
    ? selectedKind
    : routes?.Fastest
      ? "Fastest"
      : routes?.Inside
        ? "Inside"
        : selectedKind;
  const activeRoute = routes?.[effectiveKind];

  if (!activeRoute) {
    return {
      status: isLoading || !start.query || !end.query ? "loading" : "unavailable",
      selectedKind: effectiveKind,
      availableKinds,
      activeRoute: undefined,
      summary: null,
      line: [],
      error: isLoading || !start.query || !end.query ? undefined : "Path unavailable",
      canGo: false,
    };
  }

  return {
    status: "ready",
    selectedKind: effectiveKind,
    availableKinds,
    activeRoute,
    summary: summarizeRoute(activeRoute, now),
    line: activeRoute.path.path.map((node) => node.coordinate),
    canGo: true,
  };
};

const fetchRoomsForToken = async (
  adapter: CampusDataAdapter,
  token: string,
  buildings: Buildings,
): Promise<GeoRooms | undefined> => {
  const parsed = parseWaypointToken(token, buildings);
  if (parsed.kind !== "room" || parsed.buildingCode === "outside") {
    return undefined;
  }
  return adapter.getFloorplan(formatFloorCode(parsed));
};

export const planRouteWithAdapter = async (
  adapter: CampusDataAdapter,
  options: {
    srcToken: string;
    dstToken: string;
    userPosition: GeoCoordinate | null;
    selectedKind: RouteKind;
    now?: number;
  },
): Promise<{ start: Waypoint; end: Waypoint; plan: RoutePlan }> => {
  const buildings = await adapter.getBuildings();
  const [startRooms, endRooms] = await Promise.all([
    fetchRoomsForToken(adapter, options.srcToken, buildings),
    fetchRoomsForToken(adapter, options.dstToken, buildings),
  ]);
  const start = resolveWaypointData(options.srcToken, buildings, startRooms, options.userPosition);
  const end = resolveWaypointData(options.dstToken, buildings, endRooms, options.userPosition);

  let routes: Record<string, PreciseRoute> | undefined;
  let isError = false;
  if (start.query && end.query) {
    try {
      routes = await adapter.getRoutes(start.query, end.query);
    } catch {
      isError = true;
    }
  }

  const plan = buildRoutePlan({
    srcToken: options.srcToken,
    dstToken: options.dstToken,
    start,
    end,
    userPosition: options.userPosition,
    selectedKind: options.selectedKind,
    routes,
    isLoading: false,
    isError,
    now: options.now,
  });

  return { start, end, plan };
};

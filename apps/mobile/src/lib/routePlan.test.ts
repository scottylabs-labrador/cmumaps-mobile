import { describe, expect, test } from "vite-plus/test";
import type { Buildings, GeoRooms, PreciseRoute } from "@cmumaps/common";
import type { CampusDataAdapter } from "../api/adapter";
import {
  buildRoutePlan,
  planRouteWithAdapter,
  summarizeDistance,
  summarizeRoute,
} from "./routePlan";

const buildings: Buildings = {
  CUC: {
    code: "CUC",
    name: "Cohon University Center",
    floors: ["LL", "1", "2", "3"],
    defaultFloor: "1",
    defaultOrdinal: 1,
    labelLatitude: 40.4435,
    labelLongitude: -79.9421,
    shape: [],
    hitbox: [],
    isMapped: true,
  },
  GHC: {
    code: "GHC",
    name: "Gates & Hillman Centers",
    floors: ["1", "2", "3", "4", "5"],
    defaultFloor: "4",
    defaultOrdinal: 4,
    labelLatitude: 40.4435,
    labelLongitude: -79.9445,
    shape: [],
    hitbox: [],
    isMapped: true,
  },
};

const cucFloor2: GeoRooms = {
  "222B": {
    id: "room-222b",
    alias: "Rangos 2",
    type: "Auditorium",
    labelPosition: { latitude: 40.4435, longitude: -79.9421 },
    points: [],
    floor: { buildingCode: "CUC", level: "2" },
  },
};

const sampleRoute = (distance: number): PreciseRoute => ({
  path: {
    distance,
    path: [
      {
        id: "n1",
        coordinate: { latitude: 40.443, longitude: -79.944 },
        floor: { buildingCode: "GHC", level: "4" },
        neighbors: {},
        roomId: "",
      },
      {
        id: "n2",
        coordinate: { latitude: 40.4435, longitude: -79.9421 },
        floor: { buildingCode: "CUC", level: "2" },
        neighbors: {},
        roomId: "room-222b",
      },
    ],
  },
  instructions: [{ action: "Turn left", distance, nodeId: "n2" }],
});

const createInMemoryAdapter = (
  routesByPair: Record<string, Record<string, PreciseRoute>>,
): CampusDataAdapter => ({
  getBuildings: async () => buildings,
  search: async () => [],
  getFloorplan: async (floorCode) => (floorCode === "CUC-2" ? cucFloor2 : {}),
  getPois: async () => ({}),
  getRoutes: async (start, end) => {
    const hit = routesByPair[`${start}->${end}`];
    if (!hit) {
      throw new Error("No route");
    }
    return hit;
  },
});

describe("routePlan", () => {
  test("summarizes distance in feet below 1000 ft and miles at or above 1000 ft", () => {
    const short = summarizeRoute(sampleRoute(261), Date.UTC(2026, 10, 26, 15, 0));
    expect(short?.distanceValue).toBe("261");
    expect(short?.distanceUnit).toBe("ft");
    expect(short?.minutes).toBe(1);

    const long = summarizeRoute(sampleRoute(2640), Date.UTC(2026, 10, 26, 15, 0));
    expect(long?.distanceValue).toBe("0.5");
    expect(long?.distanceUnit).toBe("mi");
    expect(long?.minutes).toBe(11);

    const arrived = summarizeDistance(0, Date.UTC(2026, 10, 26, 15, 0));
    expect(arrived.feet).toBe(0);
    expect(arrived.distanceValue).toBe("0");
    expect(arrived.distanceUnit).toBe("ft");
    expect(arrived.minutes).toBe(0);
  });

  test("marks plan unavailable when user location is missing", () => {
    const plan = buildRoutePlan({
      srcToken: "user",
      dstToken: "CUC",
      start: { label: "Your Location (unavailable)" },
      end: { query: "CUC", label: "Cohon University Center", buildingCode: "CUC" },
      userPosition: null,
      selectedKind: "Fastest",
      routes: { Fastest: sampleRoute(300) },
      isLoading: false,
      isError: false,
    });

    expect(plan.status).toBe("unavailable");
    expect(plan.error).toBe("Path unavailable");
    expect(plan.canGo).toBe(false);
    expect(plan.line).toEqual([]);
  });

  test("falls back from Fastest to Inside when only Inside exists via in-memory adapter", async () => {
    const adapter = createInMemoryAdapter({
      "GHC->room-222b": { Inside: sampleRoute(520) },
    });

    const { start, end, plan } = await planRouteWithAdapter(adapter, {
      srcToken: "GHC",
      dstToken: "CUC-222B",
      userPosition: null,
      signedIn: false,
      selectedKind: "Fastest",
      now: Date.UTC(2026, 10, 26, 15, 0),
    });

    expect(start.label).toBe("Gates & Hillman Centers");
    expect(end.label).toBe("Rangos 2");
    expect(plan.status).toBe("ready");
    expect(plan.selectedKind).toBe("Inside");
    expect(plan.availableKinds).toEqual(["Inside"]);
    expect(plan.canGo).toBe(true);
    expect(plan.line).toHaveLength(2);
  });

  test("surfaces unknown building error without requesting routes", async () => {
    const adapter = createInMemoryAdapter({});
    const { plan } = await planRouteWithAdapter(adapter, {
      srcToken: "INVALID",
      dstToken: "CUC",
      userPosition: null,
      signedIn: false,
      selectedKind: "Fastest",
    });

    expect(plan.status).toBe("unavailable");
    expect(plan.error).toBe("Unknown building");
    expect(plan.availableKinds).toEqual([]);
  });
});

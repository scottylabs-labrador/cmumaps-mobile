import { describe, expect, test } from "vite-plus/test";
import type { Buildings, GeoRooms, PreciseRoute } from "@cmumaps/common";
import {
  clampInstructionIndex,
  deriveCamera,
  deriveChromeVisibility,
  mapFloorAfterClosingPlaceSheet,
  resolveNavigationStep,
  resolveViewportFloor,
  visibleAdjacentFloorCodes,
  visibleRoomLabels,
} from "./mapSession";
import { buildRoutePlan } from "./routePlan";

const buildings: Buildings = {
  CUC: {
    code: "CUC",
    name: "Cohon University Center",
    floors: ["LL", "1", "2", "3"],
    defaultFloor: "1",
    defaultOrdinal: 1,
    labelLatitude: 40.4435,
    labelLongitude: -79.9421,
    shape: [
      [
        { latitude: 40.443, longitude: -79.943 },
        { latitude: 40.444, longitude: -79.943 },
        { latitude: 40.444, longitude: -79.941 },
        { latitude: 40.443, longitude: -79.941 },
      ],
    ],
    hitbox: [],
    isMapped: true,
  },
  GHC: {
    code: "GHC",
    name: "Gates & Hillman Centers",
    floors: ["1", "2", "3", "4"],
    defaultFloor: "4",
    defaultOrdinal: 4,
    labelLatitude: 40.4435,
    labelLongitude: -79.945,
    shape: [
      [
        { latitude: 40.443, longitude: -79.946 },
        { latitude: 40.444, longitude: -79.946 },
        { latitude: 40.444, longitude: -79.944 },
        { latitude: 40.443, longitude: -79.944 },
      ],
    ],
    hitbox: [],
    isMapped: true,
  },
};

const route: PreciseRoute = {
  path: {
    distance: 260,
    path: [
      {
        id: "n0",
        coordinate: { latitude: 40.4431, longitude: -79.9448 },
        floor: { buildingCode: "GHC", level: "4" },
        neighbors: {},
        roomId: "",
      },
      {
        id: "n1",
        coordinate: { latitude: 40.4433, longitude: -79.9435 },
        floor: { buildingCode: "CUC", level: "1" },
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
  instructions: [
    { action: "Walk straight", distance: 140, nodeId: "n1" },
    { action: "Turn left", distance: 120, nodeId: "n2" },
  ],
};

describe("mapSession", () => {
  test("resolves navigation step node, floor, remaining summary, and progress split including arrived state", () => {
    const fixedNow = Date.UTC(2026, 10, 26, 15, 0);
    const longRoute: PreciseRoute = {
      ...route,
      path: {
        ...route.path,
        distance: 1000,
      },
    };

    const startStep = resolveNavigationStep(longRoute, 0, true, fixedNow);
    expect(startStep.arrived).toBe(false);
    expect(startStep.stepNode?.id).toBe("n0");
    expect(startStep.stepFloor).toEqual({ buildingCode: "GHC", floor: "4" });
    expect(startStep.progressLines?.completed).toHaveLength(1);
    expect(startStep.progressLines?.remaining).toHaveLength(3);
    expect(startStep.summary?.feet).toBe(1000);
    expect(startStep.summary?.minutes).toBe(4);

    const midStep = resolveNavigationStep(longRoute, 1, true, fixedNow);
    expect(midStep.arrived).toBe(false);
    expect(midStep.stepNode?.id).toBe("n1");
    expect(midStep.stepFloor).toEqual({ buildingCode: "CUC", floor: "1" });
    expect(midStep.progressLines?.completed).toHaveLength(2);
    expect(midStep.progressLines?.remaining).toHaveLength(2);
    expect(midStep.summary!.feet).toBeGreaterThan(0);
    expect(midStep.summary!.feet).toBeLessThan(startStep.summary!.feet);
    expect(midStep.summary!.minutes).toBeLessThan(startStep.summary!.minutes);
    expect(midStep.summary!.arrival).not.toBe(startStep.summary!.arrival);

    const arrivedStep = resolveNavigationStep(longRoute, 2, true, fixedNow);
    expect(arrivedStep.arrived).toBe(true);
    expect(arrivedStep.stepFloor).toEqual({ buildingCode: "CUC", floor: "2" });
    expect(arrivedStep.progressLines?.completed).toHaveLength(3);
    expect(arrivedStep.progressLines?.remaining).toEqual([]);
    expect(arrivedStep.summary?.feet).toBe(0);
    expect(arrivedStep.summary?.distanceValue).toBe("0");
    expect(arrivedStep.summary?.minutes).toBe(0);
    expect(arrivedStep.summary?.arrival).not.toBe(midStep.summary!.arrival);

    expect(clampInstructionIndex(-5, 2)).toBe(0);
    expect(clampInstructionIndex(10, 2)).toBe(2);
  });

  test("resolves every building's viewport floor only past the floor zoom threshold", () => {
    const moderateZoomCuc = {
      latitude: 40.4435,
      longitude: -79.942,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    expect(resolveViewportFloor(buildings, moderateZoomCuc, 400)).toEqual({
      kind: "none",
    });
    expect(visibleAdjacentFloorCodes(buildings, moderateZoomCuc, 400, undefined)).toEqual([]);

    const zoomedCuc = {
      latitude: 40.4435,
      longitude: -79.942,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(resolveViewportFloor(buildings, zoomedCuc, 400)).toEqual({
      kind: "floor",
      floor: { buildingCode: "CUC", floor: "1" },
    });

    const zoomedGhc = {
      latitude: 40.4435,
      longitude: -79.945,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(resolveViewportFloor(buildings, zoomedGhc, 400)).toEqual({
      kind: "floor",
      floor: { buildingCode: "GHC", floor: "4" },
    });
    expect(visibleAdjacentFloorCodes(buildings, zoomedGhc, 400, undefined)).toEqual(["GHC-4"]);
    expect(visibleAdjacentFloorCodes(buildings, zoomedGhc, 400, "GHC")).toEqual([]);
    expect(resolveViewportFloor(undefined, zoomedGhc, 400)).toEqual({ kind: "none" });
  });

  test("shows neighboring floors below the density threshold when a reference floor is selected", () => {
    const region = {
      latitude: 40.4435,
      longitude: -79.9435,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    expect(resolveViewportFloor(buildings, region, 400)).toEqual({ kind: "none" });
    expect(
      visibleAdjacentFloorCodes(buildings, region, 400, "CUC", {
        buildingCode: "CUC",
        floor: "2",
      }),
    ).toEqual(["GHC-2"]);
    expect(
      visibleAdjacentFloorCodes(
        buildings,
        { ...region, longitude: -79.9421, longitudeDelta: 0.001 },
        400,
        "CUC",
        { buildingCode: "CUC", floor: "2" },
      ),
    ).toEqual([]);
  });

  test("shows matching visible floorplans even when the map center is outside every building", () => {
    const visibleBuildings: Buildings = {
      CUC: { ...buildings.CUC!, labelLatitude: 40.4441, labelLongitude: -79.9422 },
      GHC: {
        ...buildings.GHC!,
        shape: buildings.CUC!.shape,
        labelLatitude: 40.4441,
        labelLongitude: -79.9418,
      },
    };
    // Both footprints end at latitude 40.444, south of the map center.
    const region = {
      latitude: 40.4442,
      longitude: -79.9422,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(resolveViewportFloor(visibleBuildings, region, 400)).toEqual({
      kind: "floor",
      floor: { buildingCode: "CUC", floor: "1" },
    });
    expect(visibleAdjacentFloorCodes(visibleBuildings, region, 400, undefined)).toEqual([
      "CUC-1",
      "GHC-1",
    ]);
    const emptyRegion = { ...region, latitude: 40.45 };
    expect(resolveViewportFloor(visibleBuildings, emptyRegion, 400)).toEqual({ kind: "none" });
    expect(visibleAdjacentFloorCodes(visibleBuildings, emptyRegion, 400, undefined)).toEqual([]);
  });

  test("shows the reference floor without ordinal metadata or a configured default", () => {
    const region = {
      latitude: 40.4435,
      longitude: -79.942,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(
      resolveViewportFloor({ CUC: { ...buildings.CUC!, defaultOrdinal: null } }, region, 400),
    ).toEqual({ kind: "floor", floor: { buildingCode: "CUC", floor: "1" } });
    expect(
      resolveViewportFloor(
        { CUC: { ...buildings.CUC!, defaultFloor: null, defaultOrdinal: null } },
        region,
        400,
      ),
    ).toEqual({ kind: "floor", floor: { buildingCode: "CUC", floor: "LL" } });
  });

  test("preserves the reference floor until its footprint leaves the padded viewport", () => {
    const current = { buildingCode: "CUC", floor: "2" };
    const region = {
      latitude: 40.4435,
      longitude: -79.9445,
      latitudeDelta: 0.001,
      longitudeDelta: 0.004,
    };
    // GHC is nearer, but CUC still intersects the padded viewport.
    expect(resolveViewportFloor(buildings, region, 2000, current)).toEqual({
      kind: "floor",
      floor: current,
    });
    expect(
      resolveViewportFloor(
        buildings,
        { ...region, longitude: -79.945, longitudeDelta: 0.0008 },
        400,
        current,
      ),
    ).toEqual({
      kind: "floor",
      floor: { buildingCode: "GHC", floor: "4" },
    });
    const closeUp = {
      ...region,
      longitude: -79.9429,
      longitudeDelta: 0.0001,
      latitudeDelta: 0.0001,
    };
    expect(resolveViewportFloor(buildings, closeUp, 400, current)).toEqual({
      kind: "floor",
      floor: current,
    });
  });

  test("matches neighboring floors by ordinal instead of their default floor", () => {
    const nearbyBuildings: Buildings = {
      ...buildings,
      GHC: {
        ...buildings.GHC!,
        shape: buildings.CUC!.shape,
        labelLongitude: buildings.CUC!.labelLongitude,
      },
    };
    const region = {
      latitude: 40.4435,
      longitude: -79.942,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    const adjacent = (floor: string) =>
      visibleAdjacentFloorCodes(nearbyBuildings, region, 400, "CUC", {
        buildingCode: "CUC",
        floor,
      });
    expect(adjacent("1")).toEqual(["GHC-1"]);
    expect(adjacent("2")).toEqual(["GHC-2"]);
    expect(adjacent("LL")).toEqual([]);
    expect(
      visibleAdjacentFloorCodes(nearbyBuildings, region, 400, "GHC", {
        buildingCode: "GHC",
        floor: "2",
      }),
    ).toEqual(["CUC-2"]);
    expect(
      visibleAdjacentFloorCodes(
        { ...nearbyBuildings, GHC: { ...nearbyBuildings.GHC!, defaultOrdinal: null } },
        region,
        400,
        "CUC",
        { buildingCode: "CUC", floor: "1" },
      ),
    ).toEqual(["GHC-4"]);
    expect(adjacent("missing")).toEqual([]);
  });

  test("defaults missing ordinals to 1 on both the reference and neighboring buildings", () => {
    const nearbyBuildings: Buildings = {
      CUC: { ...buildings.CUC!, defaultOrdinal: null },
      GHC: { ...buildings.GHC!, shape: buildings.CUC!.shape, defaultOrdinal: null },
    };
    const region = {
      latitude: 40.4435,
      longitude: -79.942,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(
      visibleAdjacentFloorCodes(nearbyBuildings, region, 400, "CUC", {
        buildingCode: "CUC",
        floor: "1",
      }),
    ).toEqual(["GHC-4"]);
    expect(
      visibleAdjacentFloorCodes(nearbyBuildings, region, 400, "GHC", {
        buildingCode: "GHC",
        floor: "3",
      }),
    ).toEqual(["CUC-LL"]);
  });

  test("matches nonnumeric floor labels using their offset from the default ordinal", () => {
    const nearbyBuildings: Buildings = {
      ...buildings,
      GHC: {
        ...buildings.GHC!,
        shape: buildings.CUC!.shape,
        labelLongitude: buildings.CUC!.labelLongitude,
        floors: ["B", "G", "M", "U"],
        defaultFloor: "G",
        defaultOrdinal: 1,
      },
    };
    expect(
      visibleAdjacentFloorCodes(
        nearbyBuildings,
        {
          latitude: 40.4435,
          longitude: -79.942,
          latitudeDelta: 0.0008,
          longitudeDelta: 0.0008,
        },
        400,
        "CUC",
        { buildingCode: "CUC", floor: "2" },
      ),
    ).toEqual(["GHC-M"]);
  });

  test("derives camera region for navigating step vs planning route vs building target", () => {
    const plan = buildRoutePlan({
      srcToken: "GHC",
      dstToken: "CUC",
      start: { query: "GHC", label: "Gates & Hillman Centers", buildingCode: "GHC" },
      end: { query: "CUC", label: "Cohon University Center", buildingCode: "CUC" },
      userPosition: null,
      selectedKind: "Fastest",
      routes: { Fastest: route },
      isLoading: false,
      isError: false,
    });

    const navStep = resolveNavigationStep(route, 1, true);
    const navCam = deriveCamera({
      target: { kind: "building", buildingCode: "CUC" },
      buildings,
      rooms: undefined,
      navOpen: true,
      navigating: true,
      plan,
      step: navStep,
      instructionIndex: 1,
      src: "GHC",
      dst: "CUC",
    });
    expect(navCam.intent).toBe("nav:Fastest:1");
    expect(navCam.region?.latitude).toBeCloseTo(40.4433, 4);

    const buildingCam = deriveCamera({
      target: { kind: "building", buildingCode: "CUC" },
      buildings,
      rooms: undefined,
      navOpen: false,
      navigating: false,
      plan: { ...plan, line: [] },
      step: resolveNavigationStep(undefined, 0, false),
      instructionIndex: 0,
      src: "",
      dst: "",
      focusKey: 2,
    });
    expect(buildingCam.intent).toBe("building:CUC:2");
    expect(buildingCam.region?.latitude).toBeCloseTo(40.4435, 4);
    expect(buildingCam.region?.longitude).toBeCloseTo(-79.942, 4);
    expect(buildingCam.region!.latitudeDelta).toBeCloseTo(0.00125, 5);
    expect(buildingCam.region!.longitudeDelta).toBeCloseTo(0.0025, 5);
    expect(buildingCam.region!.latitudeDelta).toBeLessThan(0.004);
  });

  test("keeps the focused floor when PlaceSheet is dismissed", () => {
    expect(mapFloorAfterClosingPlaceSheet({ buildingCode: "CUC", floor: "1" }, null)).toEqual({
      buildingCode: "CUC",
      floor: "1",
    });
    expect(mapFloorAfterClosingPlaceSheet(null, { buildingCode: "GHC", floor: "4" })).toEqual({
      buildingCode: "GHC",
      floor: "4",
    });
    expect(mapFloorAfterClosingPlaceSheet(null, null)).toBeNull();
  });

  test("keeps AccountDial, PlaceSheet, and NavPanel mutually exclusive", () => {
    expect(
      deriveChromeVisibility({
        target: { kind: "home" },
        navOpen: false,
        showSearchResults: false,
        activeModal: "none",
        hasBuilding: false,
      }),
    ).toEqual({
      showFloorSwitcher: false,
      showAccountDial: true,
      showDialBackdrop: false,
      bottomPanel: "none",
    });

    expect(
      deriveChromeVisibility({
        target: { kind: "building", buildingCode: "CUC" },
        navOpen: false,
        showSearchResults: false,
        activeModal: "none",
        hasBuilding: true,
      }),
    ).toEqual({
      showFloorSwitcher: true,
      showAccountDial: false,
      showDialBackdrop: false,
      bottomPanel: "place",
    });
  });

  test("shows room numbers only when zoomed in on a floor and within viewport", () => {
    const floorRooms: GeoRooms = {
      "CUC:121": {
        id: "room-121",
        alias: "McConomy Auditorium",
        type: "Auditorium",
        labelPosition: { latitude: 40.4435, longitude: -79.9421 },
        points: [],
        floor: { buildingCode: "CUC", level: "1" },
      },
      "CUC:999": {
        id: "room-999",
        type: "Office",
        labelPosition: { latitude: 40.45, longitude: -79.95 },
        points: [],
        floor: { buildingCode: "CUC", level: "1" },
      },
    };

    const buildingZoom = {
      latitude: 40.4435,
      longitude: -79.9421,
      latitudeDelta: 0.002,
      longitudeDelta: 0.002,
    };
    expect(visibleRoomLabels(floorRooms, buildingZoom, 400)).toEqual([]);
    const selectedRoom = { buildingCode: "CUC", roomName: "121" };
    const selectedLabel = {
      key: "room-121",
      buildingCode: "CUC",
      roomName: "121",
      alias: "McConomy Auditorium",
      coordinate: { latitude: 40.4435, longitude: -79.9421 },
    };
    expect(visibleRoomLabels(floorRooms, buildingZoom, 400, selectedRoom)).toEqual([selectedLabel]);
    expect(visibleRoomLabels(floorRooms, null, 400, selectedRoom)).toEqual([selectedLabel]);
    expect(
      visibleRoomLabels(floorRooms, buildingZoom, 400, {
        buildingCode: "GHC",
        roomName: "121",
      }),
    ).toEqual([]);

    const floorZoom = {
      latitude: 40.4435,
      longitude: -79.9421,
      latitudeDelta: 0.0004,
      longitudeDelta: 0.0004,
    };
    expect(visibleRoomLabels(floorRooms, floorZoom, 400)).toEqual([
      {
        key: "room-121",
        buildingCode: "CUC",
        roomName: "121",
        alias: "McConomy Auditorium",
        coordinate: { latitude: 40.4435, longitude: -79.9421 },
      },
    ]);
  });
});

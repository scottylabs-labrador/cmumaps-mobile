import { describe, expect, test } from "vite-plus/test";
import type { Buildings, PreciseRoute } from "@cmumaps/common";
import {
  clampInstructionIndex,
  deriveCamera,
  deriveChromeVisibility,
  resolveNavigationStep,
  resolveViewportFloor,
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

  test("gates non-CUC viewport floor focus behind sign-in when zoomed in", () => {
    const zoomedCuc = {
      latitude: 40.4435,
      longitude: -79.942,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(resolveViewportFloor(buildings, zoomedCuc, 400, false)).toEqual({
      kind: "floor",
      floor: { buildingCode: "CUC", floor: "1" },
    });

    const zoomedGhc = {
      latitude: 40.4435,
      longitude: -79.945,
      latitudeDelta: 0.0008,
      longitudeDelta: 0.0008,
    };
    expect(resolveViewportFloor(buildings, zoomedGhc, 400, false)).toEqual({
      kind: "needsSignIn",
      buildingCode: "GHC",
      path: "/GHC-4",
    });
    expect(resolveViewportFloor(buildings, zoomedGhc, 400, true)).toEqual({
      kind: "floor",
      floor: { buildingCode: "GHC", floor: "4" },
    });
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
});

import {
  type Buildings,
  dist,
  type GeoCoordinate,
  type GeoRooms,
  type Instruction,
  type NavPathNode,
  type PreciseRoute,
} from "@cmumaps/common";
import {
  canViewFloor,
  type CampusTarget,
  type FloorRef,
  formatFloorCode,
  targetBuildingCode,
} from "./campusTarget";
import {
  buildingAt,
  buildingsInView,
  FLOOR_ZOOM_DENSITY,
  regionForBuilding,
  regionForCoordinates,
} from "./geometry";
import { type RoutePlan, type RouteSummary, summarizeDistance, summarizeRoute } from "./routePlan";

export type ActiveModal =
  | "none"
  | "dial"
  | "account"
  | "about"
  | "steps"
  | "reviewSignIn"
  | "report";

export interface CameraRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface NavigationStepState {
  arrived: boolean;
  instructions: Instruction[];
  currentInstruction: Instruction | undefined;
  stepNode: NavPathNode | undefined;
  stepFloor: FloorRef | null;
  progressLines: { completed: GeoCoordinate[]; remaining: GeoCoordinate[] } | null;
  summary: RouteSummary | null;
}

export type ViewportFloorResolution =
  | { kind: "none" }
  | { kind: "floor"; floor: FloorRef }
  | { kind: "needsSignIn"; buildingCode: string; path: string };

export const clampInstructionIndex = (index: number, instructionCount: number): number => {
  if (instructionCount <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(instructionCount, index));
};

const segmentDistance = (from: NavPathNode, to: NavPathNode): number => {
  if (
    from.floor &&
    to.floor &&
    from.floor.buildingCode === to.floor.buildingCode &&
    from.floor.level !== to.floor.level
  ) {
    return 25;
  }
  const neighborDist = from.neighbors[to.id]?.dist;
  if (typeof neighborDist === "number" && Number.isFinite(neighborDist)) {
    return neighborDist;
  }
  return dist(from.coordinate, to.coordinate);
};

const remainingRouteDistance = (route: PreciseRoute, splitIndex: number): number => {
  const path = route.path.path;
  if (splitIndex <= 0) {
    return route.path.distance;
  }
  if (splitIndex >= path.length - 1) {
    return 0;
  }
  let totalEdgeDist = 0;
  let remainingEdgeDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edgeDist = segmentDistance(path[i]!, path[i + 1]!);
    totalEdgeDist += edgeDist;
    if (i >= splitIndex) {
      remainingEdgeDist += edgeDist;
    }
  }
  return totalEdgeDist > 0 ? (remainingEdgeDist / totalEdgeDist) * route.path.distance : 0;
};

export const resolveNavigationStep = (
  route: PreciseRoute | undefined,
  instructionIndex: number,
  navigating: boolean,
  now = Date.now(),
): NavigationStepState => {
  const instructions = route?.instructions ?? [];
  if (!route || !navigating) {
    return {
      arrived: false,
      instructions,
      currentInstruction: instructions[instructionIndex],
      stepNode: undefined,
      stepFloor: null,
      progressLines: null,
      summary: summarizeRoute(route, now),
    };
  }

  const path = route.path.path;
  const arrived = instructions.length > 0 && instructionIndex >= instructions.length;

  if (arrived) {
    const endNode = path.at(-1);
    return {
      arrived: true,
      instructions,
      currentInstruction: undefined,
      stepNode: endNode,
      stepFloor: endNode?.floor
        ? { buildingCode: endNode.floor.buildingCode, floor: endNode.floor.level }
        : null,
      progressLines: {
        completed: path.map((node) => node.coordinate),
        remaining: [],
      },
      summary: summarizeDistance(0, now),
    };
  }

  const stepNode =
    instructionIndex === 0
      ? path[0]
      : path.find((entry) => entry.id === instructions[instructionIndex - 1]?.nodeId);

  const splitIndex = stepNode ? path.findIndex((node) => node.id === stepNode.id) : -1;
  const progressLines =
    splitIndex >= 0
      ? {
          completed: path.slice(0, splitIndex + 1).map((node) => node.coordinate),
          remaining: path.slice(splitIndex).map((node) => node.coordinate),
        }
      : null;

  return {
    arrived: false,
    instructions,
    currentInstruction: instructions[instructionIndex],
    stepNode,
    stepFloor: stepNode?.floor
      ? { buildingCode: stepNode.floor.buildingCode, floor: stepNode.floor.level }
      : null,
    progressLines,
    summary: summarizeDistance(remainingRouteDistance(route, splitIndex), now),
  };
};

export const resolveViewportFloor = (
  buildings: Buildings | undefined,
  region: CameraRegion,
  screenWidth: number,
  signedIn: boolean,
): ViewportFloorResolution => {
  if (!buildings || screenWidth / region.longitudeDelta < FLOOR_ZOOM_DENSITY) {
    return { kind: "none" };
  }
  const hit = buildingAt(buildings, {
    latitude: region.latitude,
    longitude: region.longitude,
  });
  const level = hit?.defaultFloor ?? hit?.floors[0];
  if (!hit || !level) {
    return { kind: "none" };
  }
  if (!canViewFloor(hit.code, signedIn)) {
    return {
      kind: "needsSignIn",
      buildingCode: hit.code,
      path: `/${hit.code}-${level}`,
    };
  }
  return {
    kind: "floor",
    floor: { buildingCode: hit.code, floor: level },
  };
};

export const visibleAdjacentFloorCodes = (
  buildings: Buildings | undefined,
  region: CameraRegion | null,
  screenWidth: number,
  signedIn: boolean,
  excludedBuildingCode: string | undefined,
): string[] => {
  if (!buildings || !region || screenWidth / region.longitudeDelta < FLOOR_ZOOM_DENSITY) {
    return [];
  }
  return buildingsInView(buildings, region)
    .filter(
      (building) => canViewFloor(building.code, signedIn) && building.code !== excludedBuildingCode,
    )
    .slice(0, 8)
    .map((building) => {
      const level = building.defaultFloor ?? building.floors[0];
      return level ? formatFloorCode({ buildingCode: building.code, floor: level }) : null;
    })
    .filter((code): code is string => Boolean(code));
};

export const deriveCamera = (input: {
  target: CampusTarget;
  buildings: Buildings | undefined;
  rooms: GeoRooms | undefined;
  navOpen: boolean;
  navigating: boolean;
  plan: RoutePlan;
  step: NavigationStepState;
  instructionIndex: number;
  src: string;
  dst: string;
  focusKey?: number;
}): { intent: string; region: CameraRegion | null } => {
  const {
    target,
    buildings,
    rooms,
    navOpen,
    navigating,
    plan,
    step,
    instructionIndex,
    src,
    dst,
    focusKey = 0,
  } = input;

  if (navigating) {
    const intent = `nav:${plan.selectedKind}:${instructionIndex}`;
    const coord = step.stepNode?.coordinate;
    return {
      intent,
      region: coord
        ? {
            latitude: coord.latitude,
            longitude: coord.longitude,
            latitudeDelta: 0.0008,
            longitudeDelta: 0.0008,
          }
        : null,
    };
  }

  if (navOpen && plan.line.length > 1) {
    return {
      intent: `route:${src}:${dst}:${plan.selectedKind}`,
      region: regionForCoordinates(plan.line),
    };
  }

  if (target.kind === "coordinate") {
    return {
      intent: `coord:${target.latitude},${target.longitude}:${focusKey}`,
      region: {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: 0.004,
        longitudeDelta: 0.004,
      },
    };
  }

  if (target.kind === "room") {
    const room = rooms?.[target.roomName];
    return {
      intent: `room:${target.buildingCode}-${target.roomName}:${focusKey}`,
      region: room
        ? {
            latitude: room.labelPosition.latitude,
            longitude: room.labelPosition.longitude,
            latitudeDelta: 0.0005,
            longitudeDelta: 0.0005,
          }
        : null,
    };
  }

  const code = targetBuildingCode(target);
  const building = code ? buildings?.[code] : undefined;
  if (target.kind === "floor") {
    return {
      intent: `floor:${target.buildingCode}-${target.floor}:${focusKey}`,
      region: building ? regionForBuilding(building) : null,
    };
  }

  if (target.kind === "building") {
    return {
      intent: `building:${target.buildingCode}:${focusKey}`,
      region: building ? regionForBuilding(building) : null,
    };
  }

  return { intent: "", region: null };
};

export const deriveChromeVisibility = (input: {
  target: CampusTarget;
  navOpen: boolean;
  showSearchResults: boolean;
  activeModal: ActiveModal;
  hasBuilding: boolean;
}) => {
  const { target, navOpen, showSearchResults, activeModal, hasBuilding } = input;
  const isHome = target.kind === "home" || target.kind === "pending";

  const bottomPanel: "about" | "nav" | "place" | "none" =
    activeModal === "about"
      ? "about"
      : navOpen && !showSearchResults
        ? "nav"
        : !showSearchResults && !isHome
          ? "place"
          : "none";

  return {
    showFloorSwitcher: !showSearchResults && hasBuilding,
    showAccountDial: !showSearchResults && !navOpen && activeModal !== "about" && isHome,
    showDialBackdrop: activeModal === "dial",
    bottomPanel,
  };
};

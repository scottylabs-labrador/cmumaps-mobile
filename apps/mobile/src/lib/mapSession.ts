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
  type CampusTarget,
  type FloorRef,
  formatFloorCode,
  targetBuildingCode,
} from "./campusTarget";
import {
  buildingsInView,
  FLOOR_ZOOM_DENSITY,
  ROOM_LABEL_ZOOM_DENSITY,
  regionForBuilding,
  regionForCoordinates,
} from "./geometry";
import { type RoutePlan, type RouteSummary, summarizeDistance, summarizeRoute } from "./routePlan";

export type ActiveModal = "none" | "dial" | "account" | "about" | "steps" | "report";

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

export type ViewportFloorResolution = { kind: "none" } | { kind: "floor"; floor: FloorRef };

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
  currentFloor: FloorRef | null = null,
): ViewportFloorResolution => {
  if (!buildings || screenWidth / region.longitudeDelta < FLOOR_ZOOM_DENSITY) {
    return { kind: "none" };
  }
  const visible = buildingsInView(buildings, region);
  const hit = visible
    .filter((building) => building.defaultFloor || building.floors.length > 0)
    .sort(
      (a, b) =>
        dist(region, { latitude: a.labelLatitude, longitude: a.labelLongitude }) -
        dist(region, { latitude: b.labelLatitude, longitude: b.labelLongitude }),
    )[0];
  const level = hit
    ? (matchingFloorLevel(buildings, currentFloor, hit.code) ?? hit.defaultFloor ?? hit.floors[0])
    : undefined;
  if (!hit || !level) {
    return { kind: "none" };
  }
  return {
    kind: "floor",
    floor: { buildingCode: hit.code, floor: level },
  };
};

const matchingFloorLevel = (
  buildings: Buildings,
  referenceFloor: FloorRef | null,
  buildingCode: string,
): string | undefined => {
  const reference = referenceFloor ? buildings[referenceFloor.buildingCode] : undefined;
  const building = buildings[buildingCode];
  if (!reference || !referenceFloor || !building) return undefined;
  const index = reference.floors.indexOf(referenceFloor.floor);
  if (index < 0) return undefined;
  if (reference.code === building.code) return referenceFloor.floor;
  const referenceDefaultIndex = reference.floors.indexOf(reference.defaultFloor ?? "");
  const defaultIndex = building.floors.indexOf(building.defaultFloor ?? "");
  if (referenceDefaultIndex < 0 || defaultIndex < 0) return undefined;
  const ordinal = (reference.defaultOrdinal ?? 0) + index - referenceDefaultIndex;
  return building.floors[defaultIndex + ordinal - (building.defaultOrdinal ?? 0)];
};

export interface VisibleRoomLabel {
  key: string;
  buildingCode: string;
  roomName: string;
  alias?: string;
  coordinate: GeoCoordinate;
}

export const visibleRoomLabels = (
  rooms: GeoRooms | undefined,
  region: CameraRegion | null,
  screenWidth: number,
  selectedRoom?: { buildingCode: string; roomName: string },
): VisibleRoomLabel[] => {
  if (!rooms) {
    return [];
  }
  const showOrdinaryLabels =
    region !== null && screenWidth / region.longitudeDelta >= ROOM_LABEL_ZOOM_DENSITY;

  const labels: VisibleRoomLabel[] = [];
  for (const [rawKey, room] of Object.entries(rooms)) {
    const roomName = rawKey.includes(":") ? rawKey.slice(rawKey.indexOf(":") + 1) : rawKey;
    if (!roomName) {
      continue;
    }
    const { latitude, longitude } = room.labelPosition;
    const selected =
      selectedRoom?.buildingCode === room.floor.buildingCode && selectedRoom.roomName === roomName;
    if (
      !selected &&
      (!showOrdinaryLabels ||
        !region ||
        Math.abs(latitude - region.latitude) > region.latitudeDelta * 0.6 ||
        Math.abs(longitude - region.longitude) > region.longitudeDelta * 0.6)
    ) {
      continue;
    }
    labels.push({
      key: room.id || `${room.floor.buildingCode}:${roomName}`,
      buildingCode: room.floor.buildingCode,
      roomName,
      alias: room.alias || undefined,
      coordinate: room.labelPosition,
    });
  }
  return labels;
};

export const visibleAdjacentFloorCodes = (
  buildings: Buildings | undefined,
  region: CameraRegion | null,
  screenWidth: number,
  excludedBuildingCode: string | undefined,
  activeFloor: FloorRef | null = null,
): string[] => {
  if (!buildings || !region || screenWidth / region.longitudeDelta < FLOOR_ZOOM_DENSITY) {
    return [];
  }
  const referenceFloor =
    activeFloor ??
    (() => {
      const resolved = resolveViewportFloor(buildings, region, screenWidth);
      return resolved.kind === "floor" ? resolved.floor : null;
    })();
  const referenceBuilding = referenceFloor ? buildings[referenceFloor.buildingCode] : undefined;
  if (
    !referenceBuilding ||
    !referenceBuilding.floors.includes(referenceBuilding.defaultFloor ?? "")
  ) {
    return [];
  }
  return buildingsInView(buildings, region)
    .filter((building) => building.code !== excludedBuildingCode)
    .map((building) => {
      const level = matchingFloorLevel(buildings, referenceFloor, building.code);
      return level ? formatFloorCode({ buildingCode: building.code, floor: level }) : null;
    })
    .filter((code): code is string => Boolean(code))
    .slice(0, 8);
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

/**
 * Dismissing PlaceSheet clears the selected target but should keep the indoor
 * floor visible until the user zooms or pans away.
 */
export const mapFloorAfterClosingPlaceSheet = (
  activeFloor: FloorRef | null,
  previousMapFloor: FloorRef | null,
): FloorRef | null => activeFloor ?? previousMapFloor;

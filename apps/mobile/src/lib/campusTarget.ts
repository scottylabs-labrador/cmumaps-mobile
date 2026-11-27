import type { Buildings, GeoRooms } from "@cmumaps/common";
import type { SearchDocument } from "@/api/client";

const FLOOR_REGEX = /^[A-F0-9]|LL|M|EV|PH/u;
const FLOOR_WAYPOINT_PREFIX = "floor:";

export interface FloorRef {
  buildingCode: string;
  floor: string;
}

export type CampusTarget =
  | { kind: "home" }
  | { kind: "pending" }
  | { kind: "unknown" }
  | { kind: "coordinate"; latitude: number; longitude: number }
  | { kind: "building"; buildingCode: string }
  | { kind: "floor"; buildingCode: string; floor: string }
  | { kind: "room"; buildingCode: string; floor: string; roomName: string };

export type ParsedWaypoint =
  | { kind: "empty" }
  | { kind: "user" }
  | { kind: "coordinate"; token: string }
  | { kind: "building"; buildingCode: string }
  | { kind: "floor"; buildingCode: string; floor: string }
  | { kind: "room"; buildingCode: string; floor: string; roomName: string }
  | { kind: "invalid"; label: string; buildingCode?: string; error?: string };

export const floorLevelFromRoomName = (roomName: string | undefined): string => {
  if (!roomName) {
    return "";
  }
  return roomName.match(FLOOR_REGEX)?.[0] ?? "";
};

export const formatFloorCode = (floor: FloorRef): string => `${floor.buildingCode}-${floor.floor}`;

const suffixFromPathname = (pathname: string): string => {
  if (pathname === "/" || pathname === "") {
    return "";
  }
  return pathname.replace(/^\//, "");
};

export const parseCampusTarget = (
  pathname: string,
  buildings: Buildings | undefined,
  floorParam = "",
): CampusTarget => {
  const pathSuffix = suffixFromPathname(pathname);
  const suffix = pathSuffix === "" && floorParam ? floorParam : pathSuffix;

  if (suffix === "" || suffix === "user") {
    return { kind: "home" };
  }
  if (suffix.includes("/")) {
    return { kind: "unknown" };
  }
  if (suffix.includes(",")) {
    const [latText, lngText] = suffix.split(",");
    const latitude = Number(latText);
    const longitude = Number(lngText);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { kind: "coordinate", latitude, longitude };
    }
    return { kind: "unknown" };
  }
  if (!buildings) {
    return { kind: "pending" };
  }

  const [buildingCode, ...restParts] = suffix.split("-");
  const rest = restParts.join("-");
  const building = buildingCode ? buildings[buildingCode] : undefined;
  if (!buildingCode || !building) {
    return { kind: "unknown" };
  }
  if (!rest) {
    return { kind: "building", buildingCode };
  }

  const floorLevel = floorLevelFromRoomName(rest);
  if (floorLevel && building.floors.includes(floorLevel) && rest === floorLevel) {
    return { kind: "floor", buildingCode, floor: floorLevel };
  }
  if (floorLevel && building.floors.includes(floorLevel)) {
    return { kind: "room", buildingCode, floor: floorLevel, roomName: rest };
  }
  return { kind: "unknown" };
};

export const parseWaypointToken = (
  token: string,
  buildings: Buildings | undefined,
): ParsedWaypoint => {
  if (token === "") {
    return { kind: "empty" };
  }
  if (token === "user") {
    return { kind: "user" };
  }
  if (token.includes(",")) {
    return { kind: "coordinate", token };
  }

  const explicitFloor = token.startsWith(FLOOR_WAYPOINT_PREFIX);
  const normalized = explicitFloor ? token.slice(FLOOR_WAYPOINT_PREFIX.length) : token;
  const [buildingCode, ...restParts] = normalized.split("-");
  const rest = restParts.join("-");
  const building = buildingCode ? buildings?.[buildingCode] : undefined;

  if (!normalized.includes("-")) {
    if (!buildingCode || !building) {
      return {
        kind: "invalid",
        label: token,
        error: buildings ? "Unknown building" : undefined,
      };
    }
    return { kind: "building", buildingCode };
  }

  if (!buildingCode || !building) {
    return {
      kind: "invalid",
      label: token,
      buildingCode,
      error: buildings ? "Unknown building" : undefined,
    };
  }

  const isFloor = explicitFloor || (Boolean(rest) && building.floors.includes(rest));
  if (isFloor) {
    if (!building.floors.includes(rest)) {
      return { kind: "invalid", label: token, buildingCode, error: "Unknown floor" };
    }
    return { kind: "floor", buildingCode, floor: rest };
  }

  const floor = floorLevelFromRoomName(rest);
  if (!rest || !floor) {
    return { kind: "invalid", label: `${buildingCode} ${rest}`.trim(), buildingCode };
  }
  return { kind: "room", buildingCode, floor, roomName: rest };
};

export const targetFromSearchDocument = (doc: SearchDocument): CampusTarget | null => {
  if (doc.type === "building") {
    return { kind: "building", buildingCode: doc.id };
  }
  if (doc.type === "floor") {
    const buildingCode = doc.floor?.buildingCode ?? doc.id.split("-")[0];
    const floor = doc.floor?.level ?? doc.id.split("-").slice(1).join("-");
    if (!buildingCode || !floor) {
      return null;
    }
    return { kind: "floor", buildingCode, floor };
  }
  const [buildingCode, roomName] = doc.nameWithSpace.split(" ");
  if (!buildingCode || !roomName) {
    return null;
  }
  return {
    kind: "room",
    buildingCode,
    floor: floorLevelFromRoomName(roomName),
    roomName,
  };
};

export const targetBuildingCode = (target: CampusTarget): string | undefined =>
  target.kind === "building" || target.kind === "floor" || target.kind === "room"
    ? target.buildingCode
    : undefined;

export const targetFocusedFloor = (
  target: CampusTarget,
  buildings: Buildings | undefined,
): FloorRef | null => {
  if (target.kind === "floor" || target.kind === "room") {
    return { buildingCode: target.buildingCode, floor: target.floor };
  }
  if (target.kind === "building") {
    const level = buildings?.[target.buildingCode]?.defaultFloor;
    if (!level) {
      return null;
    }
    return { buildingCode: target.buildingCode, floor: level };
  }
  return null;
};

export const targetPath = (target: CampusTarget): string => {
  switch (target.kind) {
    case "building":
      return `/${target.buildingCode}`;
    case "floor":
      return `/${target.buildingCode}-${target.floor}`;
    case "room":
      return `/${target.buildingCode}-${target.roomName}`;
    case "coordinate":
      return `/${target.latitude},${target.longitude}`;
    default:
      return "/";
  }
};

export const targetWaypointToken = (target: CampusTarget): string => {
  switch (target.kind) {
    case "building":
      return target.buildingCode;
    case "floor":
      return `${FLOOR_WAYPOINT_PREFIX}${target.buildingCode}-${target.floor}`;
    case "room":
      return `${target.buildingCode}-${target.roomName}`;
    case "coordinate":
      return `${target.latitude},${target.longitude}`;
    default:
      return "";
  }
};

export const targetHref = (path: string, src?: string, dst?: string): string => {
  const params = new URLSearchParams();
  if (src) {
    params.set("src", src);
  }
  if (dst) {
    params.set("dst", dst);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

export const targetShareUrl = (
  target: CampusTarget,
  query: { src?: string; dst?: string; floor?: string },
  webOrigin: string,
): string => {
  const url = new URL(targetPath(target), webOrigin);
  if (query.src) {
    url.searchParams.set("src", query.src);
  }
  if (query.dst) {
    url.searchParams.set("dst", query.dst);
  }
  if (query.floor) {
    url.searchParams.set("floor", query.floor);
  }
  return url.toString();
};

export const targetTitle = (
  target: CampusTarget,
  buildings: Buildings | undefined,
  rooms: GeoRooms | undefined,
): string => {
  if (target.kind === "coordinate") {
    return "Pinned place";
  }
  if (target.kind === "unknown") {
    return "That link is not on the map";
  }
  if (target.kind !== "building" && target.kind !== "floor" && target.kind !== "room") {
    return "";
  }
  const building = buildings?.[target.buildingCode];
  if (target.kind === "room") {
    const room = rooms?.[target.roomName];
    return room?.alias || `${building?.name ?? target.buildingCode} ${target.roomName}`;
  }
  if (target.kind === "floor") {
    return `${building?.name ?? target.buildingCode} floor ${target.floor}`;
  }
  return building?.name ?? target.buildingCode;
};

export const targetSubtitle = (
  target: CampusTarget,
  buildings: Buildings | undefined,
  rooms: GeoRooms | undefined,
): string => {
  const code = targetBuildingCode(target);
  const building = code ? buildings?.[code] : undefined;
  if (target.kind === "room") {
    return rooms?.[target.roomName]?.alias
      ? `${target.buildingCode} ${target.roomName}${building ? ` · ${building.name}` : ""}`
      : (building?.name ?? target.buildingCode);
  }
  return building ? building.code : "";
};

export const targetDetail = (
  target: CampusTarget,
  buildings: Buildings | undefined,
  rooms: GeoRooms | undefined,
): string => {
  const code = targetBuildingCode(target);
  const building = code ? buildings?.[code] : undefined;
  if (target.kind === "room") {
    return `${rooms?.[target.roomName]?.type ?? "Room"} in ${building?.name ?? target.buildingCode}`;
  }
  return building?.name ?? "";
};

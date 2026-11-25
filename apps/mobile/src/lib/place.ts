import type { Buildings } from "@cmumaps/common";

const FLOOR_REGEX = /^[A-F0-9]|LL|M|EV|PH/u;

export const getFloorLevelFromRoomName = (roomName: string | undefined) => {
  if (!roomName) {
    return;
  }
  return roomName.match(FLOOR_REGEX)?.[0] ?? "";
};

export type Place =
  | { kind: "home" }
  | { kind: "pending" }
  | { kind: "unknown" }
  | { kind: "coordinate"; latitude: number; longitude: number }
  | { kind: "building"; buildingCode: string }
  | { kind: "floor"; buildingCode: string; floor: string }
  | { kind: "room"; buildingCode: string; floor: string; roomName: string };

export const suffixFromPathname = (pathname: string) => {
  if (pathname === "/" || pathname === "") {
    return "";
  }
  return pathname.replace(/^\//, "");
};

export const parsePlace = (suffix: string, buildings: Buildings | undefined): Place => {
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
  if (!buildingCode || !buildings[buildingCode]) {
    return { kind: "unknown" };
  }
  if (!rest) {
    return { kind: "building", buildingCode };
  }

  const building = buildings[buildingCode];
  const floorLevel = getFloorLevelFromRoomName(rest);
  if (floorLevel && building.floors.includes(floorLevel) && rest === floorLevel) {
    return { kind: "floor", buildingCode, floor: floorLevel };
  }
  if (floorLevel && building.floors.includes(floorLevel)) {
    return { kind: "room", buildingCode, floor: floorLevel, roomName: rest };
  }
  return { kind: "unknown" };
};

export const placePath = (place: Place) => {
  switch (place.kind) {
    case "building":
      return `/${place.buildingCode}`;
    case "floor":
      return `/${place.buildingCode}-${place.floor}`;
    case "room":
      return `/${place.buildingCode}-${place.roomName}`;
    case "coordinate":
      return `/${place.latitude},${place.longitude}`;
    default:
      return "/";
  }
};

export const focusedFloor = (
  place: Place,
  buildings: Buildings | undefined,
): { buildingCode: string; floor: string } | null => {
  if (place.kind === "floor" || place.kind === "room") {
    return { buildingCode: place.buildingCode, floor: place.floor };
  }
  if (place.kind === "building") {
    const level = buildings?.[place.buildingCode]?.defaultFloor;
    if (!level) {
      return null;
    }
    return { buildingCode: place.buildingCode, floor: level };
  }
  return null;
};

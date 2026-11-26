import { describe, expect, test } from "vite-plus/test";
import type { Buildings, GeoRooms } from "@cmumaps/common";
import {
  canViewFloor,
  parseCampusTarget,
  parseWaypointToken,
  targetDetail,
  targetFocusedFloor,
  targetFromSearchDocument,
  targetHref,
  targetPath,
  targetShareUrl,
  targetSubtitle,
  targetTitle,
  targetWaypointToken,
} from "./campusTarget";

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
    floors: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    defaultFloor: "4",
    defaultOrdinal: 4,
    labelLatitude: 40.4435,
    labelLongitude: -79.9445,
    shape: [],
    hitbox: [],
    isMapped: true,
  },
};

const rooms: GeoRooms = {
  "222B": {
    id: "room-222b",
    alias: "Rangos 2",
    type: "Auditorium",
    labelPosition: { latitude: 40.4435, longitude: -79.9421 },
    points: [],
    floor: { buildingCode: "CUC", level: "2" },
  },
  "210": {
    id: "room-210",
    alias: "",
    type: "Classroom",
    labelPosition: { latitude: 40.4435, longitude: -79.9421 },
    points: [],
    floor: { buildingCode: "CUC", level: "2" },
  },
};

describe("campusTarget", () => {
  test("enforces CUC Floor visibility for signed-out vs signed-in users", () => {
    expect(canViewFloor("CUC", false)).toBe(true);
    expect(canViewFloor("GHC", false)).toBe(false);
    expect(canViewFloor("GHC", true)).toBe(true);
    expect(canViewFloor(undefined, true)).toBe(false);
  });

  test("parses URL paths and floor fallback into Building, Floor, Room, and coordinates", () => {
    expect(parseCampusTarget("/", buildings)).toEqual({ kind: "home" });
    expect(parseCampusTarget("/CUC", undefined)).toEqual({ kind: "pending" });
    expect(parseCampusTarget("/CUC", buildings)).toEqual({
      kind: "building",
      buildingCode: "CUC",
    });
    expect(parseCampusTarget("/CUC-LL", buildings)).toEqual({
      kind: "floor",
      buildingCode: "CUC",
      floor: "LL",
    });
    expect(parseCampusTarget("/CUC-222B", buildings)).toEqual({
      kind: "room",
      buildingCode: "CUC",
      floor: "2",
      roomName: "222B",
    });
    expect(parseCampusTarget("/", buildings, "CUC-2")).toEqual({
      kind: "floor",
      buildingCode: "CUC",
      floor: "2",
    });
    expect(parseCampusTarget("/40.443,-79.942", buildings)).toEqual({
      kind: "coordinate",
      latitude: 40.443,
      longitude: -79.942,
    });
    expect(parseCampusTarget("/NOPE-99", buildings)).toEqual({ kind: "unknown" });
  });

  test("parses Waypoint tokens consistently across user, coordinate, building, floor, and room", () => {
    expect(parseWaypointToken("", buildings)).toEqual({ kind: "empty" });
    expect(parseWaypointToken("user", buildings)).toEqual({ kind: "user" });
    expect(parseWaypointToken("40.44,-79.94", buildings)).toEqual({
      kind: "coordinate",
      token: "40.44,-79.94",
    });
    expect(parseWaypointToken("GHC", buildings)).toEqual({
      kind: "building",
      buildingCode: "GHC",
    });
    expect(parseWaypointToken("floor:CUC-2", buildings)).toEqual({
      kind: "floor",
      buildingCode: "CUC",
      floor: "2",
    });
    expect(parseWaypointToken("CUC-222B", buildings)).toEqual({
      kind: "room",
      buildingCode: "CUC",
      floor: "2",
      roomName: "222B",
    });
    expect(parseWaypointToken("INVALID", buildings)).toEqual({
      kind: "invalid",
      label: "INVALID",
      error: "Unknown building",
    });
    expect(parseWaypointToken("floor:CUC-9", buildings)).toEqual({
      kind: "invalid",
      label: "floor:CUC-9",
      buildingCode: "CUC",
      error: "Unknown floor",
    });
  });

  test("converts SearchDocuments to CampusTargets and serializes paths, tokens, and share URLs", () => {
    const floorTarget = targetFromSearchDocument({
      id: "CUC-2",
      nameWithSpace: "CUC 2",
      fullNameWithSpace: "Cohon University Center Floor 2",
      labelPosition: null,
      type: "floor",
      floor: { buildingCode: "CUC", level: "2" },
      alias: "CUC-2",
    });
    expect(floorTarget).toEqual({ kind: "floor", buildingCode: "CUC", floor: "2" });
    expect(targetPath(floorTarget!)).toBe("/CUC-2");
    expect(targetWaypointToken(floorTarget!)).toBe("floor:CUC-2");

    const roomTarget = targetFromSearchDocument({
      id: "room-222b",
      nameWithSpace: "CUC 222B",
      fullNameWithSpace: "Cohon University Center 222B",
      labelPosition: null,
      type: "room",
      alias: "Rangos 2",
    });
    expect(roomTarget).toEqual({
      kind: "room",
      buildingCode: "CUC",
      floor: "2",
      roomName: "222B",
    });
    expect(targetFocusedFloor(roomTarget!, buildings)).toEqual({
      buildingCode: "CUC",
      floor: "2",
    });
    expect(targetTitle(roomTarget!, buildings, rooms)).toBe("Rangos 2");
    expect(targetSubtitle(roomTarget!, buildings, rooms)).toBe(
      "CUC 222B · Cohon University Center",
    );
    expect(targetDetail(roomTarget!, buildings, rooms)).toBe(
      "Auditorium in Cohon University Center",
    );
    expect(targetHref("/CUC", "GHC", "CUC-222B")).toBe("/CUC?src=GHC&dst=CUC-222B");
    expect(
      targetShareUrl(roomTarget!, { src: "GHC", dst: "CUC-222B" }, "https://cmumaps.com"),
    ).toBe("https://cmumaps.com/CUC-222B?src=GHC&dst=CUC-222B");
  });
});

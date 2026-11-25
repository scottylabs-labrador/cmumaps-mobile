import type { Placement, RoomInfo } from "@cmumaps/common";
import {
  extractBuildingCode,
  extractFloorLevel,
  pdfCoordsToGeoCoords,
  pdfPolygonToGeoPolygon,
} from "@cmumaps/common";
import { db } from "@cmumaps/db/client";
import { node as nodeTable, room as roomTable } from "@cmumaps/db/schema";
import { eq } from "drizzle-orm";

export const roomService = {
  createRoom: async (
    floorCode: string,
    roomId: string,
    roomNodes: string[],
    roomInfo: RoomInfo,
    placement: Placement,
  ) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    const { labelPosition, polygon } = roomInfo;
    const geoCoords = pdfCoordsToGeoCoords(placement)(labelPosition);
    const geoPolygon = pdfPolygonToGeoPolygon(polygon, placement);

    // also need to add room id to every node in this room
    await db.transaction(async (tx) => {
      await tx.insert(roomTable).values({
        roomId,
        type: roomInfo.type,
        buildingCode,
        floorLevel,
        name: roomInfo.name,
        labelLatitude: geoCoords.latitude,
        labelLongitude: geoCoords.longitude,
        polygon: geoPolygon,
      });

      for (const nodeId of roomNodes) {
        await tx.update(nodeTable).set({ roomId }).where(eq(nodeTable.nodeId, nodeId));
      }
    });
  },

  deleteRoom: async (roomId: string) => {
    await db.delete(roomTable).where(eq(roomTable.roomId, roomId));
  },

  updateRoom: async (roomId: string, roomInfo: Partial<RoomInfo>, placement: Placement) => {
    const { labelPosition, polygon } = roomInfo;
    const geoCoords = labelPosition ? pdfCoordsToGeoCoords(placement)(labelPosition) : undefined;

    const geoPolygon = polygon ? pdfPolygonToGeoPolygon(polygon, placement) : undefined;

    await db
      .update(roomTable)
      .set({
        name: roomInfo.name,
        labelLatitude: geoCoords?.latitude,
        labelLongitude: geoCoords?.longitude,
        polygon: geoPolygon,
      })
      .where(eq(roomTable.roomId, roomId));
  },
};

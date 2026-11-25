import type { NodeInfo, Placement } from "@cmumaps/common";
import { extractBuildingCode, extractFloorLevel, pdfCoordsToGeoCoords } from "@cmumaps/common";
import { node as nodeTable } from "@cmumaps/db/schema";
import { eq } from "drizzle-orm";
import { db } from "../db.ts";

export const nodeService = {
  getNode: async (nodeId: string) => {
    const node = await db.query.node.findFirst({
      where: eq(nodeTable.nodeId, nodeId),
    });
    if (!node) {
      throw new Error(`Node not found: ${nodeId}`);
    }
    return node;
  },

  upsertNode: async (
    floorCode: string,
    nodeId: string,
    nodeInfo: NodeInfo,
    placement: Placement,
  ) => {
    const { pos, roomId } = nodeInfo;
    const geoCoords = pdfCoordsToGeoCoords(placement)(pos);

    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    const data = {
      ...geoCoords,
      buildingCode,
      floorLevel,
      ...(roomId ? { roomId } : {}),
    };

    await db
      .insert(nodeTable)
      .values({
        nodeId,
        ...data,
      })
      .onConflictDoUpdate({
        target: nodeTable.nodeId,
        set: data,
      });
  },

  deleteNode: async (nodeId: string) => {
    await db.delete(nodeTable).where(eq(nodeTable.nodeId, nodeId));
  },
};

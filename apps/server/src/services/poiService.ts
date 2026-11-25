import type { PoiInfo, PoiType } from "@cmumaps/common";
import { db } from "@cmumaps/db/client";
import { poi as poiTable } from "@cmumaps/db/schema";
import { eq } from "drizzle-orm";

export const poiService = {
  createPoi: async (poiId: string, poiInfo: PoiInfo) => {
    await db.insert(poiTable).values({
      poiId,
      type: poiInfo.type,
      latitude: poiInfo.latitude,
      longitude: poiInfo.longitude,
      buildingCode: poiInfo.buildingCode ?? null,
      floorLevel: poiInfo.floorLevel ?? null,
    });
  },

  deletePoi: async (poiId: string) => {
    await db.delete(poiTable).where(eq(poiTable.poiId, poiId));
  },

  updatePoiType: async (poiId: string, poiType: PoiType) => {
    await db.update(poiTable).set({ type: poiType }).where(eq(poiTable.poiId, poiId));
  },
};

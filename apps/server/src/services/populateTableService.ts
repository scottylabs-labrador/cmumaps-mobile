// biome-ignore-all lint/suspicious/noExplicitAny: <Just for populating table>
import {
  alias as aliasTable,
  building as buildingTable,
  edge as edgeTable,
  floor as floorTable,
  node as nodeTable,
  poi as poiTable,
  room as roomTable,
} from "@cmumaps/db/schema";
import { db } from "../db.ts";

export const populateTableService = {
  populateBuildings: async (data: any) => {
    const rows = data.map((building: any) => ({
      ...building,
      shape: JSON.parse(building.shape),
      hitbox: JSON.parse(building.hitbox),
    }));
    if (rows.length === 0) {
      return;
    }
    await db.insert(buildingTable).values(rows);
  },

  populateFloors: async (data: any) => {
    if (data.length === 0) {
      return;
    }
    await db.insert(floorTable).values(data);
  },

  populateRooms: async (data: any) => {
    const rows = data.map((room: any) => ({
      ...room,
      polygon: JSON.parse(room.polygon),
    }));
    if (rows.length === 0) {
      return;
    }
    await db.insert(roomTable).values(rows);
  },

  populateAlias: async (data: any) => {
    if (data.length === 0) {
      return;
    }
    await db.insert(aliasTable).values(data);
  },

  populateNodes: async (data: any) => {
    if (data.length === 0) {
      return;
    }
    await db.insert(nodeTable).values(data);
  },

  populateEdges: async (data: any) => {
    if (data.length === 0) {
      return;
    }
    await db.insert(edgeTable).values(data);
  },

  populatePois: async (data: any) => {
    if (data.length === 0) {
      return;
    }
    await db.insert(poiTable).values(data).onConflictDoNothing();
  },
};

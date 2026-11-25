import { db } from "@cmumaps/db/client";
import { alias, building, edge, floor, node, poi, room } from "@cmumaps/db/schema";
import { sql } from "drizzle-orm";
import { readEnv } from "./env.ts";
import type { FloorplanFiles } from "./s3.ts";
import { loadFloorplans } from "./s3.ts";
import type { RoomFile } from "./schemas.ts";

const CHUNK_SIZE = 5000;
const OUTSIDE = "outside";
const TRUNCATE = `TRUNCATE TABLE "Building", "Floor", "Room", "Alias", "Node", "Edge", "Poi" RESTART IDENTITY CASCADE`;

interface Rows {
  buildings: (typeof building.$inferInsert)[];
  floors: (typeof floor.$inferInsert)[];
  rooms: (typeof room.$inferInsert)[];
  aliases: (typeof alias.$inferInsert)[];
  nodes: (typeof node.$inferInsert)[];
  edges: (typeof edge.$inferInsert)[];
  pois: (typeof poi.$inferInsert)[];
}

function aliasesFor(roomFile: RoomFile): Rows["aliases"] {
  const names = roomFile.aliases ?? [];
  const display = names[0];
  if (display === undefined) {
    return [];
  }

  return names
    .filter((name) => name.length > 0)
    .map((name) => ({
      alias: name,
      roomId: roomFile.id,
      isDisplayAlias: name === display,
    }));
}

function buildRows(files: FloorplanFiles): Rows {
  const buildings: Rows["buildings"] = [];
  for (const [buildingCode, entry] of Object.entries(files.buildings)) {
    buildings.push({
      buildingCode,
      name: entry.name,
      osmId: entry.osmId,
      labelLatitude: entry.labelPosition.latitude,
      labelLongitude: entry.labelPosition.longitude,
      shape: entry.shapes,
      hitbox: entry.hitbox,
      defaultOrdinal: entry.defaultOrdinal ?? null,
    });
  }

  const floors: Rows["floors"] = [];
  for (const [buildingCode, levels] of Object.entries(files.placements)) {
    if (buildingCode === OUTSIDE) {
      continue;
    }
    const entry = files.buildings[buildingCode];
    if (!entry) {
      throw new Error(`Placements refer to missing building ${buildingCode}`);
    }
    for (const [floorLevel, placement] of Object.entries(levels)) {
      floors.push({
        buildingCode,
        floorLevel,
        isDefault: floorLevel === entry.defaultFloor,
        centerX: placement.pdfCenter.x,
        centerY: placement.pdfCenter.y,
        centerLatitude: placement.center.latitude,
        centerLongitude: placement.center.longitude,
        scale: placement.scale,
        angle: placement.angle,
      });
    }
  }

  const rooms: Rows["rooms"] = [];
  const aliases: Rows["aliases"] = [];
  for (const [buildingCode, levels] of Object.entries(files.floorplans)) {
    if (buildingCode === OUTSIDE || Object.keys(levels).length === 0) {
      continue;
    }
    for (const level of Object.values(levels)) {
      for (const roomFile of Object.values(level)) {
        rooms.push({
          roomId: roomFile.id,
          name: roomFile.name,
          type: roomFile.type,
          labelLatitude: roomFile.labelPosition.latitude,
          labelLongitude: roomFile.labelPosition.longitude,
          polygon: roomFile.coordinates,
          buildingCode: roomFile.floor.buildingCode,
          floorLevel: roomFile.floor.level,
        });
        aliases.push(...aliasesFor(roomFile));
      }
    }
  }

  const nodes: Rows["nodes"] = [];
  const edges: Rows["edges"] = [];
  for (const [nodeId, entry] of Object.entries(files.graph)) {
    const outside = entry.floor.buildingCode === OUTSIDE;
    const roomId = entry.roomId ?? null;
    nodes.push({
      nodeId,
      latitude: entry.coordinate.latitude,
      longitude: entry.coordinate.longitude,
      buildingCode: outside ? null : entry.floor.buildingCode,
      floorLevel: outside ? null : entry.floor.level,
      roomId: outside || roomId === null || roomId.length === 0 ? null : roomId,
    });

    for (const outNodeId of Object.keys(entry.neighbors)) {
      if (files.graph[outNodeId] === undefined) {
        continue;
      }
      edges.push({ inNodeId: nodeId, outNodeId });
    }
  }

  const pois: Rows["pois"] = Object.values(files.pois).map((entry) => ({
    poiId: entry.poiId,
    type: entry.type,
    latitude: entry.latitude,
    longitude: entry.longitude,
    buildingCode: entry.buildingCode ?? null,
    floorLevel: entry.floorLevel ?? null,
  }));

  return { buildings, floors, rooms, aliases, nodes, edges, pois };
}

async function insertChunks<T>(rows: T[], insert: (chunk: T[]) => Promise<unknown>): Promise<void> {
  for (let index = 0; index < rows.length; index += CHUNK_SIZE) {
    const chunk = rows.slice(index, index + CHUNK_SIZE);
    if (chunk.length === 0) {
      continue;
    }
    await insert(chunk);
  }
}

async function refill(rows: Rows): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(TRUNCATE));
    await insertChunks(rows.buildings, (chunk) => tx.insert(building).values(chunk));
    await insertChunks(rows.floors, (chunk) => tx.insert(floor).values(chunk));
    await insertChunks(rows.rooms, (chunk) => tx.insert(room).values(chunk));
    await insertChunks(rows.aliases, (chunk) => tx.insert(alias).values(chunk));
    await insertChunks(rows.nodes, (chunk) => tx.insert(node).values(chunk));
    await insertChunks(rows.edges, (chunk) => tx.insert(edge).values(chunk));
    await insertChunks(rows.pois, (chunk) => tx.insert(poi).values(chunk));
  });
}

const env = readEnv();
const files = await loadFloorplans(env);
const rows = buildRows(files);
await refill(rows);

console.log(
  `Populated ${rows.buildings.length} buildings, ${rows.floors.length} floors, ${rows.rooms.length} rooms, ${rows.aliases.length} aliases, ${rows.nodes.length} nodes, ${rows.edges.length} edges, ${rows.pois.length} pois`,
);

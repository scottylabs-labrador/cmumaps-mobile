import type {
  EdgeInfo,
  GeoCoordinate,
  GeoNodes,
  GeoRooms,
  Graph,
  Placement,
  Pois,
  PoiType,
  Rooms,
  RoomType,
} from "@cmumaps/common";
import {
  extractBuildingCode,
  extractFloorLevel,
  geoCoordsToPdfCoords,
  geoPolygonToPdfPolygon,
  pdfCoordsToGeoCoords,
  pdfPolygonToGeoPolygon,
} from "@cmumaps/common";
import { db } from "@cmumaps/db/client";
import {
  floor as floorTable,
  node as nodeTable,
  poi as poiTable,
  room as roomTable,
} from "@cmumaps/db/schema";
import { and, eq, isNull, type SQL } from "drizzle-orm";

function nodeFloorWhere(buildingCode: string | null, floorLevel: string | null): SQL | undefined {
  if (buildingCode === null || floorLevel === null) {
    return and(isNull(nodeTable.buildingCode), isNull(nodeTable.floorLevel));
  }
  return and(eq(nodeTable.buildingCode, buildingCode), eq(nodeTable.floorLevel, floorLevel));
}

const outEdgesWithFloor = {
  outEdges: {
    with: {
      outNode: {
        columns: {
          buildingCode: true,
          floorLevel: true,
        },
      },
    },
  },
} as const;

export const floorService = {
  getFloorGraph: async (floorCode: string, placement: Placement) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);
    const geoCoordsToPdfCoordsHelper = geoCoordsToPdfCoords(placement);

    // Get all nodes on the floor with their neighbors
    const dbNodes = await db.query.node.findMany({
      where: nodeFloorWhere(buildingCode, floorLevel),
      // include the out floor code of each neighbor
      with: outEdgesWithFloor,
    });

    // Convert the nodes to the format expected by the frontend
    const nodes: Graph = {};
    for (const node of dbNodes) {
      // Convert the node's geo position to PDF position
      const position = {
        latitude: node.latitude,
        longitude: node.longitude,
      };
      const pos = geoCoordsToPdfCoordsHelper(position);

      // Create a mapping of neighbor node strings to edge info
      const neighbors: Record<string, EdgeInfo> = {};
      for (const edge of node.outEdges) {
        const { outNode } = edge;
        neighbors[edge.outNodeId] = {};

        // Determine if cross floor edge
        if (outNode.buildingCode === null || outNode.floorLevel === null) {
          neighbors[edge.outNodeId].outFloorCode = "outside";
          continue;
        }

        const outFloorCode = `${outNode.buildingCode}-${outNode.floorLevel}`;
        neighbors[edge.outNodeId] = {};
        if (outFloorCode !== floorCode) {
          neighbors[edge.outNodeId].outFloorCode = outFloorCode;
        }
      }

      nodes[node.nodeId] = {
        pos,
        neighbors,
        roomId: node.roomId,
      };
    }

    return nodes;
  },

  getFloorRooms: async (floorCode: string) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    const placement = await floorService.getFloorPlacement(floorCode);
    const geoCoordsToPdfCoordsHelper = geoCoordsToPdfCoords(placement);

    // Get all rooms on the floor from the database
    const dbRooms = await db.query.room.findMany({
      where: and(eq(roomTable.buildingCode, buildingCode), eq(roomTable.floorLevel, floorLevel)),
      with: {
        aliases: true,
      },
    });

    // Convert the rooms to the format expected by the frontend
    const rooms: Rooms = {};
    for (const room of dbRooms) {
      rooms[room.roomId] = {
        name: room.name,
        labelPosition: geoCoordsToPdfCoordsHelper({
          latitude: room.labelLatitude,
          longitude: room.labelLongitude,
        }),
        type: room.type as RoomType,
        displayAlias: room.aliases.find((a) => a.isDisplayAlias)?.alias,
        aliases: room.aliases.map((a) => a.alias),
        polygon: geoPolygonToPdfPolygon(room.polygon as unknown as GeoCoordinate[][], placement),
      };
    }

    return rooms;
  },

  getFloorPois: async (floorCode: string) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    const dbPois = await db.query.poi.findMany({
      where: and(eq(poiTable.buildingCode, buildingCode), eq(poiTable.floorLevel, floorLevel)),
    });

    const pois: Pois = {};
    for (const poi of dbPois) {
      pois[poi.poiId] = {
        type: poi.type as PoiType,
        latitude: poi.latitude,
        longitude: poi.longitude,
        buildingCode: poi.buildingCode,
        floorLevel: poi.floorLevel,
      };
    }

    return pois;
  },

  getFloorPlacement: async (floorCode: string) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    const floor = await db.query.floor.findFirst({
      where: and(eq(floorTable.buildingCode, buildingCode), eq(floorTable.floorLevel, floorLevel)),
    });

    if (!floor) {
      throw new Error("Floor not found");
    }

    const geoCenter = {
      latitude: floor.centerLatitude,
      longitude: floor.centerLongitude,
    };
    const pdfCenter = { x: floor.centerX, y: floor.centerY };

    return {
      geoCenter,
      pdfCenter,
      scale: floor.scale,
      angle: floor.angle,
    };
  },

  updateFloorPlacement: async (floorCode: string, placement: Placement) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    await db.transaction(async (tx) => {
      const floor = await tx.query.floor.findFirst({
        where: and(
          eq(floorTable.buildingCode, buildingCode),
          eq(floorTable.floorLevel, floorLevel),
        ),
      });
      if (!floor) {
        throw new Error("Floor not found");
      }

      // get the old placement, which is used to update the nodes and rooms
      const oldPlacement = {
        scale: floor.scale,
        angle: floor.angle,
        geoCenter: {
          latitude: floor.centerLatitude,
          longitude: floor.centerLongitude,
        },
        pdfCenter: { x: floor.centerX, y: floor.centerY },
      };

      // update the floor placement
      await tx
        .update(floorTable)
        .set({
          centerLatitude: placement.geoCenter.latitude,
          centerLongitude: placement.geoCenter.longitude,
          centerX: placement.pdfCenter.x,
          centerY: placement.pdfCenter.y,
          scale: placement.scale,
          angle: placement.angle,
        })
        .where(
          and(eq(floorTable.buildingCode, buildingCode), eq(floorTable.floorLevel, floorLevel)),
        );

      // update all the nodes on the floor
      const nodes = await tx.query.node.findMany({
        where: and(eq(nodeTable.buildingCode, buildingCode), eq(nodeTable.floorLevel, floorLevel)),
      });

      for (const node of nodes) {
        const pos = { latitude: node.latitude, longitude: node.longitude };
        const pdfCoords = geoCoordsToPdfCoords(oldPlacement)(pos);
        const geoCoords = pdfCoordsToGeoCoords(placement)(pdfCoords);
        await tx
          .update(nodeTable)
          .set({
            latitude: geoCoords.latitude,
            longitude: geoCoords.longitude,
          })
          .where(eq(nodeTable.nodeId, node.nodeId));
      }

      // update all the rooms on the floor
      const rooms = await tx.query.room.findMany({
        where: and(eq(roomTable.buildingCode, buildingCode), eq(roomTable.floorLevel, floorLevel)),
      });

      for (const room of rooms) {
        const labelPos = {
          latitude: room.labelLatitude,
          longitude: room.labelLongitude,
        };
        const pdfCoords = geoCoordsToPdfCoords(oldPlacement)(labelPos);
        const geoCoords = pdfCoordsToGeoCoords(placement)(pdfCoords);

        const polygon = room.polygon as unknown as GeoCoordinate[][];
        const pdfPolygon = geoPolygonToPdfPolygon(polygon, oldPlacement);
        const geoPolygon = pdfPolygonToGeoPolygon(pdfPolygon, placement);
        await tx
          .update(roomTable)
          .set({
            labelLatitude: geoCoords.latitude,
            labelLongitude: geoCoords.longitude,
            polygon: geoPolygon,
          })
          .where(eq(roomTable.roomId, room.roomId));
      }
    });
  },

  getFloorplan: async (floorCode: string) => {
    const buildingCode = extractBuildingCode(floorCode);
    const floorLevel = extractFloorLevel(floorCode);

    // Get floor data for Floor type
    const floor = await db.query.floor.findFirst({
      where: and(eq(floorTable.buildingCode, buildingCode), eq(floorTable.floorLevel, floorLevel)),
    });

    if (!floor) {
      throw new Error(`Floor not found: ${floorCode}`);
    }

    // Get all rooms on the floor from the database
    const dbRooms = await db.query.room.findMany({
      where: and(eq(roomTable.buildingCode, buildingCode), eq(roomTable.floorLevel, floorLevel)),
      with: {
        aliases: true,
      },
    });

    // Convert the rooms to the format expected by the frontend
    const rooms: GeoRooms = {};
    for (const room of dbRooms) {
      rooms[room.name] = {
        labelPosition: {
          latitude: room.labelLatitude,
          longitude: room.labelLongitude,
        },
        floor: {
          buildingCode,
          level: floorLevel,
        },
        type: room.type as RoomType,
        id: room.roomId,
        alias: room.aliases.find((a) => a.isDisplayAlias)?.alias,
        points: room.polygon as unknown as GeoCoordinate[][],
      };
    }

    return rooms;
  },

  getFloorNodes: async (floorCode: string) => {
    let buildingCode: string | null = extractBuildingCode(floorCode);
    let floorLevel: string | null = extractFloorLevel(floorCode);

    if (floorCode === "outside") {
      buildingCode = null;
      floorLevel = null;
    }

    // Get all nodes on the floor with their neighbors
    const dbNodes = await db.query.node.findMany({
      where: nodeFloorWhere(buildingCode, floorLevel),
      // include the out floor code of each neighbor
      with: outEdgesWithFloor,
    });

    // Convert thGeoNodeses to the format expected by the frontend
    const nodes: GeoNodes = {};
    for (const node of dbNodes) {
      // Convert the node's geo position to PDF position
      const pos = {
        latitude: node.latitude,
        longitude: node.longitude,
      };

      // Create a mapping of neighbor node strings to edge info
      const neighbors: Record<string, EdgeInfo> = {};
      for (const edge of node.outEdges) {
        const { outNode } = edge;

        // Determine if cross floor edge
        const outFloorCode = `${outNode.buildingCode}-${outNode.floorLevel}`;
        neighbors[edge.outNodeId] = {};
        if (outFloorCode !== floorCode) {
          neighbors[edge.outNodeId].outFloorCode = outFloorCode;
        }
      }

      nodes[node.nodeId] = {
        pos,
        neighbors,
        roomId: node.roomId,
        id: node.nodeId,
      };
    }

    return nodes;
  },
};

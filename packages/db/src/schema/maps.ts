import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

export const building = pgTable(
  "Building",
  {
    buildingCode: text("buildingCode").notNull(),
    name: text("name").notNull(),
    osmId: text("osmId"),
    labelLatitude: doublePrecision("labelLatitude").notNull(),
    labelLongitude: doublePrecision("labelLongitude").notNull(),
    shape: jsonb("shape").notNull(),
    hitbox: jsonb("hitbox"),
    defaultOrdinal: integer("defaultOrdinal"),
  },
  (table) => [primaryKey({ columns: [table.buildingCode], name: "Building_pkey" })],
);

export const floor = pgTable(
  "Floor",
  {
    buildingCode: text("buildingCode").notNull(),
    floorLevel: text("floorLevel").notNull(),
    isDefault: boolean("isDefault").notNull(),
    centerX: doublePrecision("centerX").notNull(),
    centerY: doublePrecision("centerY").notNull(),
    centerLatitude: doublePrecision("centerLatitude").notNull(),
    centerLongitude: doublePrecision("centerLongitude").notNull(),
    scale: doublePrecision("scale").notNull(),
    angle: doublePrecision("angle").notNull(),
    altitude: doublePrecision("altitude"),
  },
  (table) => [
    primaryKey({ columns: [table.buildingCode, table.floorLevel], name: "Floor_pkey" }),
    foreignKey({
      columns: [table.buildingCode],
      foreignColumns: [building.buildingCode],
      name: "Floor_buildingCode_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const room = pgTable(
  "Room",
  {
    roomId: text("roomId").notNull(),
    name: text("name").notNull(),
    type: text("type").notNull(),
    labelLatitude: doublePrecision("labelLatitude").notNull(),
    labelLongitude: doublePrecision("labelLongitude").notNull(),
    polygon: jsonb("polygon").notNull(),
    buildingCode: text("buildingCode"),
    floorLevel: text("floorLevel"),
  },
  (table) => [
    primaryKey({ columns: [table.roomId], name: "Room_pkey" }),
    foreignKey({
      columns: [table.buildingCode, table.floorLevel],
      foreignColumns: [floor.buildingCode, floor.floorLevel],
      name: "Room_buildingCode_floorLevel_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    index("Room_buildingCode_floorLevel_idx").on(table.buildingCode, table.floorLevel),
  ],
);

export const alias = pgTable(
  "Alias",
  {
    alias: text("alias").notNull(),
    isDisplayAlias: boolean("isDisplayAlias").notNull(),
    roomId: text("roomId").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.alias], name: "Alias_pkey" }),
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [room.roomId],
      name: "Alias_roomId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const node = pgTable(
  "Node",
  {
    nodeId: text("nodeId").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    buildingCode: text("buildingCode"),
    floorLevel: text("floorLevel"),
    roomId: text("roomId"),
  },
  (table) => [
    primaryKey({ columns: [table.nodeId], name: "Node_pkey" }),
    foreignKey({
      columns: [table.buildingCode, table.floorLevel],
      foreignColumns: [floor.buildingCode, floor.floorLevel],
      name: "Node_buildingCode_floorLevel_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.roomId],
      foreignColumns: [room.roomId],
      name: "Node_roomId_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    index("Node_buildingCode_floorLevel_idx").on(table.buildingCode, table.floorLevel),
  ],
);

export const edge = pgTable(
  "Edge",
  {
    inNodeId: text("inNodeId").notNull(),
    outNodeId: text("outNodeId").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.inNodeId, table.outNodeId], name: "Edge_pkey" }),
    foreignKey({
      columns: [table.inNodeId],
      foreignColumns: [node.nodeId],
      name: "Edge_inNodeId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.outNodeId],
      foreignColumns: [node.nodeId],
      name: "Edge_outNodeId_fkey",
    })
      .onDelete("restrict")
      .onUpdate("cascade"),
  ],
);

export const poi = pgTable(
  "Poi",
  {
    poiId: text("poiId").notNull(),
    type: text("type").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    buildingCode: text("buildingCode"),
    floorLevel: text("floorLevel"),
  },
  (table) => [
    primaryKey({ columns: [table.poiId], name: "Poi_pkey" }),
    foreignKey({
      columns: [table.buildingCode, table.floorLevel],
      foreignColumns: [floor.buildingCode, floor.floorLevel],
      name: "Poi_buildingCode_floorLevel_fkey",
    })
      .onDelete("set null")
      .onUpdate("cascade"),
    index("Poi_buildingCode_floorLevel_idx").on(table.buildingCode, table.floorLevel),
  ],
);

export const buildingRelations = relations(building, ({ many }) => ({
  floors: many(floor),
}));

export const floorRelations = relations(floor, ({ one, many }) => ({
  building: one(building, {
    fields: [floor.buildingCode],
    references: [building.buildingCode],
  }),
  nodes: many(node),
  rooms: many(room),
  pois: many(poi),
}));

export const roomRelations = relations(room, ({ one, many }) => ({
  aliases: many(alias),
  nodes: many(node),
  floor: one(floor, {
    fields: [room.buildingCode, room.floorLevel],
    references: [floor.buildingCode, floor.floorLevel],
  }),
}));

export const aliasRelations = relations(alias, ({ one }) => ({
  room: one(room, {
    fields: [alias.roomId],
    references: [room.roomId],
  }),
}));

export const nodeRelations = relations(node, ({ one, many }) => ({
  outEdges: many(edge, { relationName: "outEdges" }),
  inEdges: many(edge, { relationName: "inEdges" }),
  floor: one(floor, {
    fields: [node.buildingCode, node.floorLevel],
    references: [floor.buildingCode, floor.floorLevel],
  }),
  room: one(room, {
    fields: [node.roomId],
    references: [room.roomId],
  }),
}));

export const edgeRelations = relations(edge, ({ one }) => ({
  inNode: one(node, {
    fields: [edge.inNodeId],
    references: [node.nodeId],
    relationName: "outEdges",
  }),
  outNode: one(node, {
    fields: [edge.outNodeId],
    references: [node.nodeId],
    relationName: "inEdges",
  }),
}));

export const poiRelations = relations(poi, ({ one }) => ({
  floor: one(floor, {
    fields: [poi.buildingCode, poi.floorLevel],
    references: [floor.buildingCode, floor.floorLevel],
  }),
}));

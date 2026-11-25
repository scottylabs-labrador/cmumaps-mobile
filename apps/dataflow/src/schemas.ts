import { z } from "zod";

const geoCoordinate = z.strictObject({
  latitude: z.number(),
  longitude: z.number(),
});

const localPosition = z.strictObject({
  x: z.number(),
  y: z.number(),
});

const floorRef = z.strictObject({
  buildingCode: z.string(),
  level: z.string(),
});

const poiTypes = [
  "Vending Machine",
  "Water Fountain",
  "Printer",
  "AED",
  "Bike Rack",
  "Restroom",
  "Emergency Phone",
  "",
] as const;

export const buildingsSchema = z.record(
  z.string(),
  z.strictObject({
    name: z.string(),
    osmId: z.string(),
    floors: z.array(z.string()),
    defaultFloor: z.string(),
    labelPosition: geoCoordinate,
    shapes: z.array(z.array(geoCoordinate)),
    hitbox: z.array(geoCoordinate).nullable(),
    fmsId: z.number().nullish(),
    code: z.string().nullish(),
    entrances: z.array(z.string()).nullish(),
    defaultOrdinal: z.number().int().nullish(),
  }),
);

export const placementsSchema = z.record(
  z.string(),
  z.record(
    z.string(),
    z.strictObject({
      center: geoCoordinate,
      scale: z.number(),
      angle: z.number(),
      pdfCenter: localPosition,
    }),
  ),
);

const roomSchema = z.strictObject({
  name: z.string(),
  labelPosition: geoCoordinate,
  type: z.string(),
  id: z.string(),
  floor: floorRef,
  coordinates: z.array(z.array(geoCoordinate)),
  aliases: z.array(z.string()).nullish(),
});

export const floorplansSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), roomSchema)),
);

export const graphSchema = z.record(
  z.string(),
  z.strictObject({
    neighbors: z.record(
      z.string(),
      z.strictObject({
        dist: z.number(),
        toFloorInfo: z.record(z.string(), z.unknown()).nullish(),
      }),
    ),
    coordinate: geoCoordinate,
    floor: floorRef,
    id: z.string(),
    pos: localPosition.nullish(),
    roomId: z.string().nullish(),
  }),
);

export const poisSchema = z.record(
  z.string(),
  z.strictObject({
    poiId: z.string(),
    type: z.enum(poiTypes),
    latitude: z.number(),
    longitude: z.number(),
    buildingCode: z.string().nullish(),
    floorLevel: z.string().nullish(),
  }),
);

export type BuildingsFile = z.infer<typeof buildingsSchema>;
export type PlacementsFile = z.infer<typeof placementsSchema>;
export type FloorplansFile = z.infer<typeof floorplansSchema>;
export type GraphFile = z.infer<typeof graphSchema>;
export type PoisFile = z.infer<typeof poisSchema>;
export type RoomFile = z.infer<typeof roomSchema>;

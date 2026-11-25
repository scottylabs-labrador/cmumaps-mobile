import { S3Client } from "bun";
import type { Env } from "./env.ts";
import {
  type BuildingsFile,
  buildingsSchema,
  type FloorplansFile,
  floorplansSchema,
  type GraphFile,
  graphSchema,
  type PlacementsFile,
  placementsSchema,
  type PoisFile,
  poisSchema,
} from "./schemas.ts";

function endpointUrl(endpoint: string): string {
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    return endpoint;
  }
  return `https://${endpoint}`;
}

async function readJson<T>(client: S3Client, key: string, parse: (data: unknown) => T): Promise<T> {
  const text = await client.file(key).text();
  return parse(JSON.parse(text));
}

export interface FloorplanFiles {
  buildings: BuildingsFile;
  placements: PlacementsFile;
  floorplans: FloorplansFile;
  graph: GraphFile;
  pois: PoisFile;
}

export async function loadFloorplans(env: Env): Promise<FloorplanFiles> {
  const client = new S3Client({
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    bucket: env.S3_BUCKET,
    endpoint: endpointUrl(env.S3_ENDPOINT),
  });

  const buildings = await readJson(client, "floorplans/buildings.json", (data) =>
    buildingsSchema.parse(data),
  );
  const placements = await readJson(client, "floorplans/placements.json", (data) =>
    placementsSchema.parse(data),
  );
  const floorplans = await readJson(client, "floorplans/floorplans.json", (data) =>
    floorplansSchema.parse(data),
  );
  const graph = await readJson(client, "floorplans/all-graph.json", (data) =>
    graphSchema.parse(data),
  );
  const pois = await readJson(client, "floorplans/osm-pois.json", (data) => poisSchema.parse(data));

  return { buildings, placements, floorplans, graph, pois };
}

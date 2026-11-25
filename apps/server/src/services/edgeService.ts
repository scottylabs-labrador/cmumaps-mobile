import { db } from "@cmumaps/db/client";
import { edge as edgeTable } from "@cmumaps/db/schema";
import { and, eq, or } from "drizzle-orm";

export const edgeService = {
  createEdge: async (inNodeId: string, outNodeId: string) => {
    await db.insert(edgeTable).values({ inNodeId, outNodeId });
    await db.insert(edgeTable).values({ inNodeId: outNodeId, outNodeId: inNodeId });
  },

  deleteEdge: async (inNodeId: string, outNodeId: string) => {
    await db
      .delete(edgeTable)
      .where(and(eq(edgeTable.inNodeId, inNodeId), eq(edgeTable.outNodeId, outNodeId)));
    await db
      .delete(edgeTable)
      .where(and(eq(edgeTable.inNodeId, outNodeId), eq(edgeTable.outNodeId, inNodeId)));
  },

  createEdges: async (nodeId: string, neighborIds: string[]) => {
    for (const neighborId of neighborIds) {
      await edgeService.createEdge(nodeId, neighborId);
    }
  },

  // delete all edges connected to a node
  deleteEdges: async (nodeId: string) => {
    await db
      .delete(edgeTable)
      .where(or(eq(edgeTable.inNodeId, nodeId), eq(edgeTable.outNodeId, nodeId)));
  },
};

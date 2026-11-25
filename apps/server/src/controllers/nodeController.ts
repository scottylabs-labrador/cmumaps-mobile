import type { NodeInfo } from "@cmumaps/common";
import type { Request as ExpressRequest } from "express";
import { Body, Delete, Post, Put, Request, Route, Security } from "tsoa";
import { BEARER_AUTH, MEMBER_SCOPE, OIDC_AUTH } from "../lib/authentication.ts";
import { edgeService } from "../services/edgeService.ts";
import { floorService } from "../services/floorService.ts";
import { nodeService } from "../services/nodeService.ts";

@Security(OIDC_AUTH, [MEMBER_SCOPE])
@Security(BEARER_AUTH, [MEMBER_SCOPE])
@Route("nodes")
export class NodeController {
  @Post("/:nodeId")
  public async createNode(
    @Request() req: ExpressRequest,
    @Body() body: { floorCode: string; nodeInfo: NodeInfo },
  ) {
    const { floorCode, nodeInfo } = body;
    const { nodeId } = req.params;

    // create node in database
    const placement = await floorService.getFloorPlacement(floorCode);
    await nodeService.upsertNode(floorCode, nodeId, nodeInfo, placement);

    // create edges to neighbors if they don't already exist
    await edgeService.createEdges(nodeId, Object.keys(nodeInfo.neighbors));

    return null;
  }

  @Delete("/:nodeId")
  public async deleteNode(@Request() req: ExpressRequest) {
    const { nodeId } = req.params;
    await edgeService.deleteEdges(nodeId);
    await nodeService.deleteNode(nodeId);
    return null;
  }

  @Put("/:nodeId")
  public async updateNode(
    @Request() req: ExpressRequest,
    @Body() body: { nodeInfo: NodeInfo; floorCode: string },
  ) {
    const { nodeInfo, floorCode } = body;
    const { nodeId } = req.params;

    const placement = await floorService.getFloorPlacement(floorCode);
    await nodeService.upsertNode(floorCode, nodeId, nodeInfo, placement);
    return null;
  }
}

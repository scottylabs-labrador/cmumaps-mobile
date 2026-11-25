import { extractBuildingCode, extractFloorLevel } from "@cmumaps/common";
import { Body, Delete, Post, Route, Security } from "tsoa";
import { BEARER_AUTH, MEMBER_SCOPE, OIDC_AUTH } from "../lib/authentication.ts";
import { edgeService } from "../services/edgeService.ts";
import { nodeService } from "../services/nodeService.ts";

@Security(OIDC_AUTH, [MEMBER_SCOPE])
@Security(BEARER_AUTH, [MEMBER_SCOPE])
@Route("edge")
export class EdgeController {
  @Post("/")
  public async createEdge(@Body() body: { inNodeId: string; outNodeId: string }) {
    const { inNodeId, outNodeId } = body;

    // create edge in database
    await edgeService.createEdge(inNodeId, outNodeId);

    return null;
  }

  @Delete("/")
  public async deleteEdge(@Body() body: { inNodeId: string; outNodeId: string }) {
    const { inNodeId, outNodeId } = body;

    await edgeService.deleteEdge(inNodeId, outNodeId);
    return null;
  }

  @Post("/across-floors")
  public async createEdgeAcrossFloors(
    @Body() body: { floorCode: string; outFloorCode: string; inNodeId: string; outNodeId: string },
  ) {
    const { outFloorCode, inNodeId, outNodeId } = body;

    // validate that the out node is on the out floor
    const outNode = await nodeService.getNode(outNodeId);

    // outside edge cases
    const errorMessage = "Out node is not on the out floor";
    if (outFloorCode === "outside") {
      if (outNode.buildingCode !== null || outNode.floorLevel !== null) {
        throw new Error(errorMessage);
      }
    } else if (
      outNode.buildingCode !== extractBuildingCode(outFloorCode) ||
      outNode.floorLevel !== extractFloorLevel(outFloorCode)
    ) {
      throw new Error(errorMessage);
    }

    await edgeService.createEdge(inNodeId, outNodeId);
    return null;
  }

  @Delete("/across-floors")
  public async deleteEdgeAcrossFloors(
    @Body() body: { floorCode: string; outFloorCode: string; inNodeId: string; outNodeId: string },
  ) {
    const { inNodeId, outNodeId } = body;

    await edgeService.deleteEdge(inNodeId, outNodeId);
    return null;
  }
}

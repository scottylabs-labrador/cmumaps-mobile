import type { PoiInfo, PoiType } from "@cmumaps/common";
import type { Request as ExpressRequest } from "express";
import { Body, Delete, Post, Put, Request, Route, Security } from "tsoa";
import { BEARER_AUTH, MEMBER_SCOPE, OIDC_AUTH } from "../lib/authentication.ts";
import { poiService } from "../services/poiService.ts";

@Security(OIDC_AUTH, [MEMBER_SCOPE])
@Security(BEARER_AUTH, [MEMBER_SCOPE])
@Route("pois")
export class PoiController {
  @Post("/:poiId")
  public async createPoi(@Request() req: ExpressRequest, @Body() body: { poiInfo: PoiInfo }) {
    const { poiId } = req.params;
    const { poiInfo } = body;

    await poiService.createPoi(poiId, poiInfo);
    return null;
  }

  @Delete("/:poiId")
  public async deletePoi(@Request() req: ExpressRequest) {
    const { poiId } = req.params;
    await poiService.deletePoi(poiId);
    return null;
  }

  @Put("/:poiId/type")
  public async updatePoiType(@Request() req: ExpressRequest, @Body() body: { poiType: PoiType }) {
    const { poiId } = req.params;
    const { poiType } = body;

    await poiService.updatePoiType(poiId, poiType);
    return null;
  }
}

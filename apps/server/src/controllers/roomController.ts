import type { RoomInfo } from "@cmumaps/common";
import type { Request as ExpressRequest } from "express";
import { Body, Delete, Patch, Post, Request, Route, Security } from "tsoa";
import { BEARER_AUTH, MEMBER_SCOPE, OIDC_AUTH } from "../lib/authentication.ts";
import { floorService } from "../services/floorService.ts";
import { roomService } from "../services/roomService.ts";

@Security(OIDC_AUTH, [MEMBER_SCOPE])
@Security(BEARER_AUTH, [MEMBER_SCOPE])
@Route("rooms")
export class RoomController {
  @Post("/:roomId")
  public async createRoom(
    @Request() req: ExpressRequest,
    @Body() body: {
      floorCode: string;
      roomNodes: string[];
      roomInfo: RoomInfo;
    },
  ) {
    const { roomId } = req.params;
    const { floorCode, roomNodes, roomInfo } = body;

    const placement = await floorService.getFloorPlacement(floorCode);
    await roomService.createRoom(floorCode, roomId, roomNodes, roomInfo, placement);
    return null;
  }

  @Delete("/:roomId")
  public async deleteRoom(@Request() req: ExpressRequest) {
    const { roomId } = req.params;

    await roomService.deleteRoom(roomId);
    return null;
  }

  @Patch("/:roomId")
  public async updateRoom(
    @Request() req: ExpressRequest,
    @Body() body: { floorCode: string; roomInfo: Partial<RoomInfo> },
  ) {
    const { roomId } = req.params;
    const { roomInfo, floorCode } = body;

    const placement = await floorService.getFloorPlacement(floorCode);
    await roomService.updateRoom(roomId, roomInfo, placement);
    return null;
  }
}

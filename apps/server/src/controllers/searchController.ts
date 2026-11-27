import { Get, Query, Route, Security } from "tsoa";
import { BEARER_AUTH, OIDC_AUTH } from "../lib/authentication.ts";
import { searchService } from "../services/searchService.ts";
import type { Document } from "../utils/search/types.ts";

@Security(OIDC_AUTH, [])
@Security(BEARER_AUTH, [])
@Route("search")
export class SearchController {
  @Get("/")
  public async search(
    @Query() query: string,
    @Query() n?: number,
    @Query() lat?: number,
    @Query() lon?: number,
  ): Promise<Document[]> {
    return await searchService.search(query, n, lat, lon);
  }
}

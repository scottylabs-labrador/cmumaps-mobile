import { Get, Route } from "tsoa";
import { passwordSignInEnabled } from "../lib/auth.ts";

@Route("auth-capabilities")
export class AuthCapabilitiesController {
  @Get("/")
  public getAuthCapabilities(): { passwordSignInEnabled: boolean } {
    return { passwordSignInEnabled };
  }
}

import { markerTag, parseMarker, required, type Marker, type Platform } from "./core";

export class GitHub {
  readonly repository: string;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.repository = required(env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
    if (!/^[\w.-]+\/[\w.-]+$/.test(this.repository)) throw new Error("Invalid GITHUB_REPOSITORY");
    required(env.GH_TOKEN, "GH_TOKEN");
  }

  private async request(
    path: string,
    method = "GET",
    body?: unknown,
    allowMissing = false,
  ): Promise<unknown> {
    const args = [
      "gh",
      "api",
      "--hostname",
      "github.com",
      "--include",
      "--method",
      method,
      `repos/${this.repository}/${path}`,
    ];
    if (body !== undefined) args.push("--input", "-");
    const child = Bun.spawn(args, {
      stdin: body === undefined ? "ignore" : new Blob([JSON.stringify(body)]),
      stdout: "pipe",
      stderr: "pipe",
    });
    const [output, , exit] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    const status = Number(output.match(/^HTTP\/[\d.]+ (\d+)/m)?.[1]);
    if (allowMissing && status === 404) return null;
    // Never echo arbitrary API/CLI output, which could contain credentials.
    if (exit !== 0 || status < 200 || status >= 300) {
      throw new Error(`GitHub ${method} ${path} failed (HTTP ${status || "unknown"})`);
    }
    const separator = output.indexOf("\r\n\r\n");
    const payload =
      separator >= 0 ? output.slice(separator + 4) : output.slice(output.indexOf("\n\n") + 2);
    return JSON.parse(payload);
  }

  async mainSha(): Promise<string> {
    const result = (await this.request("git/ref/heads/main")) as { object: { sha: string } };
    return result.object.sha;
  }

  async read(platform: Platform): Promise<{ id: number; marker: Marker } | null> {
    const result = (await this.request(
      `releases/tags/${markerTag(platform)}`,
      "GET",
      undefined,
      true,
    )) as { id: number; body: string; draft: boolean } | null;
    if (!result) return null;
    if (result.draft) throw new Error("Release state must not be a draft");
    return { id: result.id, marker: parseMarker(result.body, platform) };
  }

  async write(marker: Marker, existingId: number | undefined): Promise<void> {
    const payload = {
      tag_name: markerTag(marker.platform),
      target_commitish: marker.binary.commit,
      name: `Mobile release state (${marker.platform})`,
      body: JSON.stringify(marker, null, 2),
      draft: false,
      prerelease: true,
      make_latest: "false",
    };
    await this.request(
      existingId ? `releases/${existingId}` : "releases",
      existingId ? "PATCH" : "POST",
      payload,
    );
  }
}

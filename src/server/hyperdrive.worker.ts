import { env } from "cloudflare:workers";

export function getHyperdriveUrl(): string {
  return env.CONTRIQ_DB.connectionString;
}

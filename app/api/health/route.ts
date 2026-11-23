import { getPool } from "@/server/db";
import { apiError } from "@/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const check = await getPool().query("SELECT 1 AS ready");
    return Response.json({
      status: check.rows[0].ready === 1 ? "ok" : "unavailable",
    });
  } catch (error) {
    return apiError(error);
  }
}

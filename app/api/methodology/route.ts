import { getMethodology } from "@/server/queries";
import { apiError } from "@/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getMethodology());
  } catch (error) {
    return apiError(error);
  }
}

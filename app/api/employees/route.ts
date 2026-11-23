import { getEmployees } from "@/server/queries";
import { apiError, parseDirectoryParams } from "@/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    return Response.json(
      await getEmployees(
        parseDirectoryParams(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}

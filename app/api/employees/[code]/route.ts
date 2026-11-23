import { getEmployee } from "@/server/queries";
import { apiError, parseRunId } from "@/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    if (!/^[A-Z]{2,3}-\d{3}$/.test(code))
      return Response.json(
        {
          error: {
            code: "INVALID_EMPLOYEE",
            message: "Use a valid employee code.",
          },
        },
        { status: 400 },
      );
    const detail = await getEmployee(
      code,
      parseRunId(new URL(request.url).searchParams),
    );
    if (!detail)
      return Response.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "This employee or published result could not be found.",
          },
        },
        { status: 404 },
      );
    return Response.json(detail);
  } catch (error) {
    return apiError(error);
  }
}

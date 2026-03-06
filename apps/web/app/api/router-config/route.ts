import { NextRequest } from "next/server";
import { getStrategyName, setStrategy } from "@/lib/router-instance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    strategy: getStrategyName(),
    availableStrategies: ["heuristic", "semantic", "routellm"],
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { strategy } = body as { strategy: string };

  const valid = ["heuristic", "semantic", "routellm"];
  if (!valid.includes(strategy)) {
    return Response.json(
      { error: `Invalid strategy. Must be one of: ${valid.join(", ")}` },
      { status: 400 }
    );
  }

  setStrategy(strategy);

  return Response.json({
    strategy: getStrategyName(),
    message: `Strategy switched to ${strategy}`,
  });
}

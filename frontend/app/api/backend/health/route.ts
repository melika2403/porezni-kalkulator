export async function GET() {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      // avoid caching health responses in production
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    return Response.json(data, {
      status: response.status,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "BACKEND_UNREACHABLE",
      },
      { status: 502 },
    );
  }
}

/**
 * GET /api/stops
 * Returns all trip stops ordered by order_num.
 */
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM stops ORDER BY order_num ASC"
    ).all();
    return Response.json({ stops: results }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}

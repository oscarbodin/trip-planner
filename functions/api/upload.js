/**
 * POST /api/upload
 * Accepts a multipart form upload of a CSV file.
 * Replaces all stops in D1 with the new data.
 *
 * Requires Authorization: Bearer <ADMIN_SECRET> header.
 * Set the secret with: wrangler pages secret put ADMIN_SECRET
 */

const EXPECTED_HEADERS = [
  "order", "name", "type", "address", "checkin", "checkout", "nights",
  "cancellation_deadline", "price", "currency", "payment_status",
  "booking_ref", "booking_url", "phone", "distance_to_next_km", "notes", "image_url"
];

export async function onRequestPost({ request, env }) {
  // --- Auth check ---
  const auth = request.headers.get("Authorization") ?? "";
  const secret = env.ADMIN_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse multipart form ---
  let text;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) return Response.json({ error: "No file field in form data" }, { status: 400 });
    text = await file.text();
  } catch (err) {
    return Response.json({ error: `Could not read file: ${err.message}` }, { status: 400 });
  }

  // --- Parse CSV ---
  let rows;
  try {
    rows = parseCSV(text);
  } catch (err) {
    return Response.json({ error: `CSV parse error: ${err.message}` }, { status: 400 });
  }

  if (rows.length === 0) {
    return Response.json({ error: "CSV contains no data rows" }, { status: 400 });
  }

  // --- Write to D1 ---
  try {
    // Clear existing data
    await env.DB.prepare("DELETE FROM stops").run();

    // Batch insert
    const stmt = env.DB.prepare(`
      INSERT INTO stops (
        order_num, name, type, address, checkin, checkout, nights,
        cancellation_deadline, price, currency, payment_status,
        booking_ref, booking_url, phone, distance_to_next_km, notes, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const batch = rows.map(r => stmt.bind(
      num(r.order),
      str(r.name),
      str(r.type),
      str(r.address),
      str(r.checkin),
      str(r.checkout),
      num(r.nights),
      str(r.cancellation_deadline),
      num(r.price),
      str(r.currency) || "EUR",
      str(r.payment_status) || "Pay on arrival",
      str(r.booking_ref),
      str(r.booking_url),
      str(r.phone),
      num(r.distance_to_next_km),
      str(r.notes),
      str(r.image_url)
    ));

    await env.DB.batch(batch);

    return Response.json({ success: true, imported: rows.length }, {
      headers: { "Access-Control-Allow-Origin": "*" }
    });
  } catch (err) {
    return Response.json({ error: `Database error: ${err.message}` }, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function str(v) {
  return (v && v.toString().trim()) || null;
}

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/**
 * Minimal RFC-4180 compliant CSV parser.
 * Handles quoted fields with embedded commas and newlines.
 * Returns array of objects keyed by header row (lowercased, spaces→underscores).
 */
function parseCSV(raw) {
  // Strip BOM (common in Excel exports)
  const text = raw.replace(/^\uFEFF/, "").trim();

  const lines = splitCSVLines(text);
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headers = parseCSVRow(lines[0]).map(h =>
    h.toLowerCase().replace(/[\s\-]+/g, "_")
  );

  return lines.slice(1)
    .filter(line => line.trim() !== "")
    .map(line => {
      const values = parseCSVRow(line);
      const row = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      return row;
    });
}

function parseCSVRow(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function splitCSVLines(text) {
  const lines = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

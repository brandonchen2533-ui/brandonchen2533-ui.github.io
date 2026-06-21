// LOUIS AI endpoint — POST /api/estimate
// Takes a meal photo (base64 data URL), returns calories + macros + a health
// score via Claude vision. If ANTHROPIC_API_KEY is unset, responds 503 so the
// web client transparently falls back to its local stub estimator.

import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";

// Load .env if present (Node 20.12+ / 24 has process.loadEnvFile).
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file — rely on real env vars */
}

const PORT = Number(process.env.PORT) || 8787;
const MODEL = process.env.LOUIS_MODEL || "claude-opus-4-8";
const hasKey = !!process.env.ANTHROPIC_API_KEY;
const client = hasKey ? new Anthropic() : null;

const SYSTEM = `You are LOUIS, a nutrition-vision assistant. Given a photo of a meal, identify the foods and estimate the nutrition for the WHOLE portion visible.

Return ONLY a single JSON object (no prose, no markdown fences) with exactly these keys:
{
  "title": string,            // short dish name, e.g. "Grilled chicken bowl"
  "items": string[],          // visible components, 2-6 entries
  "macros": {
    "calories": number,       // kcal for the full portion shown
    "protein": number,        // grams
    "carbs": number,          // grams
    "fat": number             // grams
  },
  "healthScore": number,      // 0-100 nutritional quality. Whole foods, lean
                              // protein, vegetables score high (70-95).
                              // Fried, sugary, ultra-processed score low (10-40).
  "confidence": number        // 0-1, your confidence in the estimate
}

Be realistic with portion sizes. If unsure, give your best single estimate rather than a range.`;

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(json);
}

/** Pull a JSON object out of model text, tolerating stray wrapping. */
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in response");
  return JSON.parse(text.slice(start, end + 1));
}

function parseDataUrl(dataUrl) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s.exec(dataUrl || "");
  if (!m) throw new Error("expected a base64 image data URL");
  return { mediaType: m[1], data: m[2] };
}

async function estimate(image) {
  const { mediaType, data } = parseDataUrl(image);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: "adaptive" },
    // System prompt is stable across requests → cache it.
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data } },
          { type: "text", text: "Estimate the nutrition for this meal." },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("no text block in response");
  const parsed = extractJson(textBlock.text);

  return {
    title: String(parsed.title ?? "Meal"),
    items: Array.isArray(parsed.items) ? parsed.items.map(String) : [],
    macros: {
      calories: Math.round(Number(parsed.macros?.calories) || 0),
      protein: Math.round(Number(parsed.macros?.protein) || 0),
      carbs: Math.round(Number(parsed.macros?.carbs) || 0),
      fat: Math.round(Number(parsed.macros?.fat) || 0),
    },
    healthScore: Math.max(0, Math.min(100, Math.round(Number(parsed.healthScore) || 50))),
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
    stub: false,
  };
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});

  if (req.method === "GET" && req.url === "/api/health") {
    return send(res, 200, { ok: true, ai: hasKey, model: hasKey ? MODEL : null });
  }

  if (req.method === "POST" && req.url === "/api/estimate") {
    if (!client) return send(res, 503, { error: "AI disabled: no ANTHROPIC_API_KEY" });

    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 12_000_000) req.destroy(); // ~12MB cap
    });
    req.on("end", async () => {
      try {
        const { image } = JSON.parse(body);
        const result = await estimate(image);
        send(res, 200, result);
      } catch (err) {
        const status = err instanceof Anthropic.APIError ? err.status || 502 : 400;
        console.error("estimate error:", err?.message);
        send(res, status, { error: err?.message || "estimation failed" });
      }
    });
    return;
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`LOUIS API on http://localhost:${PORT}  (AI ${hasKey ? `ON · ${MODEL}` : "OFF · using client stub"})`);
});

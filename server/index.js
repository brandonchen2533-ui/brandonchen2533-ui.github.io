// LOUIS local dev AI server — POST /api/estimate
// Mirrors the Vercel serverless function (api/estimate.js) for local testing.
// Shares the estimation logic in lib/estimate.js. If ANTHROPIC_API_KEY is unset,
// responds 503 so the web client transparently falls back to its stub estimator.

import http from "node:http";
import Anthropic from "@anthropic-ai/sdk";

// Load .env if present (Node 20.12+ / 24 has process.loadEnvFile).
try {
  process.loadEnvFile(".env");
} catch {
  /* no .env file — rely on real env vars */
}

const { estimateMeal, DEFAULT_MODEL } = await import("../lib/estimate.js");

const PORT = Number(process.env.PORT) || 8787;
const hasKey = !!process.env.ANTHROPIC_API_KEY;

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") return send(res, 204, {});

  if (req.method === "GET" && req.url === "/api/health") {
    return send(res, 200, { ok: true, ai: hasKey, model: hasKey ? DEFAULT_MODEL : null });
  }

  if (req.method === "POST" && req.url === "/api/estimate") {
    if (!hasKey) return send(res, 503, { error: "AI disabled: no ANTHROPIC_API_KEY" });

    let body = "";
    req.on("data", (c) => {
      body += c;
      if (body.length > 12_000_000) req.destroy(); // ~12MB cap
    });
    req.on("end", async () => {
      try {
        const { image } = JSON.parse(body);
        const result = await estimateMeal(image);
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
  console.log(`LOUIS API on http://localhost:${PORT}  (AI ${hasKey ? `ON · ${DEFAULT_MODEL}` : "OFF · using client stub"})`);
});

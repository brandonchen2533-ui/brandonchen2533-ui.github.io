// Vercel serverless function — POST /api/estimate
// Meal photo (base64 data URL) → calories + macros + health score via Claude.
// The browser never sees ANTHROPIC_API_KEY; it lives only in Vercel env vars.

import Anthropic from "@anthropic-ai/sdk";
import { estimateMeal } from "../lib/estimate.js";

export const config = {
  maxDuration: 60, // vision + thinking can take a while
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    // Client falls back to its local stub estimator.
    return res.status(503).json({ error: "AI disabled: no ANTHROPIC_API_KEY" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const image = body?.image;
    const result = await estimateMeal(image);
    return res.status(200).json(result);
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status || 502 : 400;
    console.error("estimate error:", err?.message);
    return res.status(status).json({ error: err?.message || "estimation failed" });
  }
}

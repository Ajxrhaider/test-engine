import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

/* ============================================================================
   test-engine — /api/generate
   Serverless route that converts a plain-English schema description into a
   schema-accurate dummy JSON array using Groq (qwen/qwen3.8-27b).

   SECURITY:
   - GROQ_API_KEY is read from server environment variables ONLY.
   - This file runs server-side, so the key is never shipped to the browser.
   - Vercel: set GROQ_API_KEY in Project Settings -> Environment Variables.
   ============================================================================ */

export const runtime = "nodejs";
export const maxDuration = 60; // seconds (Vercel function timeout)

// Active verified model on your Groq account
const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_TIMEOUT_MS = 55_000;

const MIN_DESCRIPTION_LENGTH = 3;
const MAX_DESCRIPTION_LENGTH = 2_000;
const DEFAULT_COUNT = 5;
const MAX_COUNT = 25; // Keeps token requirements safely within on-demand limits

/* ----------------------------------------------------------------------------
   Helpers
   ---------------------------------------------------------------------------- */

function fail(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function clampCount(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_COUNT;
  return Math.min(MAX_COUNT, Math.max(1, Math.floor(n)));
}

/**
 * Defensively unwrap the JSON array.
 * Groq's response_format: { type: "json_object" } guarantees valid JSON root,
 * which will typically be { "data": [...] } or { "items": [...] } or a raw array.
 */
function extractJsonArray(raw: string): unknown[] {
  let text = raw.trim();

  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json|javascript)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    text = fenced[1].trim();
  }

  const parsed = JSON.parse(text);

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.results)) return obj.results;
    if (Array.isArray(obj.records)) return obj.records;

    // Fallback: take the first array property found
    for (const val of Object.values(obj)) {
      if (Array.isArray(val)) return val;
    }
  }

  throw new Error("No array found in JSON response.");
}

/* ----------------------------------------------------------------------------
   Prompt construction — strict JSON format
   ---------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `You are "test-engine", a precise dummy-data generation engine.
You MUST output valid JSON with a single top-level key called "data" containing an array of objects.

Example shape:
{
  "data": [
    { "id": 1, "name": "Alice" },
    { "id": 2, "name": "Bob" }
  ]
}

ABSOLUTE RULES:
1. Every object in the "data" array MUST adhere to the exact same schema.
2. Use concise, realistic, believable values.
3. Keep types consistent across all objects: numbers are numbers, booleans are booleans, dates are ISO-8601 strings.
4. Output must be valid, well-formed JSON syntax.`;

function buildUserPrompt(description: string, count: number): string {
  return `Generate exactly ${count} mock records matching this description:
"""${description}"""

Return a JSON object with the "data" array containing the ${count} records.`;
}

/* ----------------------------------------------------------------------------
   POST /api/generate
   ---------------------------------------------------------------------------- */

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.error("[test-engine] GROQ_API_KEY is not set on the server.");
    return fail(
      "The server is missing the GROQ_API_KEY environment variable. Add it in your .env.local (development) or Vercel Environment Variables (production).",
      500
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid request body: expected JSON.", 400);
  }

  const { description, count } = (body ?? {}) as {
    description?: unknown;
    count?: unknown;
  };

  if (typeof description !== "string" || description.trim().length < MIN_DESCRIPTION_LENGTH) {
    return fail(
      `Please describe the JSON you need (at least ${MIN_DESCRIPTION_LENGTH} characters).`,
      400
    );
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return fail(
      `Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters).`,
      400
    );
  }

  const rows = clampCount(count);

  // Budget output tokens to stay safely below the 1,000 OTPM ceiling:
  // ~40-60 tokens per record, capped at 900 to leave headroom.
  const calculatedMaxTokens = Math.min(900, Math.max(250, rows * 65));

  let rawContent: string;
  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        temperature: 0.6,
        max_tokens: calculatedMaxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(description.trim(), rows) },
        ],
      },
      { timeout: GROQ_TIMEOUT_MS }
    );

    rawContent = completion.choices?.[0]?.message?.content ?? "";
  } catch (error) {
    console.error("[test-engine] Groq API error:", error);

    if (error instanceof Groq.APIError) {
      if (error.status === 401) {
        return fail("The Groq API key is invalid. Check GROQ_API_KEY.", 502);
      }
      if (error.status === 429) {
        return fail("Groq rate limit hit. Wait a few seconds and try again.", 429);
      }
      return fail(
        `Groq API error (${error.status}). Please try again in a moment.`,
        502
      );
    }
    return fail("Could not reach the Groq API. Check your network and try again.", 502);
  }

  if (!rawContent.trim()) {
    return fail("The model returned an empty response. Please try again.", 502);
  }

  let data: unknown[];
  try {
    data = extractJsonArray(rawContent);
  } catch (error) {
    console.error("[test-engine] Failed to parse model output:", rawContent.slice(0, 500));
    return fail(
      "The model produced output that could not be parsed as a JSON array. Please try again — rephrasing your description often helps.",
      502
    );
  }

  if (data.length === 0) {
    return fail("The model returned an empty array. Please try again.", 502);
  }

  return NextResponse.json(
    {
      success: true,
      data,
      count: data.length,
      model: GROQ_MODEL,
    },
    { status: 200 }
  );
}

export async function GET() {
  return fail('Method not allowed. Send a POST request with { "description": string, "count": number }.', 405);
}
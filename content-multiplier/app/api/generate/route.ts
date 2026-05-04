import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GenerateRequest {
  idea: string;
  platform: "TikTok" | "Instagram Reels" | "YouTube Shorts";
  tone: "Casual" | "Aggressive" | "Educational" | "Storytelling";
}

export interface GenerateResponse {
  hooks: string[];
  scripts: string[];
  captions: string[];
  ideas: string[];
}

function buildPrompt(req: GenerateRequest): string {
  const platformNotes: Record<string, string> = {
    TikTok:
      "TikTok audience: Gen Z and Millennials. Use slang, trending language, fast-paced energy. Hook in first 1-2 seconds.",
    "Instagram Reels":
      "Instagram Reels audience: lifestyle-focused, aesthetic-conscious. Slightly more polished but still snappy and engaging.",
    "YouTube Shorts":
      "YouTube Shorts audience: broad demographic, discovery-focused. Strong value delivery and clear call-to-action.",
  };

  const toneNotes: Record<string, string> = {
    Casual: "Conversational, relatable, like texting a friend. No jargon.",
    Aggressive:
      "Bold, provocative, challenging. Make bold claims. Use power language. Create urgency.",
    Educational:
      "Clear, insightful, credibility-driven. Teach something specific. Facts over fluff.",
    Storytelling:
      "Narrative arc. Start with tension or conflict. Build to a reveal or lesson.",
  };

  return `You are a viral short-form content strategist specializing in ${req.platform}.

TOPIC: "${req.idea}"
PLATFORM: ${req.platform} — ${platformNotes[req.platform]}
TONE: ${req.tone} — ${toneNotes[req.tone]}

Generate the following content. Return ONLY valid JSON with no markdown, no code fences, no explanation.

Rules:
- Hooks must be SCROLL-STOPPING. Never start with "Here are", "Did you know", or generic openers.
- Use curiosity gaps, bold claims, controversy, or pattern interrupts.
- Scripts follow strict format: [HOOK 3-5 sec] → [VALUE 10-20 sec] → [CTA 3-5 sec]
- Scripts should be written as spoken word, not bullet points.
- Captions must include 1-2 relevant emojis and feel native to ${req.platform}.
- Post ideas should be specific, actionable, and immediately filmable.
- Tailor EVERYTHING specifically to ${req.platform} culture and ${req.tone} tone.
- Do NOT use phrases like "Here's", "Let's talk about", "In this video".

Return this exact JSON structure:
{
  "hooks": [10 viral hook lines, each under 15 words, no numbering],
  "scripts": [5 complete scripts, each 40-80 words, written as spoken word with [HOOK], [VALUE], [CTA] labels inline],
  "captions": [10 captions, each 1-3 sentences with emojis, ready to post],
  "ideas": [5 specific video concepts with a brief 1-sentence description of what to film]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequest = await req.json();

    if (!body.idea?.trim() || !body.platform || !body.tone) {
      return NextResponse.json(
        { error: "Missing required fields: idea, platform, tone" },
        { status: 400 }
      );
    }

    if (body.idea.length > 500) {
      return NextResponse.json(
        { error: "Idea must be under 500 characters" },
        { status: 400 }
      );
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildPrompt(body) }],
      temperature: 0.9,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "No content returned from OpenAI" },
        { status: 500 }
      );
    }

    const parsed: GenerateResponse = JSON.parse(raw);

    // Validate shape
    if (
      !Array.isArray(parsed.hooks) ||
      !Array.isArray(parsed.scripts) ||
      !Array.isArray(parsed.captions) ||
      !Array.isArray(parsed.ideas)
    ) {
      return NextResponse.json(
        { error: "Unexpected response format from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[/api/generate]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

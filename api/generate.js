// Vercel Serverless Function — calls NVIDIA Nemotron API
// API key is stored as Vercel environment variable (NVIDIA_API_KEY)

const PURPOSE_CONTEXT = {
  general:    "general-purpose AI task",
  coding:     "coding and software development task — include tech stack context, constraints, code style preferences",
  writing:    "creative writing task — include genre, tone, perspective, length, audience",
  image:      "image generation prompt (for Midjourney/DALL-E/Stable Diffusion) — include style, lighting, composition, camera, mood",
  research:   "research and analysis task — include scope, sources, structure, depth of analysis",
  marketing:  "marketing and copywriting task — include target audience, brand voice, channel, CTA",
  education:  "educational explanation task — include audience level, analogies, examples, learning goals",
  business:   "business and strategy task — include stakeholders, constraints, desired outcome, format",
  chatbot:    "chatbot or system prompt — define the AI persona, rules, capabilities, tone, and boundaries",
  video:      "video script — include format, duration, audience, platform, pacing, and structure",
};

const STYLE_CONTEXT = {
  balanced:     "balanced and neutral",
  professional: "professional, formal, and polished",
  creative:     "creative, vivid, and expressive",
  technical:    "technical, precise, and structured",
  simple:       "simple, clear, and easy to understand",
  persuasive:   "persuasive, compelling, and bold",
  academic:     "academic, scholarly, and citation-ready",
};

function getDetailInstruction(detail) {
  if (detail <= 20) return "Keep the enhanced prompt concise and minimal — just the essentials.";
  if (detail <= 40) return "Provide a brief but clear enhanced prompt with a few key details.";
  if (detail <= 60) return "Provide a balanced enhanced prompt with good structure and useful context.";
  if (detail <= 80) return "Provide a detailed enhanced prompt with thorough context, constraints, examples, and formatting guidance.";
  return "Provide an ultra-detailed enhanced prompt. Include role assignment, detailed context, step-by-step instructions, constraints, examples, output format specification, tone guidance, edge case handling, and any additional nuances that will help the AI produce the best possible output.";
}

function buildSystemPrompt(purposeCtx, styleCtx, detailInstruction) {
  return [
    "You are an expert prompt engineer. Your only job is to transform a user's rough, raw idea into a powerful, well-structured AI prompt.",
    "",
    `The enhanced prompt should be for a: ${purposeCtx}`,
    `Tone/style: ${styleCtx}`,
    detailInstruction,
    "",
    "Rules:",
    '- Output ONLY the enhanced prompt text itself — no preamble, no explanation, no "Here is your prompt:", no markdown fences.',
    "- Write it as if you are directly addressing an AI model.",
    "- The enhanced prompt should be immediately usable.",
    "- Preserve the original intent but make it significantly more effective.",
  ].join("\n");
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { raw, purpose = "general", style = "balanced", detail = 50 } = req.body;

    if (!raw || !raw.trim()) {
      return res.status(400).json({ error: "Please enter your raw prompt idea first." });
    }

    const purposeCtx = PURPOSE_CONTEXT[purpose] || PURPOSE_CONTEXT.general;
    const styleCtx = STYLE_CONTEXT[style] || STYLE_CONTEXT.balanced;
    const detailInstruction = getDetailInstruction(Number(detail));

    const systemPrompt = buildSystemPrompt(purposeCtx, styleCtx, detailInstruction);

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "NVIDIA_API_KEY is not configured on the server." });
    }

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-nano-30b-a3b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: raw.trim() },
        ],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `NVIDIA API error: ${response.status}`);
    }

    const result = data.choices?.[0]?.message?.content?.trim() || "";

    return res.status(200).json({ result });

  } catch (error) {
    console.error("Generate error:", error);
    return res.status(500).json({ error: error.message || "Something went wrong. Please try again." });
  }
};
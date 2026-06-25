/**
 * Prompt Forge — Local Development Server
 * Run: node dev.js
 * Then open: http://localhost:3000
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const FRONTEND_DIR = path.join(__dirname, "frontend");
const API_KEY = process.env.NVIDIA_API_KEY || "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";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

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

async function serveStatic(req, res) {
  let filePath = path.join(FRONTEND_DIR, req.url === "/" ? "index.html" : req.url);
  const ext = path.extname(filePath);

  try {
    const data = await fs.promises.readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    // Try index.html for SPA-like routing
    try {
      const data = await fs.promises.readFile(path.join(FRONTEND_DIR, "index.html"));
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  }
}

async function handleGenerate(req, res) {
  let body = "";
  req.on("data", chunk => body += chunk);

  req.on("end", async () => {
    try {
      const { raw, purpose = "general", style = "balanced", detail = 50 } = JSON.parse(body);

      if (!raw || !raw.trim()) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Please enter your raw prompt idea first." }));
      }

      const purposeCtx = PURPOSE_CONTEXT[purpose] || PURPOSE_CONTEXT.general;
      const styleCtx = STYLE_CONTEXT[style] || STYLE_CONTEXT.balanced;
      const detailInstruction = getDetailInstruction(Number(detail));
      const systemPrompt = buildSystemPrompt(purposeCtx, styleCtx, detailInstruction);

      const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
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

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (error) {
      console.error("Generate error:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message || "Something went wrong." }));
    }
  });
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === "/api/generate" && req.method === "POST") {
    return handleGenerate(req, res);
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`⚓ Prompt Forge running at http://localhost:${PORT}`);
  console.log(`📂 Open http://localhost:${PORT} in your browser`);
});
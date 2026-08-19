import { AGER_SYSTEM, buildUserPrompt } from "@/lib/ai/schema";
import type { AgerGraph } from "@/lib/ager/types";

export interface ApiStreamChunk {
  type: "token" | "status" | "done" | "error";
  text?: string;
  message?: string;
}

export async function* streamGrokApi(
  prompt: string,
  current: AgerGraph,
): AsyncGenerator<ApiStreamChunk> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    yield { type: "error", message: "XAI_API_KEY is not set." };
    return;
  }

  yield { type: "status", message: "Streaming from Grok API…" };

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 2400,
      stream: true,
      messages: [
        { role: "system", content: AGER_SYSTEM },
        { role: "user", content: buildUserPrompt(prompt, current) },
      ],
    }),
  });

  if (!res.ok) {
    yield { type: "error", message: `xAI API error ${res.status}` };
    return;
  }
  if (!res.body) {
    yield { type: "error", message: "xAI returned no body" };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload) as {
          choices?: { delta?: { content?: string } }[];
        };
        const piece = json.choices?.[0]?.delta?.content ?? "";
        if (piece) {
          full += piece;
          yield { type: "token", text: piece };
        }
      } catch {
        // ignore malformed frames
      }
    }
  }

  yield { type: "done", text: full };
}

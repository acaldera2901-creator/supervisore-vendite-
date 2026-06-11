interface OllamaMessage {
  role: 'system' | 'user';
  content: string;
}

interface GenerateJsonOptions {
  system: string;
  prompt: string;
  model?: string;
}

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || process.env.OLLAMA_FAST_MODEL || 'llama3.2';
const OLLAMA_PROXY_TOKEN = process.env.OLLAMA_PROXY_TOKEN;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Ollama did not return JSON.');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

export async function generateJson({ system, prompt, model = OLLAMA_MODEL }: GenerateJsonOptions): Promise<unknown> {
  const messages: OllamaMessage[] = [
    { role: 'system', content: system },
    { role: 'user', content: prompt },
  ];

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(OLLAMA_PROXY_TOKEN ? { 'x-consultor-token': OLLAMA_PROXY_TOKEN } : {}),
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      format: 'json',
      keep_alive: '30m',
      options: {
        temperature: 0.1,
        num_ctx: 4096,
        num_predict: 700,
        top_p: 0.8,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as { message?: { content?: string } };
  return extractJson(payload.message?.content || '');
}

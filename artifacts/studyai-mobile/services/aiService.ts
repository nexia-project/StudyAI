import { API_BASE } from "../context/AuthContext";

export type TaskType = "fast" | "deep" | "slides";
export type AiProvider = "openai" | "claude";

export interface Slide {
  title: string;
  content: string[];
}

export interface AiResponse {
  response: string;
  slides?: Slide[];
  model_used?: string;
  cached?: boolean;
}

export async function askAI(
  message: string,
  type: TaskType,
  provider: AiProvider,
  token?: string,
): Promise<AiResponse> {
  const url = `${API_BASE}/api/chat/${provider}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, type }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erro ${res.status}: ${err}`);
  }

  return res.json() as Promise<AiResponse>;
}

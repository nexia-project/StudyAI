import { useState, useCallback } from "react";
import type { TaskType, AiProvider } from "../components/ChatForm";
import type { Slide } from "../components/SlidesPreview";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface Message {
  id:         string;
  role:       "user" | "assistant";
  content:    string;
  slides?:    Slide[];
  model?:     string;
  cached?:    boolean;
}

export function useAiChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const sendMessage = useCallback(async (
    message: string,
    type: TaskType,
    provider: AiProvider,
  ) => {
    setError(null);
    const userMsg: Message = {
      id:      crypto.randomUUID(),
      role:    "user",
      content: message,
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/chat/${provider}`, {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ message, type }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Erro ${res.status}`);
      }

      const data = await res.json() as {
        response:   string;
        slides?:    Slide[];
        model_used?: string;
        cached?:    boolean;
      };

      const assistantMsg: Message = {
        id:      crypto.randomUUID(),
        role:    "assistant",
        content: data.response,
        slides:  data.slides,
        model:   data.model_used,
        cached:  data.cached,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, sendMessage, clearMessages };
}

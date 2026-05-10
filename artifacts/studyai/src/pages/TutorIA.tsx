import { useRef, useEffect } from "react";
import { Trash2, Bot } from "lucide-react";
import ChatForm, { type TaskType, type AiProvider } from "../components/ChatForm";
import ChatResponse from "../components/ChatResponse";
import SlidesPreview from "../components/SlidesPreview";
import { useAiChat } from "../hooks/useAiChat";

export default function TutorIA() {
  const { messages, loading, error, sendMessage, clearMessages } = useAiChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Tutor IA</h1>
              <p className="text-xs text-slate-500">GPT · Claude · Cache inteligente</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={clearMessages}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all">
              <Trash2 className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="space-y-6 mb-6">
          {messages.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-violet-400" />
              </div>
              <h2 className="text-slate-800 font-semibold mb-1">Olá! Sou o Tiagão</h2>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">
                Pergunte qualquer coisa sobre ENEM, vestibular ou qualquer matéria.
                Posso responder de forma rápida, aprofundada ou gerar slides!
              </p>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-violet-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ChatResponse
                    response={msg.content}
                    model={msg.model}
                    cached={msg.cached}
                  />
                  {msg.slides && msg.slides.length > 0 && (
                    <SlidesPreview slides={msg.slides} />
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <ChatResponse response="" loading />
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-4">
            <ChatForm
              onSubmit={sendMessage}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

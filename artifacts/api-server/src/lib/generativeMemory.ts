/**
 * generativeMemory.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Sistema de Memória Generativa do Professor Tiagão.
 *
 * O que este módulo faz:
 *  1. Carrega o perfil completo do usuário (perfil, tópicos, sessões, fatos)
 *  2. Formata um bloco de contexto rico para injeção no prompt do sistema
 *  3. Após cada conversa, roda GPT-4o-mini assincronamente para extrair:
 *     - Resumo da sessão
 *     - Tópicos estudados
 *     - Humor / atitude do usuário
 *     - Atualizações de perfil (tom, estilo, dificuldades, conquistas)
 *     - Fatos novos importantes
 *  4. Persiste tudo em `user_profile_memory` (JSONB, um registro por usuário)
 *  5. Complementa — não substitui — a tabela `tiagao_memory` existente
 */

import OpenAI from "openai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logAiUsage } from "./aiCostLogger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Perfil {
  nomePreferido?: string;
  objetivo?: string;
  serie?: string;
  escola?: string;
  tomDeVoz?: string;          // "informal", "formal", "muito informal"
  usaEmoji?: boolean;
  giriasFrequentes?: string[];
  estiloAprendizagem?: string; // "visual", "textual", "exemplos práticos"
  pontosFortes?: string[];
  dificuldades?: string[];
  frequenciaEstudo?: string;   // "diária", "fins de semana", "irregular"
  metaVestibular?: string;     // "ENEM", "FUVEST", "concurso público"
}

interface TopicoFrequente {
  topico: string;
  materia: string;
  count: number;
  ultimaVez: string; // ISO date
}

interface SessaoSumario {
  data: string;       // ISO date
  resumo: string;     // 2-3 sentences about what happened
  topicos: string[];
  humor: string;      // "animado", "cansado", "frustrado", "concentrado"
  feature: string;    // "chat", "voice", "aula-ia"
}

interface FatoImportante {
  fato: string;
  categoria: string;
  adicionadoEm: string;
}

interface UserProfile {
  perfil: Perfil;
  topicosFrequentes: TopicoFrequente[];
  ultimasSessoes: SessaoSumario[];
  fatosImportantes: FatoImportante[];
}

// ─── OpenAI client ────────────────────────────────────────────────────────────

let _gpt: OpenAI | null = null;
function getGpt(): OpenAI {
  if (!_gpt) {
    _gpt = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "dummy",
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _gpt;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function loadRawProfile(userId: string): Promise<UserProfile> {
  try {
    const rows = await db.execute<{
      perfil: any;
      topicos_frequentes: any;
      ultimas_sessoes: any;
      fatos_importantes: any;
    }>(sql`
      SELECT perfil, topicos_frequentes, ultimas_sessoes, fatos_importantes
      FROM user_profile_memory
      WHERE user_id = ${userId}
      LIMIT 1
    `);

    if (!rows.rows?.length) {
      return { perfil: {}, topicosFrequentes: [], ultimasSessoes: [], fatosImportantes: [] };
    }

    const row = rows.rows[0] as any;
    return {
      perfil: row.perfil ?? {},
      topicosFrequentes: row.topicos_frequentes ?? [],
      ultimasSessoes: row.ultimas_sessoes ?? [],
      fatosImportantes: row.fatos_importantes ?? [],
    };
  } catch {
    return { perfil: {}, topicosFrequentes: [], ultimasSessoes: [], fatosImportantes: [] };
  }
}

async function upsertProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO user_profile_memory (user_id, perfil, topicos_frequentes, ultimas_sessoes, fatos_importantes, atualizado_at)
      VALUES (
        ${userId},
        ${JSON.stringify(updates.perfil ?? {})}::jsonb,
        ${JSON.stringify(updates.topicosFrequentes ?? [])}::jsonb,
        ${JSON.stringify(updates.ultimasSessoes ?? [])}::jsonb,
        ${JSON.stringify(updates.fatosImportantes ?? [])}::jsonb,
        NOW()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        perfil = EXCLUDED.perfil,
        topicos_frequentes = EXCLUDED.topicos_frequentes,
        ultimas_sessoes = EXCLUDED.ultimas_sessoes,
        fatos_importantes = EXCLUDED.fatos_importantes,
        atualizado_at = NOW()
    `);
  } catch (e) {
    console.error("[generativeMemory] upsertProfile error:", e);
  }
}

// Load existing tiagao_memory facts (legacy system — still used)
async function loadLegacyMemories(userId: string): Promise<string> {
  try {
    const rows = await db.execute<{ memoria: string; categoria: string; importancia: number }>(
      sql`SELECT memoria, categoria, importancia FROM tiagao_memory
          WHERE user_id = ${userId}
          ORDER BY importancia DESC, atualizado_at DESC
          LIMIT 20`
    );
    if (!rows.rows?.length) return "";
    return rows.rows
      .map((r: any) => `• [${r.categoria}] ${r.memoria}`)
      .join("\n");
  } catch { return ""; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a rich context block for the AI system prompt.
 * This is what makes Tiagão "remember" the student.
 */
export async function getFullMemoryContext(
  userId: string,
  userName: string
): Promise<string> {
  try {
    const [profile, legacyFacts] = await Promise.all([
      loadRawProfile(userId),
      loadLegacyMemories(userId),
    ]);

    const { perfil, topicosFrequentes, ultimasSessoes, fatosImportantes } = profile;

    const nomeDisplay = perfil.nomePreferido || userName;
    const hasProfile = Object.keys(perfil).length > 0;
    const hasSessions = ultimasSessoes.length > 0;
    const hasTopics = topicosFrequentes.length > 0;
    const hasLegacy = !!legacyFacts;
    const isFirstTime = !hasProfile && !hasSessions && !hasTopics && !hasLegacy;

    const parts: string[] = [];

    // ── Header ──────────────────────────────────────────────────────────────
    parts.push(`📖 BRIEFING DO USUÁRIO — ${nomeDisplay}`);
    parts.push("─".repeat(55));

    if (isFirstTime) {
      // ── First time user: prime the AI to get to know them ─────────────────
      parts.push(`🆕 PRIMEIRA CONVERSA com ${nomeDisplay}.`);
      parts.push(`Você ainda não o conhece — use esta sessão para descobrir:`);
      parts.push(`   • Como prefere ser chamado`);
      parts.push(`   • Qual o objetivo (ENEM, vestibular, concurso, etc.)`);
      parts.push(`   • O que está estudando / em que série está`);
      parts.push(`   • Em que tem mais dificuldade`);
      parts.push(`Seja caloroso, curioso e genuíno. Essa é a fundação da relação de vocês.`);
    } else {
      // ── Profile card ────────────────────────────────────────────────────────
      const profileLines: string[] = [];
      if (perfil.objetivo)           profileLines.push(`🎯 Objetivo: ${perfil.objetivo}`);
      if (perfil.metaVestibular)     profileLines.push(`🏫 Vestibular-alvo: ${perfil.metaVestibular}`);
      if (perfil.serie)              profileLines.push(`📚 Série/Nível: ${perfil.serie}`);
      if (perfil.tomDeVoz)           profileLines.push(`💬 Tom de voz: ${perfil.tomDeVoz}`);
      if (perfil.usaEmoji !== undefined) profileLines.push(`😊 Usa emoji: ${perfil.usaEmoji ? "sim, usa bastante" : "raramente"}`);
      if (perfil.giriasFrequentes?.length) profileLines.push(`🗣️ Gírias: ${perfil.giriasFrequentes.join(", ")}`);
      if (perfil.estiloAprendizagem) profileLines.push(`🧠 Estilo de aprendizagem: ${perfil.estiloAprendizagem}`);
      if (perfil.pontosFortes?.length) profileLines.push(`✅ Pontos fortes: ${perfil.pontosFortes.join(", ")}`);
      if (perfil.dificuldades?.length) profileLines.push(`⚠️ Dificuldades: ${perfil.dificuldades.join(", ")}`);
      if (perfil.frequenciaEstudo)   profileLines.push(`📅 Frequência de estudo: ${perfil.frequenciaEstudo}`);
      if (profileLines.length > 0)   parts.push(profileLines.join("\n"));

      // ── Last session ──────────────────────────────────────────────────────
      if (hasSessions) {
        const last = ultimasSessoes[ultimasSessoes.length - 1];
        const date = last.data ? new Date(last.data).toLocaleDateString("pt-BR") : "recentemente";
        parts.push(`\n🕐 ÚLTIMA SESSÃO (${date} — ${last.feature ?? "chat"}):`);
        parts.push(`   ${last.resumo}`);
        if (last.topicos?.length) parts.push(`   Tópicos: ${last.topicos.join(", ")}`);
        if (last.humor) parts.push(`   Humor: ${last.humor}`);
      }

      // ── Previous sessions (brief) ─────────────────────────────────────────
      const prevSessions = ultimasSessoes.slice(-4, -1).reverse();
      if (prevSessions.length > 0) {
        parts.push(`\n📅 SESSÕES ANTERIORES:`);
        for (const s of prevSessions) {
          const date = s.data ? new Date(s.data).toLocaleDateString("pt-BR") : "";
          parts.push(`   • ${date}: ${s.resumo.slice(0, 120)}`);
        }
      }

      // ── Topic frequency ───────────────────────────────────────────────────
      if (hasTopics) {
        const top5 = [...topicosFrequentes]
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        parts.push(`\n📊 TÓPICOS MAIS ESTUDADOS:`);
        parts.push(top5.map(t => `   • ${t.topico} (${t.materia}) — ${t.count}x`).join("\n"));
      }

      // ── Important facts ───────────────────────────────────────────────────
      if (fatosImportantes.length > 0) {
        parts.push(`\n💡 FATOS IMPORTANTES:`);
        parts.push(fatosImportantes.slice(-8).map(f => `   • ${f.fato}`).join("\n"));
      }

      // ── Legacy memories ───────────────────────────────────────────────────
      if (hasLegacy) {
        parts.push(`\n🧠 OBSERVAÇÕES SALVAS:`);
        parts.push(legacyFacts);
      }

      // ── Behavioral instructions ───────────────────────────────────────────
      parts.push(`\n⚡ INSTRUÇÕES DE PERSONALIZAÇÃO:`);
      if (perfil.tomDeVoz === "muito informal" || perfil.usaEmoji) {
        parts.push(`   → Seja informal, use o nome "${nomeDisplay}", emojis são bem-vindos`);
      } else if (perfil.tomDeVoz === "formal") {
        parts.push(`   → Tom profissional e respeitoso com ${nomeDisplay}`);
      } else {
        parts.push(`   → Tom amigável e próximo com ${nomeDisplay}`);
      }
      if (perfil.dificuldades?.length) {
        parts.push(`   → Seja extra paciente com: ${perfil.dificuldades.join(", ")}`);
      }
      if (perfil.pontosFortes?.length) {
        parts.push(`   → Reconheça e valorize as forças: ${perfil.pontosFortes.join(", ")}`);
      }
    }

    const block = parts.join("\n");
    return `\n\n${block}`;
  } catch (e) {
    console.error("[generativeMemory] getFullMemoryContext error:", e);
    return "";
  }
}

/**
 * Increment topic frequency counter.
 * Called when user accesses Aula-IA or Flashcards for a specific topic.
 */
export async function incrementTopicFrequency(
  userId: string,
  topico: string,
  materia: string
): Promise<void> {
  if (!userId || !topico) return;
  try {
    const profile = await loadRawProfile(userId);
    const existing = profile.topicosFrequentes.find(
      t => t.topico.toLowerCase() === topico.toLowerCase()
    );
    if (existing) {
      existing.count++;
      existing.ultimaVez = new Date().toISOString();
    } else {
      profile.topicosFrequentes.push({
        topico,
        materia: materia || "Geral",
        count: 1,
        ultimaVez: new Date().toISOString(),
      });
    }
    // Keep top 30 topics
    profile.topicosFrequentes = profile.topicosFrequentes
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);

    await upsertProfile(userId, profile);
  } catch (e) {
    console.error("[generativeMemory] incrementTopicFrequency error:", e);
  }
}

// ─── AI-powered session analyzer ─────────────────────────────────────────────

interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

interface ExtractedInsights {
  resumo: string;
  topicos: string[];
  humor: string;
  perfilUpdates: Partial<Perfil>;
  novosFatos: { fato: string; categoria: string }[];
  topicosEstudados: { topico: string; materia: string }[];
}

async function extractInsightsFromConversation(
  messages: SessionMessage[],
  userName: string,
  existingProfile: Perfil
): Promise<ExtractedInsights | null> {
  if (!messages || messages.length < 2) return null;

  const conversationText = messages
    .slice(-20) // Last 20 messages
    .map(m => `${m.role === "user" ? userName : "Tiagão"}: ${m.content}`)
    .join("\n");

  const existingProfileStr = JSON.stringify(existingProfile, null, 2);

  const systemPrompt = `Você é um analisador de conversas educacionais. Analise a conversa entre o aluno e o Professor Tiagão e extraia insights estruturados.

Responda APENAS com um JSON válido, sem markdown ou texto extra.`;

  const userPrompt = `NOME DO ALUNO: ${userName}

PERFIL JÁ CONHECIDO:
${existingProfileStr}

CONVERSA:
${conversationText}

Extraia e retorne este JSON exato (sem markdown, sem texto extra):
{
  "resumo": "Resumo em 2-3 frases do que foi discutido nesta sessão",
  "topicos": ["lista", "de", "tópicos", "estudados"],
  "humor": "animado|concentrado|cansado|frustrado|curioso|neutro",
  "perfilUpdates": {
    "tomDeVoz": "informal|muito informal|formal — baseado em como o aluno escreve",
    "usaEmoji": true/false,
    "giriasFrequentes": ["gírias que o aluno usou se houver"],
    "estiloAprendizagem": "visual|textual|exemplos práticos|analogias",
    "pontosFortes": ["matérias ou tópicos onde mostrou confiança"],
    "dificuldades": ["tópicos onde demonstrou confusão ou pediu ajuda"],
    "objetivo": "objetivo do aluno se mencionado",
    "metaVestibular": "ENEM|FUVEST|UNICAMP|concurso público etc se mencionado",
    "frequenciaEstudo": "como o aluno parece estudar se der pra inferir"
  },
  "novosFatos": [
    {"fato": "fato relevante novo sobre o aluno", "categoria": "objetivo|escola|vida|estudo"}
  ],
  "topicosEstudados": [
    {"topico": "nome do tópico", "materia": "Matemática|Física|Química|Biologia|História|etc"}
  ]
}

REGRAS:
- Só inclua campos que você tem certeza baseado na conversa
- perfilUpdates: só atualize campos se a conversa deu evidências claras
- novosFatos: só inclua fatos que NÃO estão no perfil existente
- Se não encontrar evidências para um campo, omita ou deixe array vazio`;

  try {
    const gpt = getGpt();
    const response = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const tokensIn = response.usage?.prompt_tokens ?? 0;
    const tokensOut = response.usage?.completion_tokens ?? 0;
    logAiUsage({ feature: "generative-memory", model: "gpt-4o-mini", tokensIn, tokensOut, userId: null });

    const parsed = JSON.parse(raw) as ExtractedInsights;
    return parsed;
  } catch (e) {
    console.error("[generativeMemory] extractInsights error:", e);
    return null;
  }
}

/**
 * Called AFTER a conversation session ends (fire-and-forget).
 * Analyzes the messages and updates the user's persistent profile.
 */
export async function updateProfileAfterSession(
  userId: string,
  userName: string,
  messages: SessionMessage[],
  feature: string = "chat"
): Promise<void> {
  if (!userId || !messages?.length) return;

  // Run async — don't block the HTTP response
  setImmediate(async () => {
    try {
      const profile = await loadRawProfile(userId);
      const insights = await extractInsightsFromConversation(messages, userName, profile.perfil);

      if (!insights) return;

      // ── Update perfil ──────────────────────────────────────────────────────
      const updatedPerfil: Perfil = { ...profile.perfil };
      const pu = insights.perfilUpdates ?? {};

      if (pu.tomDeVoz)           updatedPerfil.tomDeVoz = pu.tomDeVoz;
      if (pu.usaEmoji !== undefined) updatedPerfil.usaEmoji = pu.usaEmoji;
      if (pu.estiloAprendizagem) updatedPerfil.estiloAprendizagem = pu.estiloAprendizagem;
      if (pu.objetivo)           updatedPerfil.objetivo = pu.objetivo;
      if (pu.metaVestibular)     updatedPerfil.metaVestibular = pu.metaVestibular;
      if (pu.frequenciaEstudo)   updatedPerfil.frequenciaEstudo = pu.frequenciaEstudo;

      // Merge arrays (keep unique, max 10 items)
      if (pu.giriasFrequentes?.length) {
        const current = updatedPerfil.giriasFrequentes ?? [];
        updatedPerfil.giriasFrequentes = [...new Set([...current, ...pu.giriasFrequentes])].slice(0, 10);
      }
      if (pu.pontosFortes?.length) {
        const current = updatedPerfil.pontosFortes ?? [];
        updatedPerfil.pontosFortes = [...new Set([...current, ...pu.pontosFortes])].slice(0, 10);
      }
      if (pu.dificuldades?.length) {
        const current = updatedPerfil.dificuldades ?? [];
        updatedPerfil.dificuldades = [...new Set([...current, ...pu.dificuldades])].slice(0, 10);
      }

      // ── Add session summary ────────────────────────────────────────────────
      const newSession: SessaoSumario = {
        data: new Date().toISOString(),
        resumo: insights.resumo,
        topicos: insights.topicos ?? [],
        humor: insights.humor ?? "neutro",
        feature,
      };
      const sessions = [...(profile.ultimasSessoes ?? []), newSession].slice(-7); // Keep last 7

      // ── Update topic frequencies ───────────────────────────────────────────
      const topicosFrequentes = [...(profile.topicosFrequentes ?? [])];
      for (const { topico, materia } of (insights.topicosEstudados ?? [])) {
        if (!topico) continue;
        const existing = topicosFrequentes.find(t => t.topico.toLowerCase() === topico.toLowerCase());
        if (existing) {
          existing.count++;
          existing.ultimaVez = new Date().toISOString();
        } else {
          topicosFrequentes.push({ topico, materia: materia || "Geral", count: 1, ultimaVez: new Date().toISOString() });
        }
      }
      const sortedTopics = topicosFrequentes.sort((a, b) => b.count - a.count).slice(0, 30);

      // ── Add new important facts ────────────────────────────────────────────
      const existingFacts = profile.fatosImportantes ?? [];
      const newFacts: FatoImportante[] = (insights.novosFatos ?? [])
        .filter(f => f.fato && !existingFacts.some(ef => ef.fato.toLowerCase() === f.fato.toLowerCase()))
        .map(f => ({ fato: f.fato, categoria: f.categoria, adicionadoEm: new Date().toISOString() }));
      const allFacts = [...existingFacts, ...newFacts].slice(-20); // Keep last 20 facts

      // ── Persist ────────────────────────────────────────────────────────────
      await upsertProfile(userId, {
        perfil: updatedPerfil,
        topicosFrequentes: sortedTopics,
        ultimasSessoes: sessions,
        fatosImportantes: allFacts,
      });

      console.log(`[generativeMemory] Profile updated for user ${userId} — topics: ${insights.topicos?.join(", ")}`);
    } catch (e) {
      console.error("[generativeMemory] updateProfileAfterSession error:", e);
    }
  });
}

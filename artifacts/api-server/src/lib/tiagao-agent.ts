/**
 * tiagao-agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo compartilhado: todas as ferramentas do Tiagão + executor.
 * Usado pelo voice-chat (professor.ts) E pelo text-chat (chat.ts).
 */

import OpenAI from "openai";
import { openrouter, OR, generateWithGemini } from "./aiClient";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { MATERIAL_HTML_INSTRUCTIONS, MATERIAL_COMPONENT_GUIDE, wrapMaterialHTML } from "./material-template";
import { saveMemory, updateProfile, addImportantDate } from "./tiagao-memory";
import { storeKnowledge, searchKnowledge } from "./knowledge-base";

// Limpa output da IA (remove markdown fences ```html ... ```), extrai apenas o
// conteúdo do <body> caso a IA tenha retornado um documento completo, e envolve
// no template premium (CSS + scripts injetados automaticamente).
function buildMaterialHTML(title: string, raw: string): string {
  let s = (raw ?? "").trim();
  // Remove cercas de código markdown em qualquer lugar do início/fim
  s = s.replace(/^```(?:html|HTML)?\s*\r?\n?/i, "").replace(/\r?\n?```\s*$/i, "").trim();
  // Se vier um documento completo, extrai só o body (CSS/scripts virão do wrapper)
  const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) s = bodyMatch[1].trim();
  // Remove qualquer <style> ou <script> resquicial fora do body que tenha sobrado
  s = s.replace(/<!DOCTYPE[\s\S]*?>/gi, "").replace(/<\/?html[^>]*>/gi, "")
       .replace(/<head[\s\S]*?<\/head>/gi, "").replace(/<\/?body[^>]*>/gi, "").trim();
  return wrapMaterialHTML(title, s);
}

// ─── Clients ──────────────────────────────────────────────────────────────────
// Geração de conteúdo pesado (planos, materiais, HTML) → OpenRouter (mais barato)
function getGpt() { return openrouter; }
const CONTENT_MODEL = OR.pro; // DeepSeek V4 Pro — substitui gpt-4o para conteúdo

/**
 * Gera HTML de material pesado.
 * 1º: Claude Sonnet via OpenRouter (via generateWithGemini — interface mantida)
 * 2º: DeepSeek Pro — fallback
 */
async function generateHeavyMaterial(
  systemPrompt: string,
  maxTokens: number,
  temperature: number,
  sourceContext?: string,
): Promise<string> {
  const t0 = Date.now();
  const userPrompt = "Gere o conteúdo completo agora, seguindo todas as instruções acima. Seja extremamente detalhado e denso.";

  // ── 1º: Claude Sonnet via OpenRouter ─────────────────────────────────────
  try {
    const content = await generateWithGemini(systemPrompt, userPrompt, maxTokens, sourceContext);
    if (content && content.length > 500) {
      console.log(`[material] Claude Sonnet gerou ${content.length} chars em ${Date.now() - t0}ms`);
      return content;
    }
    console.warn("[material] Claude retornou conteúdo muito curto, usando DeepSeek Pro");
  } catch (err: any) {
    console.warn(`[material] Claude falhou (${err?.message ?? err}), usando DeepSeek Pro`);
  }

  // ── 2º: DeepSeek Pro — fallback ──────────────────────────────────────────
  const gen = await getGpt().chat.completions.create({
    model: CONTENT_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
  });
  const content = gen.choices[0]?.message?.content ?? "";
  console.log(`[material] DeepSeek Pro gerou ${content.length} chars em ${Date.now() - t0}ms`);
  return content;
}

// ─── Memory helpers ───────────────────────────────────────────────────────────
export async function loadUserMemories(userId: string): Promise<string> {
  try {
    const [oldMem, newMem] = await Promise.all([
      db.execute(sql`
        SELECT memoria, categoria, importancia FROM tiagao_memory
        WHERE user_id = ${userId}
        ORDER BY importancia DESC, atualizado_at DESC
        LIMIT 8
      `).catch(() => ({ rows: [] })),
      db.execute(sql`
        SELECT content, type, importance FROM tiagao_memories
        WHERE user_id = ${userId} AND is_active = true
        ORDER BY importance DESC, created_at DESC
        LIMIT 10
      `).catch(() => ({ rows: [] })),
    ]);
    const lines: string[] = [];
    (oldMem.rows as any[]).forEach((r: any) =>
      lines.push(`[${r.categoria}|${r.importancia}] ${r.memoria}`));
    (newMem.rows as any[]).forEach((r: any) =>
      lines.push(`[${r.type}|${r.importance}] ${r.content}`));
    if (!lines.length) return "";
    return `\n\n🧠 MEMÓRIA PERSISTENTE (sobre este usuário — use para personalizar):\n${lines.join("\n")}`;
  } catch { return ""; }
}

export async function saveUserMemory(userId: string, memoria: string, categoria: string, importancia: number) {
  try {
    await db.execute(sql`
      INSERT INTO tiagao_memory (user_id, memoria, categoria, importancia)
      VALUES (${userId}, ${memoria}, ${categoria}, ${importancia})
      ON CONFLICT DO NOTHING
    `);
  } catch { /* non-critical */ }
}

// ─── Search user's notebook documents ────────────────────────────────────────
export async function searchUserNotebookDocs(userId: string, query: string): Promise<string> {
  try {
    const stopWords = new Set(["o","a","os","as","um","uma","de","da","do","e","que","em","para","com","por","se","me","te","nos","isso","este","essa","qual","quando","onde","não","sim","mais","mas","ou","é","foi","ser"]);
    const keywords = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)).slice(0, 5);
    if (!keywords.length) return "";
    const ftsQuery = keywords.join(" | ");
    let rows: any[] = [];
    try {
      const res = await db.execute(sql`
        SELECT chunk_text, source_title,
          ts_rank(to_tsvector('portuguese', chunk_text), to_tsquery('portuguese', ${ftsQuery})) AS score
        FROM notebook_embeddings
        WHERE user_id = ${userId}
          AND to_tsvector('portuguese', chunk_text) @@ to_tsquery('portuguese', ${ftsQuery})
        ORDER BY score DESC LIMIT 5
      `);
      rows = res.rows as any[];
    } catch { /* FTS failed */ }
    if (!rows.length) {
      const res = await db.execute(sql`
        SELECT chunk_text, source_title FROM notebook_embeddings
        WHERE user_id = ${userId} AND chunk_text ILIKE ${`%${keywords[0]}%`}
        ORDER BY chunk_index ASC LIMIT 5
      `);
      rows = res.rows as any[];
    }
    if (!rows.length) return "";
    return rows.map((r: any) => `[${r.source_title ?? "Documento"}]: ${r.chunk_text}`).join("\n\n").slice(0, 3000);
  } catch { return ""; }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────
export const TIAGAO_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "salvar_memoria",
      description: "Salva uma observação importante sobre o usuário na memória persistente. Use SEMPRE que aprender algo relevante: objetivos, dificuldades, matérias favoritas, estilo de aprendizado. Chamada silenciosa.",
      parameters: {
        type: "object",
        properties: {
          memoria: { type: "string", description: "O que aprendeu sobre o usuário" },
          categoria: { type: "string", enum: ["objetivo", "dificuldade", "topico", "personalidade", "progresso", "geral"] },
          importancia: { type: "number", description: "1 a 5" },
        },
        required: ["memoria", "categoria", "importancia"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navegar",
      description: "Navega fisicamente para uma tela do StudyAI. Use SOMENTE quando o usuário quer IR para algum lugar — com verbos como 'me leva para', 'abre', 'vai para', 'quero ir ao', 'abrir o'. NUNCA use esta ferramenta quando o usuário perguntar sobre seu desempenho, resultados, estatísticas, progresso ou pedir análise — nesses casos, analise os dados diretamente na resposta sem navegar a lugar algum.",
      parameters: {
        type: "object",
        properties: {
          destino: {
            type: "string",
            enum: ["home", "simulado", "flashcards", "redacao", "cronograma", "aula-ia", "trilha", "dashboard", "sala-estudos", "ranking", "notebook", "mapa-mental", "caderno", "perfil"],
            description: "Destino da navegação",
          },
        },
        required: ["destino"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "abrir_aula_ia",
      description: "Abre a Aula com IA — Tiagão na Lousa — sobre um tópico específico. Use quando o usuário quer uma explicação mais completa ou pede 'me ensina', 'explica mais', 'quero uma aula sobre'.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Tópico da aula (ex: Funções do 1º Grau, Segunda Guerra Mundial)" },
          estilo: { type: "string", enum: ["ENEM", "Vestibular", "Concurso", "Simples"] },
        },
        required: ["topico"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_flashcards",
      description: "Cria e salva um deck de flashcards no sistema. Use quando o usuário pede para criar, gerar ou fazer flashcards sobre um assunto.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Assunto dos flashcards" },
          materia: { type: "string", description: "Matéria" },
          quantidade: { type: "number", description: "Número de flashcards (5 a 12)" },
        },
        required: ["topico", "materia", "quantidade"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "iniciar_simulado",
      description: "Abre o simulado ENEM. Use quando o usuário quer fazer um simulado, testar conhecimentos ou praticar questões.",
      parameters: {
        type: "object",
        properties: {
          materia: { type: "string", description: "Matéria específica (opcional)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_cronograma",
      description: "Abre a tela de criação de cronograma de estudos. Use quando o usuário quer organizar os estudos.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_slides",
      description: "Cria uma apresentação de slides completa sobre qualquer tema. Use quando o usuário pede slides, apresentação, material visual.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Tema da apresentação" },
          materia: { type: "string", description: "Disciplina" },
          quantidade_slides: { type: "number", description: "Número de slides (padrão: 8)" },
        },
        required: ["topico"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_mapa_mental",
      description: "Cria um mapa mental hierárquico sobre um tema. Use quando o usuário pede mapa mental, mapa conceitual ou organização visual de um assunto.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Tema central do mapa mental" },
          materia: { type: "string", description: "Disciplina" },
        },
        required: ["topico"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_infografico",
      description: "Cria um infográfico educacional visual sobre um tema. Use quando o usuário pede infográfico, imagem explicativa, ou material visual sobre um conteúdo.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Tema do infográfico" },
          materia: { type: "string", description: "Disciplina" },
          estilo: { type: "string", enum: ["profissional", "colorido", "minimalista", "cientifico"], description: "Estilo visual" },
        },
        required: ["topico"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_prova",
      description: "Cria uma prova ou lista de exercícios com gabarito. Use quando o usuário pede prova, lista de exercícios, avaliação, atividade.",
      parameters: {
        type: "object",
        properties: {
          assunto: { type: "string", description: "Conteúdo da prova" },
          materia: { type: "string", description: "Disciplina" },
          quantidade: { type: "number", description: "Número de questões (padrão: 5)" },
          tipo: { type: "string", enum: ["multipla_escolha", "dissertativa", "mista"] },
          nivel: { type: "string", enum: ["facil", "medio", "dificil", "enem"] },
        },
        required: ["assunto", "materia"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_plano_estudos",
      description: "Cria um plano de estudos personalizado. Use quando o usuário quer criar um plano, cronograma de revisão ou organização para uma matéria.",
      parameters: {
        type: "object",
        properties: {
          objetivo: { type: "string", description: "O que o usuário quer alcançar" },
          materia: { type: "string", description: "Disciplina principal (opcional)" },
          prazo_dias: { type: "number", description: "Prazo em dias" },
          horas_dia: { type: "number", description: "Horas disponíveis por dia" },
        },
        required: ["objetivo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_resumo",
      description: "Cria um resumo completo e estruturado sobre um tema para estudo. Use quando o usuário pede resumo, síntese, ficha de estudo, ou material de revisão de um conteúdo.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Tema a ser resumido" },
          materia: { type: "string", description: "Disciplina" },
          nivel: { type: "string", enum: ["basico", "intermediario", "avancado", "enem"], description: "Nível de profundidade" },
        },
        required: ["topico", "materia"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_nos_meus_documentos",
      description: "Busca informações nos documentos que o usuário enviou para o Notebook. Use quando o usuário menciona 'no meu material', 'no meu PDF', 'no documento que enviei', 'nos meus arquivos'.",
      parameters: {
        type: "object",
        properties: {
          consulta: { type: "string", description: "O que buscar nos documentos" },
        },
        required: ["consulta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analisar_desempenho_completo",
      description: "Faz uma análise profunda e personalizada do desempenho do aluno com recomendações concretas. Use quando o usuário pergunta 'como estou indo?', 'qual minha situação?', 'o que devo estudar?', 'analisa meu desempenho', 'onde estou fraco?', 'me dá um diagnóstico', ou qualquer pedido de orientação baseada no seu histórico de estudos.",
      parameters: {
        type: "object",
        properties: {
          foco: {
            type: "string",
            enum: ["geral", "materia", "evolucao", "simulados", "flashcards"],
            description: "Aspecto específico a analisar. Padrão: geral",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_agenda_hoje",
      description: "Cria uma agenda de estudos personalizada para hoje com base no perfil do aluno. Use quando o usuário pede 'o que devo estudar hoje?', 'me faz uma agenda', 'por onde começo hoje?', 'me organiza', 'como devo distribuir meu tempo hoje?'.",
      parameters: {
        type: "object",
        properties: {
          horas_disponiveis: { type: "number", description: "Horas disponíveis para estudar hoje (padrão: 2)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "gerar_questao_personalizada",
      description: "Gera uma questão prática estilo ENEM personalizada para o aluno treinar. Use quando o usuário pede 'me dá uma questão', 'me testa', 'quero praticar', 'faz uma pergunta sobre', 'me desafia', 'me dá um exercício'.",
      parameters: {
        type: "object",
        properties: {
          topico: { type: "string", description: "Tópico da questão — se não informado, usa a matéria mais fraca do aluno" },
          materia: { type: "string", description: "Disciplina" },
          nivel: { type: "string", enum: ["facil", "medio", "dificil", "enem"], description: "Nível de dificuldade (padrão: enem)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_email",
      description: "Envia um email para o professor, aluno, responsável ou turma. Use quando o usuário pede para enviar email, mandar mensagem por email, ou comunicar algo por escrito.",
      parameters: {
        type: "object",
        properties: {
          destinatario: { type: "string", description: "Email do destinatário OU 'professor' OU 'turma:NomeDaTurma' OU 'responsavel:NomeAluno'" },
          assunto: { type: "string", description: "Assunto do email" },
          corpo: { type: "string", description: "Corpo do email em texto simples, tom profissional mas acessível" },
        },
        required: ["destinatario", "assunto", "corpo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "enviar_whatsapp",
      description: "Envia mensagem WhatsApp para aluno, turma ou responsável. Use quando o usuário pede para mandar WhatsApp, mensagem, avisar pelo zap, etc.",
      parameters: {
        type: "object",
        properties: {
          destinatario: { type: "string", description: "'turma:NomeDaTurma' OU 'aluno:NomeAluno' OU 'responsavel:NomeAluno' OU número direto" },
          mensagem: { type: "string", description: "Texto da mensagem (curto, informal, direto)" },
          tipo: { type: "string", enum: ["aviso", "lembrete", "plano_estudos", "motivacional", "resultado"], description: "Tipo da mensagem para template" },
        },
        required: ["destinatario", "mensagem"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "corrigir_redacao",
      description: "Corrige uma redação do aluno com nota detalhada por competência ENEM. Use quando o aluno envia texto para correção ou pede feedback sobre redação.",
      parameters: {
        type: "object",
        properties: {
          texto_redacao: { type: "string", description: "O texto da redação do aluno" },
          tema: { type: "string", description: "O tema proposto (se informado)" },
          tipo: { type: "string", enum: ["enem", "vestibular", "concurso", "livre"], description: "Tipo de avaliação" },
        },
        required: ["texto_redacao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "exportar_pdf",
      description: "Exporta o último material criado (slides, resumo, plano, prova) como PDF para download. Use quando o usuário pede para baixar, exportar, salvar em PDF.",
      parameters: {
        type: "object",
        properties: {
          tipo_material: { type: "string", enum: ["slides", "resumo", "plano_estudos", "prova", "mapa_mental", "infografico"], description: "Tipo do material a exportar" },
          titulo: { type: "string", description: "Título do material (para localizar)" },
        },
        required: ["tipo_material"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "agendar_lembrete",
      description: "Agenda um lembrete futuro para o aluno. Use quando o aluno pede para ser lembrado de algo: revisar, estudar, fazer prova, entregar trabalho.",
      parameters: {
        type: "object",
        properties: {
          mensagem: { type: "string", description: "O que lembrar" },
          quando: { type: "string", description: "Quando lembrar: 'amanha', 'em 2 dias', 'segunda', 'antes da prova', formato livre" },
          prioridade: { type: "string", enum: ["baixa", "media", "alta", "urgente"] },
        },
        required: ["mensagem", "quando"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analisar_humor_aluno",
      description: "Ferramenta INTERNA (silenciosa). Analisa o estado emocional do aluno com base na mensagem e ajusta o tom da resposta. Chame SEMPRE no início de cada interação, ANTES de responder.",
      parameters: {
        type: "object",
        properties: {
          mensagem_aluno: { type: "string", description: "A última mensagem do aluno" },
          sinais_detectados: { type: "string", enum: ["ansiedade", "frustração", "urgência", "euforia", "desmotivação", "confusão", "neutro", "curiosidade"] },
          tom_recomendado: { type: "string", description: "Tom que o Tiagão deve usar na resposta" },
        },
        required: ["mensagem_aluno", "sinais_detectados", "tom_recomendado"],
      },
    },
  },
  // ── Memória rica (Prompt 12) ─────────────────────────────────────────────
  {
    type: "function",
    function: {
      name: "salvar_memoria_rica",
      description: "Salva memória tipada sobre o aluno no sistema de memória evolutiva. Use para fatos, conquistas, dificuldades, promessas, metas e emoções. Mais poderoso que salvar_memoria — prefira esta.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["fact", "preference", "struggle", "achievement", "promise", "emotion", "goal", "routine"], description: "Tipo da memória" },
          conteudo: { type: "string", description: "O que aprendeu ou aconteceu" },
          importancia: { type: "number", description: "1 a 5 — 5 para prova amanhã, conquistas, promessas" },
          contexto: { type: "string", description: "Contexto breve opcional" },
        },
        required: ["tipo", "conteudo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "atualizar_perfil",
      description: "Atualiza o perfil do aluno com informação específica: nome, série, escola, cidade, matérias fracas/fortes, hobbies, time de futebol, etc. Use quando o aluno revelar dados biográficos.",
      parameters: {
        type: "object",
        properties: {
          campo: { type: "string", enum: ["nickname", "age", "grade", "school", "city", "learningStyle", "interests", "weakSubjects", "strongSubjects", "goals", "favoriteTeam", "hobbies", "humorPreference"], description: "Campo a atualizar" },
          valor: { type: "string", description: "Valor. Para listas, separe com vírgula." },
        },
        required: ["campo", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "registrar_data_importante",
      description: "Registra uma data importante do aluno: prova, vestibular, ENEM, apresentação, prazo. Use SEMPRE que o aluno mencionar uma data futura relevante.",
      parameters: {
        type: "object",
        properties: {
          data: { type: "string", description: "Data no formato YYYY-MM-DD ou DD/MM/YYYY" },
          descricao: { type: "string", description: "O que acontece nesta data" },
          materia: { type: "string", description: "Matéria relacionada, se houver" },
        },
        required: ["data", "descricao"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_historico_aluno",
      description: "Busca na base de conhecimento pessoal do aluno: materiais gerados, conteúdos estudados, explicações passadas. Use quando o aluno perguntar sobre algo que já estudou.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "O que buscar no histórico" },
          materia: { type: "string", description: "Matéria para filtrar, opcional" },
        },
        required: ["query"],
      },
    },
  },
  // ⚠️ DESATIVADO TEMPORARIAMENTE — plano MiniMax atual não suporta Hailuo-02 e
  // tem RPM muito baixo. Reativar após upgrade do plano OU migração pra outro
  // provider (Replicate/fal.ai). Código inteiro preservado abaixo no executor.
  // {
  //   type: "function",
  //   function: {
  //     name: "criar_video",
  //     description: "Gera um vídeo educacional realista narrado sobre um tema...",
  //     parameters: { type: "object", properties: { topico: { type: "string" }, materia: { type: "string" }, formato: { type: "string", enum: ["horizontal", "shorts"] }, num_cenas: { type: "number" } }, required: ["topico", "formato"] },
  //   },
  // },
];

// ─── Daily video limit ───────────────────────────────────────────────────────
const DAILY_VIDEO_LIMIT_FREE = 1;
const DAILY_VIDEO_LIMIT_PREMIUM = 3;

async function checkVideoDailyLimit(userId: string): Promise<{ ok: boolean; used: number; limit: number }> {
  const r = await db.execute<{ count: string; is_premium: boolean }>(sql`
    SELECT
      (SELECT COUNT(*) FROM tiagao_video_jobs
        WHERE user_id = ${userId}
          AND status = 'completed'
          AND created_at > NOW() - INTERVAL '24 hours') AS count,
      COALESCE((SELECT stripe_subscription_status IN ('active','trialing')
        FROM users WHERE id = ${userId} LIMIT 1), false) AS is_premium
  `);
  const row = r.rows[0] as any;
  const used = Number(row?.count ?? 0);
  const limit = row?.is_premium ? DAILY_VIDEO_LIMIT_PREMIUM : DAILY_VIDEO_LIMIT_FREE;
  return { ok: used < limit, used, limit };
}

// ─── Tool executor ────────────────────────────────────────────────────────────
export interface ToolResult {
  result: string;
  action?: Record<string, any>;
}

// Fast HTML generator for voice mode — gpt-4o-mini + 1500 tokens (< 10s)
async function generateMaterialFast(
  title: string,
  materia: string | undefined,
  type: "slides" | "resumo" | "infografico"
): Promise<string> {
  const typeHint = {
    slides: "um material educacional com 3 seções de conteúdo, 1 quiz e callouts coloridos",
    resumo: "um resumo de estudo com introdução, 3 seções temáticas e pontos-chave finais",
    infografico: "um infográfico de 1 página com header impactante, 4 blocos visuais e dados em destaque",
  }[type];
  const prompt = `${MATERIAL_HTML_INSTRUCTIONS}

Crie ${typeHint} sobre "${title}" ${materia ? "(" + materia + ")" : ""} em HTML.
Retorne APENAS o conteúdo interno do <body>. Sem <!DOCTYPE>, <html>, <head>, <style>, <body>.
Comece direto pela primeira tag visual.`;
  const gen = await getGpt().chat.completions.create({
    model: OR.fast,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: "Gere agora." },
    ],
    max_tokens: 1800,
    temperature: 0.6,
  });
  return gen.choices[0]?.message?.content ?? "";
}

export async function executeTiagaoTool(
  toolName: string,
  args: Record<string, any>,
  userId: string | undefined,
  voiceMode = false,
): Promise<ToolResult> {
  const gpt = getGpt();

  const DEST_MAP: Record<string, string> = {
    "home": "/app", "simulado": "/simulado-enem", "flashcards": "/app",
    "redacao": "/redacao", "cronograma": "/cronograma", "aula-ia": "/aula-ia",
    "trilha": "/trilha", "dashboard": "/dashboard", "sala-estudos": "/sala-estudos",
    "ranking": "/ranking", "notebook": "/notebook", "caderno": "/notebook",
    "mapa-mental": "/mapa-mental", "perfil": "/perfil",
  };

  switch (toolName) {
    // ── Memória ──────────────────────────────────────────────────────────────
    case "salvar_memoria":
      if (userId) await saveUserMemory(userId, args.memoria, args.categoria, args.importancia ?? 3);
      return { result: "Memória salva." };

    // ── Navegação ────────────────────────────────────────────────────────────
    case "navegar":
      return {
        result: `Navegando para ${args.destino}`,
        action: { type: "navegar", path: DEST_MAP[args.destino] ?? "/app", label: args.destino },
      };

    case "abrir_aula_ia":
      return {
        result: `Abrindo aula sobre "${args.topico}"`,
        action: { type: "abrir_aula_ia", topico: args.topico, estilo: args.estilo ?? "ENEM" },
      };

    case "iniciar_simulado":
      return {
        result: "Abrindo simulado",
        action: { type: "navegar", path: "/simulado-enem", label: "simulado" },
      };

    case "criar_cronograma":
      return {
        result: "Abrindo cronograma",
        action: { type: "navegar", path: "/cronograma", label: "cronograma" },
      };

    // ── Flashcards ───────────────────────────────────────────────────────────
    case "criar_flashcards": {
      if (!userId) return { result: "Login necessário para criar flashcards." };
      try {
        const qtd = Math.min(Math.max(args.quantidade ?? 10, 5), 15);
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um professor universitário especialista em ${args.materia ?? "educação"} com domínio completo do conteúdo cobrado no ENEM, FUVEST, UNICAMP, UNB e principais vestibulares brasileiros.

Crie ${qtd} flashcards de alta qualidade sobre "${args.topico}" (${args.materia ?? "Geral"}).

PADRÃO EXIGIDO — cada flashcard deve:
- Pergunta: direta, específica, que testa compreensão real (não memorização vazia). Pode incluir situação-problema, exemplo ou contexto real.
- Resposta: completa, precisa, com explicação do porquê. Entre 2 e 5 linhas. Inclua exemplos concretos quando ajudar.
- Variar os tipos: definição conceitual, aplicação prática, comparação entre conceitos, erro comum, fórmula/lei/regra, implicação real.

Retorne APENAS este JSON:
{"flashcards":[{"pergunta":"...","resposta":"..."}]}`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 3000,
          temperature: 0.6,
        });
        const raw = JSON.parse(gen.choices[0].message.content ?? "{}");
        const cards: { pergunta: string; resposta: string }[] = raw.flashcards ?? raw.cards ?? raw.perguntas ?? Object.values(raw)[0] ?? [];
        if (cards.length > 0) {
          for (const c of cards.slice(0, 12)) {
            await db.execute(sql`
              INSERT INTO flashcard_reviews (user_id, materia, pergunta, resposta)
              VALUES (${userId}, ${args.materia ?? "Geral"}, ${c.pergunta}, ${c.resposta})
            `);
          }
          return {
            result: `${cards.length} flashcards criados sobre "${args.topico}"!`,
            action: { type: "flashcards_criados", quantidade: cards.length, topico: args.topico, materia: args.materia },
          };
        }
        return { result: "Não consegui gerar os flashcards. Tente novamente." };
      } catch (err) {
        console.error("[tool:criar_flashcards]", err);
        return { result: "Erro ao criar flashcards." };
      }
    }

    // ── Slides ───────────────────────────────────────────────────────────────
    case "criar_slides": {
      if (!userId) return { result: "Login necessário para criar slides." };
      try {
        // Voice mode: fast path (gpt-4o-mini, 1800 tokens, ~8s) para não travar a resposta
        let rawContent: string;
        if (voiceMode) {
          rawContent = await generateMaterialFast(args.topico, args.materia, "slides");
        } else {
          const qtd = Math.min(Math.max(args.quantidade_slides ?? 10, 6), 16);
          const topico = args.topico as string;
          const materia = args.materia as string | undefined;

          const slidesPrompt = `Você é um professor universitário especialista em ${materia ?? "educação"}, criando um LIVRO DIGITAL INTERATIVO em HTML para alunos do ENEM/vestibular.

${MATERIAL_COMPONENT_GUIDE}

═══════════════════════════════════════════════════
TEMA: "${topico}" ${materia ? `(${materia})` : ""}
QUANTIDADE DE SEÇÕES: ${qtd} seções de conteúdo (além da capa)
═══════════════════════════════════════════════════

MISSÃO: gerar um material DENSO, COMPLETO e PROFISSIONAL — não uma introdução vaga. Pesquise mentalmente todo o conhecimento sobre "${topico}" e distribua em profundidade real.

EXIGÊNCIAS DE CONTEÚDO (OBRIGATÓRIAS):

1. CAPA (hero): título impactante, subtítulo descritivo, 3 hero-stats com números reais do tema, chips com os tópicos abordados, botão "Começar →"

2. SEÇÃO 1 — CONTEXTO HISTÓRICO/CONCEITUAL:
   - Origem e evolução histórica do tema (datas, personagens, fatos reais)
   - Definição técnica precisa (não vaga)
   - Imagem Unsplash relevante com legenda contextualizada
   - Pelo menos 1 callout azul com fato importante a memorizar

3. SEÇÕES 2 a ${Math.min(qtd, 4)} — CONTEÚDO PRINCIPAL (uma seção por grande eixo temático):
   Para CADA seção:
   - Cards-grid com 3-5 conceitos-chave específicos (não genéricos) — cada card com emoji temático e descrição de 2-3 frases
   - Texto body com explicação aprofundada (mínimo 3 parágrafos densos, com destaque em termos-chave)
   - Fórmulas/leis/regras em formula-box (se aplicável ao tema)
   - Callout de cor diferente (verde, laranja, roxo, vermelho, rosa)
   - 1 imagem Unsplash com legenda explicando a relação com o conteúdo

4. SEÇÃO FÓRMULAS/DADOS QUANTITATIVOS (se o tema tiver dados numéricos):
   - Tabela comparativa (coef-table) com dados reais do tema
   - Gráfico SVG inline (barras ou linha) com dados reais/representativos

5. SEÇÃO SIMULADOR (se o tema permitir — matemática, física, química, biologia):
   - Simulador canvas interativo com sliders funcionais e JavaScript inline

6. SEÇÃO EXERCÍCIOS (ENEM/vestibular):
   - Mínimo 2 exercícios estilo ENEM com enunciado real/realista, 5 alternativas (A-E), resolução step-by-step expansível
   - Mínimo 2 quizzes interativos com 4 opções e feedback explicativo

7. SEÇÃO FINAL — SÍNTESE E REVISÃO:
   - Cards-grid com os 5-6 pontos-chave do tema para memorizar
   - Callout laranja: "Dica ENEM — como esse tema cai na prova" (com exemplos de como é cobrado)
   - Callout verde: "Resumo final" com bullet points do que não pode esquecer

PADRÃO MÍNIMO POR SEÇÃO:
- Mínimo 400 palavras de conteúdo textual real por seção (não conte HTML)
- Mínimo 2 elementos visuais (card-grid, callout, fórmula, tabela, quiz, exercício, figura)
- Sidebar atualizada com link para cada seção

⚠️ FORMATO DE SAÍDA (CRÍTICO):
- Retorne APENAS o conteúdo INTERNO do <body> começando por <div class="progress-bar" id="progressBar"></div>
- NÃO inclua <!DOCTYPE>, <html>, <head>, <style>, <body> tags
- NÃO use blocos de código markdown (\`\`\`html)
- O CSS e JS (responder, toggleSol, progress bar) são INJETADOS AUTOMATICAMENTE
- NUNCA use cores inline — sempre var(--accent), var(--verde), var(--azul) etc.
- IDs de quiz únicos por questão: q1, q2, q3... | IDs de solução: sol1, sol2...`;

          rawContent = await generateHeavyMaterial(slidesPrompt, 16000, 0.65);
        }
        const htmlContent = buildMaterialHTML(args.topico, rawContent);

        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'material_html', ${args.topico}, ${JSON.stringify({ html: htmlContent, topico: args.topico, materia: args.materia })}::jsonb)
        `).catch(() => null);
        // Auto-feed knowledge base
        storeKnowledge({
          userId, type: "material", title: args.topico,
          content: rawContent.replace(/<[^>]+>/g, " ").trim().slice(0, 3000),
          source: "tiagao", subject: args.materia, topics: [args.topico], qualityScore: 0.85,
        }).catch(() => {});
        return {
          result: `Material profissional sobre "${args.topico}" criado! Abrindo o livro digital.`,
          action: { type: "criar_slides", html: htmlContent, titulo: args.topico, formato: "html_completo" },
        };
      } catch (err) {
        console.error("[tool:criar_slides]", err);
        return { result: "Erro ao criar slides." };
      }
    }

    // ── Mapa Mental ───────────────────────────────────────────────────────────
    case "criar_mapa_mental": {
      if (!userId) return { result: "Login necessário para criar mapa mental." };
      try {
        // Voice mode: menos categorias e tokens para resposta rápida (~6s)
        const mapaTokens = voiceMode ? 1500 : 3500;
        const mapaModel = voiceMode ? OR.fast : CONTENT_MODEL;
        const mapaQuality = voiceMode
          ? "- Mínimo 3 categorias\n- Mínimo 3 tópicos por categoria\n- Mínimo 2 subtópicos por tópico com breve explicação"
          : "- Mínimo 5 categorias (grandes eixos temáticos, não genéricos)\n- Mínimo 4 tópicos por categoria (conceitos específicos e precisos)\n- Mínimo 3 subtópicos por tópico (com detail explicativo de 1-2 frases)\n- Os \"detail\" devem ser informativos e completos — NUNCA apenas nomear, sempre EXPLICAR com exemplo ou dado\n- Cubra: fundamentos teóricos, aplicações práticas, fórmulas/leis, contexto histórico, como cai no ENEM, erros comuns\n- Linguagem precisa e técnica — nível universitário\n- Inclua conexões entre categorias quando relevante (ex: \"Relaciona-se com [outra categoria]\")";
        const gen = await gpt.chat.completions.create({
          model: mapaModel,
          messages: [
            {
              role: "system",
              content: `Você é um professor especialista com visão sistêmica do conteúdo. Crie um mapa mental completo e profissional sobre "${args.topico}" ${args.materia ? "(" + args.materia + ")" : ""}.

PADRÃO EXIGIDO:
${mapaQuality}

Retorne APENAS este JSON:
{
  "subject": "Tema central (max 4 palavras)",
  "categories": [
    {
      "name": "Grande eixo temático (max 4 palavras)",
      "topics": [
        {
          "name": "Conceito específico (max 5 palavras)",
          "subtopics": [
            { "name": "Subtópico (max 6 palavras)", "detail": "Explicação completa com exemplo ou dado" }
          ]
        }
      ]
    }
  ]
}
APENAS JSON.`,
            },
            { role: "user", content: "Gere o mapa mental agora." },
          ],
          response_format: { type: "json_object" },
          max_tokens: mapaTokens,
          temperature: 0.5,
        });
        const mapaData = JSON.parse(gen.choices[0].message.content ?? "{}");
        if (mapaData.topics && !mapaData.categories) {
          mapaData.categories = [{ name: mapaData.subject, topics: mapaData.topics }];
        }
        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'mapa_mental', ${args.topico}, ${JSON.stringify(mapaData)}::jsonb)
        `).catch(() => null);
        return {
          result: `Mapa mental sobre "${args.topico}" criado com ${mapaData.categories?.length ?? 3} categorias!`,
          action: { type: "criar_mapa_mental", mapa: mapaData, topico: args.topico, materia: args.materia },
        };
      } catch (err) {
        console.error("[tool:criar_mapa_mental]", err);
        return { result: "Erro ao criar mapa mental." };
      }
    }

    // ── Infográfico ───────────────────────────────────────────────────────────
    case "criar_infografico": {
      if (!userId) return { result: "Login necessário para criar infográfico." };
      try {
        // Voice mode: fast path (gpt-4o-mini, 1800 tokens, ~8s)
        let rawContent: string;
        if (voiceMode) {
          rawContent = await generateMaterialFast(args.topico, args.materia, "infografico");
        } else {
          const infoPrompt = `${MATERIAL_HTML_INSTRUCTIONS}

Crie um INFOGRÁFICO EDUCACIONAL em formato HTML sobre "${args.topico}" ${args.materia ? "(" + args.materia + ")" : ""}.

ESTE NÃO É UM MATERIAL LONGO — é um infográfico de 1 página visual e denso.

ESTRUTURA OBRIGATÓRIA PARA INFOGRÁFICO:
- Layout em coluna central (max-width: 720px, centralizado)
- NÃO usar sidebar navegável (é 1 página só)
- Header grande com título em gradient e subtítulo
- Seções visuais com ícones grandes (emoji) e dados em destaque
- Números em tamanho grande e colorido (font-size: 48px+)
- Cards em grid 2x2 ou 3x1 para conceitos-chave
- Timeline vertical para processos/sequências
- Comparativo visual (vs, antes/depois) quando relevante
- Callout de destaque com "VOCÊ SABIA?"
- Fórmula principal em .formula-box (se aplicável)
- Footer com fontes/referências e crédito StudyAI

USE CORES VIBRANTES e contrastantes. Cada seção deve ter uma cor dominante diferente.

⚠️ FORMATO DE SAÍDA (CRÍTICO):
- Retorne APENAS o conteúdo INTERNO do <body> (sem <!DOCTYPE>, <html>, <head>, <style>, <script>, <body>).
- NÃO use cercas markdown \`\`\`html ... \`\`\`.
- O CSS premium é injetado automaticamente.
- Comece direto pela primeira tag visível.`;
          rawContent = await generateHeavyMaterial(infoPrompt, 4000, 0.6);
        }
        const htmlContent = buildMaterialHTML(args.topico, rawContent);
        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'material_html', ${args.topico}, ${JSON.stringify({ html: htmlContent, topico: args.topico, materia: args.materia })}::jsonb)
        `).catch(() => null);
        return {
          result: `Infográfico sobre "${args.topico}" criado!`,
          action: {
            type: "criar_infografico",
            html: htmlContent,
            topico: args.topico,
            materia: args.materia ?? "Geral",
            formato: "html_completo",
          },
        };
      } catch (err) {
        console.error("[tool:criar_infografico]", err);
        return { result: "Erro ao criar infográfico." };
      }
    }

    // ── Resumo ────────────────────────────────────────────────────────────────
    case "criar_resumo": {
      try {
        const nivel = args.nivel ?? "intermediario";
        // Voice mode: fast path (gpt-4o-mini, 1800 tokens, ~8s)
        let rawContent: string;
        if (voiceMode) {
          rawContent = await generateMaterialFast(args.topico, args.materia, "resumo");
        } else {
          const resumoPrompt = `${MATERIAL_HTML_INSTRUCTIONS}

Crie um RESUMO DE ESTUDO PROFISSIONAL em formato de livro digital HTML sobre "${args.topico}" (${args.materia ?? "Geral"}) para nível ${nivel}.

ESTRUTURA OBRIGATÓRIA PARA RESUMO:
1. Sidebar com navegação (6+ seções)
2. Introdução: contextualização histórica/científica + onde cai em provas
3. Seções temáticas com explicação DENSA (mínimo 3 parágrafos por seção)
4. Cards com definições-chave
5. Callout .roxo com "CUIDADO NO ENEM" — pegadinhas comuns
6. Callout .verde com conceitos fundamentais
7. Fórmulas em .formula-box (se aplicável)
8. 2+ quizzes interativos para autoavaliação
9. 2+ exercícios com resolução step-by-step
10. Tabela de "Erros comuns vs Correto"
11. Seção final: Pontos-chave + Palavras-chave + Dica ENEM

Conteúdo nível vestibular. Profundidade real — sem superficialidade.

⚠️ FORMATO DE SAÍDA (CRÍTICO):
- Retorne APENAS o conteúdo INTERNO do <body> (sem <!DOCTYPE>, <html>, <head>, <style>, <script>, <body>).
- NÃO use cercas markdown \`\`\`html ... \`\`\`.
- O CSS premium e scripts (responder/toggleSol/progress) são injetados automaticamente.
- Comece direto por <div class="progress-bar" id="progressBar"></div> ou <nav class="sidebar">.`;
          rawContent = await generateHeavyMaterial(resumoPrompt, 8000, 0.5);
        }
        const htmlContent = buildMaterialHTML("Resumo: " + args.topico, rawContent);
        if (userId) {
          await db.execute(sql`
            INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
            VALUES (${userId}, 0, 'material_html', ${"Resumo: " + args.topico}, ${JSON.stringify({ html: htmlContent, topico: args.topico, materia: args.materia })}::jsonb)
          `).catch(() => null);
          // Auto-feed knowledge base
          storeKnowledge({
            userId, type: "summary", title: "Resumo: " + args.topico,
            content: rawContent.replace(/<[^>]+>/g, " ").trim().slice(0, 3000),
            source: "tiagao", subject: args.materia, topics: [args.topico], qualityScore: 0.8,
          }).catch(() => {});
        }
        return {
          result: `Resumo profissional de "${args.topico}" criado! Abrindo o livro digital.`,
          action: { type: "criar_resumo", html: htmlContent, topico: args.topico, materia: args.materia, formato: "html_completo" },
        };
      } catch (err) {
        console.error("[tool:criar_resumo]", err);
        return { result: "Erro ao criar resumo." };
      }
    }

    // ── Prova ────────────────────────────────────────────────────────────────
    case "criar_prova": {
      if (!userId) return { result: "Login necessário para criar prova." };
      try {
        const qtd = Math.min(Math.max(args.quantidade ?? 8, 5), 15);
        const tipo = args.tipo ?? "multipla_escolha";
        const nivel = args.nivel ?? "medio";
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um elaborador de provas de alto nível, com experiência em ENEM, FUVEST, UNICAMP, CESPE, FGV e demais bancas brasileiras.

Crie uma prova profissional de ${qtd} questões sobre "${args.assunto}" (${args.materia ?? "Geral"}).
Tipo: ${tipo === "multipla_escolha" ? "múltipla escolha (A, B, C, D, E) — padrão ENEM" : tipo === "dissertativa" ? "dissertativas — critérios ENEM/FUVEST" : "mista"}.
Nível: ${nivel === "facil" ? "básico / Ensino Fundamental II" : nivel === "medio" ? "médio / pré-vestibular ENEM" : "avançado / vestibulares de alta concorrência"}.

PADRÃO EXIGIDO:
- Enunciados: contextualizados, com situação-problema real, textos motivadores quando adequado
- Alternativas (múltipla escolha): plausíveis, sem pegadinhas cruéis — que testem raciocínio real
- Resposta correta: inequívoca
- Explicação: detalhada — explica o porquê da correta E por que as outras são erradas
- Distribuição: variação de dificuldade (30% fácil, 50% médio, 20% difícil)
- Cobrir diferentes aspectos do tema (não repetir o mesmo conceito)

QUALIDADE EXTRA EXIGIDA:
- Cada enunciado deve ter MÍNIMO 3 linhas de contextualização (situação-problema, texto motivador, dado real)
- Alternativas devem ser TODAS plausíveis — nenhuma obviamente errada
- Explicação deve ter MÍNIMO 4 linhas — explique o raciocínio completo, cite leis/teoremas, explique por que CADA alternativa errada está errada
- Inclua pelo menos 1 questão com gráfico descrito textualmente (ex: "O gráfico abaixo representa...")
- Inclua pelo menos 1 questão interdisciplinar
- Varie os tipos de habilidade: memória, interpretação, cálculo, análise crítica, aplicação

Retorne APENAS este JSON:
{
  "titulo": "Avaliação: [assunto]",
  "materia": "${args.materia ?? "Geral"}",
  "nivel": "${nivel}",
  "tempo_minutos": number,
  "instrucoes": "orientações para o aluno",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "Enunciado completo e contextualizado",
      "tipo": "multipla_escolha",
      "alternativas": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
      "resposta_correta": "A",
      "explicacao": "Explicação detalhada da resposta correta e análise das incorretas"
    }
  ]
}
Para dissertativas: omita alternativas, inclua "criterios_avaliacao": ["critério 1", "critério 2"]. APENAS JSON.`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 5000,
          temperature: 0.65,
        });
        const provaData = JSON.parse(gen.choices[0].message.content ?? "{}");
        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'prova', ${provaData.titulo ?? "Prova de " + args.assunto}, ${JSON.stringify(provaData)}::jsonb)
        `).catch(() => null);
        return {
          result: `Prova de ${args.materia} criada com ${provaData.questoes?.length ?? qtd} questões sobre "${args.assunto}"!`,
          action: { type: "criar_prova", prova: provaData, titulo: provaData.titulo },
        };
      } catch (err) {
        console.error("[tool:criar_prova]", err);
        return { result: "Erro ao criar prova." };
      }
    }

    // ── Plano de estudos ──────────────────────────────────────────────────────
    case "criar_plano_estudos": {
      if (!userId) return { result: "Login necessário para criar plano." };
      try {
        const prazo = args.prazo_dias ?? 30;
        const horas = args.horas_dia ?? 2;
        const semanas = Math.ceil(prazo / 7);
        const titulo = `Plano de Estudos: ${args.objetivo}`;
        const planoPrompt = `${MATERIAL_HTML_INSTRUCTIONS}

Crie um PLANO DE ESTUDOS COMPLETO em formato HTML sobre: "${args.objetivo}"${args.materia ? " — Foco em " + args.materia : ""}.

Parâmetros: ${prazo} dias | ${horas}h por dia | ${semanas} semanas.

ESTRUTURA OBRIGATÓRIA PARA PLANO DE ESTUDOS HTML:
- Header com título do plano, objetivo, total de horas e prazo
- Sidebar com semanas navegáveis (JavaScript inline para mostrar/ocultar seções)
- Seção "Metodologia" com callout sobre a abordagem pedagógica
- Cards por semana com: tema central, tópicos específicos, atividades (teoria/exercícios/revisão), meta semanal
- Timeline visual com ícones por tipo de atividade (📖 teoria, ✏️ exercícios, 🔄 revisão, 🧪 simulado)
- Tabela de distribuição de horas por matéria/área
- Checkboxes interativos (JavaScript inline) para marcar atividades como feitas
- Seção "Técnicas de Estudo" com cards explicativos (Pomodoro, espaçamento, retrieval practice)
- Cronograma diário sugerido
- Seção final "Meta do Plano" em callout de destaque verde
- Footer com dicas gerais acionáveis

USE UMA COR DOMINANTE DIFERENTE por semana. Progressão: fundamentos → intermediário → avançado → revisão.

⚠️ FORMATO DE SAÍDA (CRÍTICO):
- Retorne APENAS o conteúdo INTERNO do <body> (sem <!DOCTYPE>, <html>, <head>, <style>, <script>, <body>).
- NÃO use cercas markdown \`\`\`html ... \`\`\`.
- O CSS premium e scripts são injetados automaticamente.
- Comece direto pela primeira tag visível.`;
        const rawContent = await generateHeavyMaterial(planoPrompt, 5000, 0.6);
        const htmlContent = buildMaterialHTML(titulo, rawContent);
        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'material_html', ${titulo}, ${JSON.stringify({ html: htmlContent, topico: args.objetivo, materia: args.materia })}::jsonb)
        `).catch(() => null);
        return {
          result: `Plano de estudos "${titulo}" criado! ${semanas} semanas, ${horas}h/dia.`,
          action: { type: "criar_plano_estudos", html: htmlContent, titulo, formato: "html_completo" },
        };
      } catch (err) {
        console.error("[tool:criar_plano_estudos]", err);
        return { result: "Erro ao criar plano de estudos." };
      }
    }

    // ── Busca documentos ──────────────────────────────────────────────────────
    case "buscar_nos_meus_documentos": {
      if (!userId) return { result: "Login necessário para buscar documentos." };
      try {
        const resultText = await searchUserNotebookDocs(userId, args.consulta ?? "");
        if (!resultText) {
          return {
            result: "Não encontrei nada nos seus documentos sobre esse assunto. Você tem documentos no Notebook?",
            action: { type: "info", message: "Nenhum documento encontrado" },
          };
        }
        return {
          result: `Encontrei nos seus documentos:\n\n${resultText}`,
          action: { type: "busca_docs", conteudo: resultText.slice(0, 500) },
        };
      } catch {
        return { result: "Erro ao buscar nos seus documentos." };
      }
    }

    // ── Análise de desempenho completa ────────────────────────────────────────
    case "analisar_desempenho_completo": {
      if (!userId) return { result: "Login necessário para análise de desempenho." };
      try {
        const rows = await db.execute<any>(sql`
          SELECT
            sr.materia,
            COUNT(*)::int AS total_simulados,
            ROUND(AVG(sr.score::float / NULLIF(sr.total::float, 0) * 100))::int AS avg_pct,
            ROUND(AVG(CASE WHEN sr.created_at > NOW() - INTERVAL '14 days'
              THEN sr.score::float / NULLIF(sr.total::float, 0) * 100 END))::int AS recent_avg,
            ROUND(AVG(CASE WHEN sr.created_at <= NOW() - INTERVAL '14 days'
              THEN sr.score::float / NULLIF(sr.total::float, 0) * 100 END))::int AS old_avg,
            MAX(sr.created_at) AS last_date
          FROM simulado_results sr
          WHERE sr.user_id = ${userId}
          GROUP BY sr.materia
          ORDER BY avg_pct ASC
        `).catch(() => ({ rows: [] }));

        const fcRows = await db.execute<any>(sql`
          SELECT materia,
            COUNT(*)::int AS sessoes,
            ROUND(AVG(known::float / NULLIF(total_cards::float, 0) * 100))::int AS fc_avg
          FROM flashcard_sessions
          WHERE user_id = ${userId}
          GROUP BY materia
        `).catch(() => ({ rows: [] }));

        const subjectData = (rows.rows as any[]).map(r => ({
          materia: r.materia,
          totalSimulados: r.total_simulados,
          avgPct: r.avg_pct ?? 0,
          recentAvg: r.recent_avg,
          oldAvg: r.old_avg,
          trend: r.recent_avg && r.old_avg
            ? (r.recent_avg > r.old_avg + 5 ? "melhorando" : r.recent_avg < r.old_avg - 5 ? "piorando" : "estável")
            : "sem dados suficientes",
          lastDate: r.last_date,
        }));

        const fcData = (fcRows.rows as any[]).map(r => ({
          materia: r.materia,
          sessoes: r.sessoes,
          fcAvg: r.fc_avg ?? 0,
        }));

        if (subjectData.length === 0 && fcData.length === 0) {
          return {
            result: "O aluno ainda não tem dados de desempenho registrados — não fez simulados nem sessões de flashcard. Encoraje-o a começar com um simulado rápido ou uma sessão de flashcards para ter dados reais.",
          };
        }

        const weak = subjectData.filter(s => s.avgPct < 60).sort((a, b) => a.avgPct - b.avgPct);
        const strong = subjectData.filter(s => s.avgPct >= 75);
        const improving = subjectData.filter(s => s.trend === "melhorando");
        const declining = subjectData.filter(s => s.trend === "piorando");

        const analysis = [
          `ANÁLISE DE DESEMPENHO — ${subjectData.length} matérias avaliadas:`,
          weak.length > 0 ? `PONTOS CRÍTICOS (abaixo de 60%): ${weak.map(s => `${s.materia} ${s.avgPct}%${s.trend !== "sem dados suficientes" ? " [" + s.trend + "]" : ""}`).join(", ")}` : "Nenhuma matéria abaixo de 60%.",
          strong.length > 0 ? `PONTOS FORTES (acima de 75%): ${strong.map(s => `${s.materia} ${s.avgPct}%`).join(", ")}` : "",
          improving.length > 0 ? `MELHORANDO: ${improving.map(s => `${s.materia} (${s.oldAvg}% → ${s.recentAvg}%)`).join(", ")}` : "",
          declining.length > 0 ? `EM QUEDA: ${declining.map(s => `${s.materia} (${s.oldAvg}% → ${s.recentAvg}%)`).join(", ")}` : "",
          fcData.length > 0 ? `FLASHCARDS: ${fcData.map(f => `${f.materia} ${f.sessoes} sessões — ${f.fcAvg}% acerto`).join(", ")}` : "",
          `RECOMENDAÇÃO PRIORITÁRIA: ${weak.length > 0 ? "Foco imediato em " + weak[0].materia + " (" + weak[0].avgPct + "% — maior risco para o ENEM)" : "Mantenha a consistência e aprofunde nos pontos fortes"}`,
          `PRÓXIMO PASSO CONCRETO: ${weak.length > 0 ? "Fazer simulado de " + weak[0].materia + " hoje, revisar erros e criar flashcards dos pontos que errou" : "Diversifique para matérias que ainda não foram avaliadas"}`,
        ].filter(Boolean).join("\n");

        return { result: analysis };
      } catch {
        return { result: "Erro ao buscar dados de desempenho. Use os dados já disponíveis no contexto para responder." };
      }
    }

    // ── Agenda personalizada para hoje ───────────────────────────────────────
    case "criar_agenda_hoje": {
      try {
        const horas = args.horas_disponiveis ?? 2;
        let subjectContext = "Sem dados de desempenho — crie uma agenda equilibrada com as principais matérias do ENEM.";

        if (userId) {
          const rows = await db.execute<any>(sql`
            SELECT materia,
              ROUND(AVG(score::float / NULLIF(total::float, 0) * 100))::int AS avg_pct,
              MAX(created_at) AS last_date
            FROM simulado_results
            WHERE user_id = ${userId}
            GROUP BY materia
            ORDER BY avg_pct ASC
            LIMIT 10
          `).catch(() => ({ rows: [] }));

          const planRows = await db.execute<any>(sql`
            SELECT materia, dias_prova FROM study_plans
            WHERE user_id = ${userId}
            ORDER BY created_at DESC LIMIT 1
          `).catch(() => ({ rows: [] }));

          if ((rows.rows as any[]).length > 0) {
            const subjects = (rows.rows as any[]).map(r => `${r.materia}: ${r.avg_pct}%`).join(", ");
            const plan = (planRows.rows as any[])[0];
            subjectContext = `Desempenho por matéria: ${subjects}${plan ? `. Plano ativo: ${plan.materia}, ${plan.dias_prova} dias até a prova` : ""}`;
          }
        }

        const hora = new Date().getHours();
        const periodo = hora < 12 ? "manhã" : hora < 18 ? "tarde" : "noite";

        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um pedagogo especialista em planejamento de estudos. Crie uma agenda de estudos para HOJE — ${new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} (período: ${periodo}).

Dados do aluno: ${subjectContext}
Tempo disponível: ${horas} horas

REGRAS:
- Comece pela matéria mais fraca (maior impacto no ENEM)
- Distribua o tempo em blocos de 25-50 minutos com pausas
- Varie: teoria → exercícios → revisão
- Seja ESPECÍFICO: não "estudar Matemática" mas "Funções do 2º grau — resolver 10 questões de vestibular"
- Inclua um bloco de revisão rápida no final
- Tom motivador e humano, como se fosse um coach falando

Retorne APENAS este JSON:
{
  "data": "hoje",
  "horas_total": ${horas},
  "blocos": [
    {
      "horario_sugerido": "ex: 19h00 - 19h50",
      "materia": "nome da matéria",
      "topico_especifico": "o que exatamente estudar",
      "atividade": "tipo de atividade (ex: resolver 8 questões de vestibular)",
      "duracao_min": 50,
      "prioridade": "alta|media|baixa"
    }
  ],
  "intervalo": "orientação sobre pausas",
  "meta_do_dia": "o que você deve conseguir fazer hoje",
  "frase_motivacional": "frase curta e genuína de encorajamento"
}`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 1500,
          temperature: 0.6,
        });

        const agenda = JSON.parse(gen.choices[0].message.content ?? "{}");
        if (userId) {
          await db.execute(sql`
            INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
            VALUES (${userId}, 0, 'agenda', ${"Agenda de Hoje — " + new Date().toLocaleDateString("pt-BR")}, ${JSON.stringify(agenda)}::jsonb)
          `).catch(() => {});
        }

        const summary = agenda.blocos?.map((b: any) =>
          `${b.horario_sugerido || ""} ${b.materia}: ${b.topico_especifico}`
        ).join(" | ") || "Agenda criada";

        return {
          result: `AGENDA DE HOJE CRIADA:\nMeta: ${agenda.meta_do_dia}\nBlocos: ${summary}\n${agenda.frase_motivacional || ""}`,
          action: { type: "agenda_criada", agenda, label: "agenda de hoje" },
        };
      } catch {
        return { result: "Erro ao criar agenda. Faça uma sugestão baseada nos dados disponíveis." };
      }
    }

    // ── Questão personalizada ────────────────────────────────────────────────
    case "gerar_questao_personalizada": {
      try {
        let topico = args.topico;
        let materia = args.materia;

        if (!topico && userId) {
          const rows = await db.execute<any>(sql`
            SELECT materia,
              ROUND(AVG(score::float / NULLIF(total::float, 0) * 100))::int AS avg_pct
            FROM simulado_results
            WHERE user_id = ${userId}
            GROUP BY materia
            ORDER BY avg_pct ASC LIMIT 1
          `).catch(() => ({ rows: [] }));
          const weakest = (rows.rows as any[])[0];
          if (weakest) {
            materia = materia || weakest.materia;
            topico = `tópico de ${weakest.materia}`;
          }
        }

        topico = topico || "conhecimentos gerais ENEM";
        materia = materia || "Geral";
        const nivel = args.nivel ?? "enem";

        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um elaborador de questões do ENEM e vestibulares brasileiros. Crie UMA questão de múltipla escolha de alta qualidade sobre "${topico}" (${materia}), nível ${nivel === "enem" ? "ENEM — contextualizada, com texto motivador" : nivel}.

A questão deve:
- Ter enunciado contextualizado com situação real (não só definição)
- 5 alternativas (A, B, C, D, E) plausíveis — não óbvias
- Resposta inequívoca
- Explicação detalhada do porquê a correta é correta e as outras não
- Ser original e desafiadora

Retorne APENAS este JSON:
{
  "enunciado": "texto completo da questão",
  "alternativas": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
  "resposta_correta": "A",
  "explicacao": "explicação completa",
  "dica_resolucao": "como identificar a resposta sem decorar — raciocínio"
}`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 1500,
          temperature: 0.7,
        });

        const q = JSON.parse(gen.choices[0].message.content ?? "{}");
        const questionText = `QUESTÃO — ${materia.toUpperCase()}:\n\n${q.enunciado}\n\nA) ${q.alternativas?.A}\nB) ${q.alternativas?.B}\nC) ${q.alternativas?.C}\nD) ${q.alternativas?.D}\nE) ${q.alternativas?.E}\n\nResposta: ${q.resposta_correta}\n\nExplicação: ${q.explicacao}\n\nDica: ${q.dica_resolucao}`;

        return {
          result: questionText,
          action: {
            type: "questao_gerada",
            questao: q,
            materia,
            topico,
            label: `Questão de ${materia}`,
          },
        };
      } catch {
        return { result: "Erro ao gerar questão. Tente novamente." };
      }
    }

    // ── Email ────────────────────────────────────────────────────────────────
    case "enviar_email": {
      if (!userId) return { result: "Login necessário para enviar emails." };
      try {
        await db.execute(sql`
          INSERT INTO tiagao_actions_log (user_id, action_type, payload, status)
          VALUES (${userId}, 'email', ${JSON.stringify(args)}::jsonb, 'pending')
        `);
        return {
          result: `Email preparado para ${args.destinatario} com assunto "${args.assunto}". Será enviado em instantes!`,
          action: { type: "email_enviado", destinatario: args.destinatario, assunto: args.assunto },
        };
      } catch (err) {
        console.error("[tool:enviar_email]", err);
        return { result: "Erro ao preparar o email. Tenta de novo?" };
      }
    }

    // ── WhatsApp ─────────────────────────────────────────────────────────────
    case "enviar_whatsapp": {
      if (!userId) return { result: "Login necessário." };
      try {
        await db.execute(sql`
          INSERT INTO tiagao_actions_log (user_id, action_type, payload, status)
          VALUES (${userId}, 'whatsapp', ${JSON.stringify(args)}::jsonb, 'pending')
        `);
        return {
          result: `WhatsApp preparado para ${args.destinatario}. Mensagem será disparada!`,
          action: { type: "whatsapp_enviado", destinatario: args.destinatario, tipo: args.tipo ?? "aviso" },
        };
      } catch (err) {
        console.error("[tool:enviar_whatsapp]", err);
        return { result: "Erro ao preparar mensagem WhatsApp." };
      }
    }

    // ── Correção de Redação ──────────────────────────────────────────────────
    case "corrigir_redacao": {
      if (!userId) return { result: "Login necessário para correção." };
      try {
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um corretor de redação especialista em ENEM, FUVEST e vestibulares brasileiros. Corrija a redação abaixo usando as 5 competências do ENEM:

C1: Domínio da norma culta
C2: Compreensão do tema e aplicação de conceitos
C3: Seleção e organização de informações
C4: Conhecimento dos mecanismos linguísticos de argumentação
C5: Proposta de intervenção

${args.tema ? `Tema proposto: "${args.tema}"` : "Tema: inferir pelo texto"}
Tipo de avaliação: ${args.tipo ?? "enem"}

REDAÇÃO DO ALUNO:
"""
${args.texto_redacao}
"""

Retorne APENAS este JSON:
{
  "nota_total": número de 0 a 1000,
  "competencias": [
    {"id": "C1", "nome": "Domínio da norma culta", "nota": 0-200, "comentario": "feedback específico"},
    {"id": "C2", "nome": "Compreensão do tema", "nota": 0-200, "comentario": "feedback específico"},
    {"id": "C3", "nome": "Organização de informações", "nota": 0-200, "comentario": "feedback específico"},
    {"id": "C4", "nome": "Mecanismos linguísticos", "nota": 0-200, "comentario": "feedback específico"},
    {"id": "C5", "nome": "Proposta de intervenção", "nota": 0-200, "comentario": "feedback específico"}
  ],
  "pontos_fortes": ["..."],
  "pontos_fracos": ["..."],
  "sugestao_reescrita": "Trecho sugerido para reescrita do parágrafo mais fraco",
  "dica_final": "Uma dica prática para a próxima redação"
}`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 2000,
          temperature: 0.3,
        });
        const correcao = JSON.parse(gen.choices[0].message.content ?? "{}");

        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'correcao_redacao', ${args.tema ?? 'Redação corrigida'}, ${JSON.stringify(correcao)}::jsonb)
        `).catch(() => null);

        const resumo = `Nota: ${correcao.nota_total}/1000. C1: ${correcao.competencias?.[0]?.nota}, C2: ${correcao.competencias?.[1]?.nota}, C3: ${correcao.competencias?.[2]?.nota}, C4: ${correcao.competencias?.[3]?.nota}, C5: ${correcao.competencias?.[4]?.nota}. ${correcao.dica_final ?? ""}`;
        return {
          result: resumo,
          action: { type: "correcao_redacao", correcao, tema: args.tema },
        };
      } catch (err) {
        console.error("[tool:corrigir_redacao]", err);
        return { result: "Erro ao corrigir a redação." };
      }
    }

    // ── Exportar PDF ─────────────────────────────────────────────────────────
    case "exportar_pdf": {
      if (!userId) return { result: "Login necessário." };
      return {
        result: `Preparando PDF de "${args.titulo ?? args.tipo_material}"... O download vai iniciar em instantes!`,
        action: { type: "exportar_pdf", tipo: args.tipo_material, titulo: args.titulo },
      };
    }

    // ── Agendar Lembrete ─────────────────────────────────────────────────────
    case "agendar_lembrete": {
      if (!userId) return { result: "Login necessário." };
      try {
        await db.execute(sql`
          INSERT INTO tiagao_actions_log (user_id, action_type, payload, status)
          VALUES (${userId}, 'lembrete', ${JSON.stringify({ mensagem: args.mensagem, quando: args.quando, prioridade: args.prioridade ?? "media" })}::jsonb, 'pending')
        `);
        return {
          result: `Lembrete agendado: "${args.mensagem}" para ${args.quando}. Eu te aviso!`,
          action: { type: "lembrete_agendado", mensagem: args.mensagem, quando: args.quando },
        };
      } catch (err) {
        console.error("[tool:agendar_lembrete]", err);
        return { result: "Erro ao agendar lembrete." };
      }
    }

    // ── Análise de humor (silenciosa) ────────────────────────────────────────
    case "analisar_humor_aluno": {
      return { result: `Estado detectado: ${args.sinais_detectados}. Tom ajustado: ${args.tom_recomendado}` };
    }


    // ── Memória rica + perfil + datas importantes (Prompt 12) ───────────────
    case "salvar_memoria_rica": {
      if (userId) {
        await saveMemory(userId, {
          type: args.tipo ?? "fact",
          content: args.conteudo,
          importance: args.importancia ?? 3,
          context: args.contexto,
        });
      }
      return { result: "Memória rica salva." };
    }

    case "atualizar_perfil": {
      if (userId) await updateProfile(userId, args.campo, args.valor);
      return { result: `Perfil atualizado: ${args.campo} → ${args.valor}` };
    }

    case "registrar_data_importante": {
      if (userId) {
        let dateStr = args.data as string;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
          const [d, m, y] = dateStr.split("/");
          dateStr = `${y}-${m}-${d}`;
        }
        await addImportantDate(userId, dateStr, args.descricao, args.materia);
        await saveMemory(userId, {
          type: "fact",
          content: `Data importante: ${args.descricao} em ${args.data}${args.materia ? ` (${args.materia})` : ""}`,
          importance: 5,
          context: "data importante registrada",
        });
      }
      return { result: `Data importante registrada: "${args.descricao}" em ${args.data}.` };
    }

    case "buscar_historico_aluno": {
      if (!userId) return { result: "Login necessário para buscar histórico." };
      try {
        const results = await searchKnowledge(userId, args.query, { subject: args.materia, limit: 5 });
        if (!results.length) return { result: "Nenhum material ou explicação anterior encontrado sobre esse tema. É a primeira vez que estudamos isso juntos!" };
        const ctx = results
          .map(r => `[${r.type}${r.subject ? ` — ${r.subject}` : ""}${r.title ? ` | ${r.title}` : ""}]: ${r.content.replace(/<[^>]+>/g, " ").trim().slice(0, 300)}`)
          .join("\n\n");
        return { result: `Histórico encontrado:\n${ctx}` };
      } catch {
        return { result: "Erro ao buscar histórico." };
      }
    }

    default:
      return { result: `Ferramenta ${toolName} executada.` };
  }
}

/**
 * tiagao-agent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo compartilhado: todas as ferramentas do Tiagão + executor.
 * Usado pelo voice-chat (professor.ts) E pelo text-chat (chat.ts).
 */

import type OpenAI from "openai";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { openrouterClient } from "./aiClient";
import { getModelConfig } from "./modelRouter";

// ─── Clients ──────────────────────────────────────────────────────────────────
// Usamos o openrouterClient centralizado para todas as ferramentas
function getGpt() {
  return openrouterClient;
}
const CONTENT_MODEL = getModelConfig("essay-correction").model; // openai/gpt-4o via OpenRouter

// ─── Memory helpers ───────────────────────────────────────────────────────────
export async function loadUserMemories(userId: string): Promise<string> {
  try {
    const rows = await db.execute<{ memoria: string; categoria: string; importancia: number }>(
      sql`SELECT memoria, categoria, importancia FROM tiagao_memory
          WHERE user_id = ${userId}
          ORDER BY importancia DESC, atualizado_at DESC
          LIMIT 15`
    );
    if (!rows.rows?.length) return "";
    const lines = rows.rows.map((r: any) => `[${r.categoria}|imp:${r.importancia}] ${r.memoria}`);
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
];

// ─── Tool executor ────────────────────────────────────────────────────────────
export interface ToolResult {
  result: string;
  action?: Record<string, any>;
}

export async function executeTiagaoTool(
  toolName: string,
  args: Record<string, any>,
  userId: string | undefined
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
        const qtd = Math.min(Math.max(args.quantidade_slides ?? 10, 6), 16);
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um professor universitário e designer instrucional expert. Crie uma apresentação educacional profissional com ${qtd} slides sobre "${args.topico}" ${args.materia ? "(" + args.materia + ")" : ""}.

PADRÃO PROFISSIONAL EXIGIDO:
- Cada slide deve ter conteúdo denso e preciso, sem superficialidade
- Bullets devem ser informativos e completos (não palavras soltas)
- Destaque: fato, dado, fórmula ou conceito-chave que o aluno não pode esquecer
- Cobrir: contexto histórico/teórico, conceitos centrais, exemplos práticos, aplicação em provas, erros comuns
- Alinhar com ENEM, BNCC e vestibulares de alta concorrência
- Slide de comparação: quando relevante, compare teorias/conceitos de forma didática

Retorne APENAS este JSON:
{
  "titulo": "string — título profissional",
  "subtitulo": "string — subtítulo contextual",
  "tema": "indigo",
  "slides": [
    { "tipo": "capa", "titulo": "...", "subtitulo": "contexto e relevância do tema" },
    { "tipo": "agenda", "titulo": "O que você vai aprender", "bullets": ["tópico 1", "tópico 2", "tópico 3", "tópico 4"] },
    { "tipo": "conteudo", "titulo": "...", "bullets": ["bullet completo com explicação", "..."], "destaque": "conceito ou dado chave" },
    { "tipo": "comparacao", "titulo": "...", "itens": [{"label":"A","descricao":"..."},{"label":"B","descricao":"..."}] },
    { "tipo": "citacao", "titulo": "...", "citacao": "...", "autor": "..." },
    { "tipo": "encerramento", "titulo": "Pontos essenciais", "mensagem": "síntese completa", "dicaEnem": "o que o ENEM cobra sobre isso" }
  ]
}
Tipos disponíveis: capa (1x), agenda (1x), conteudo (maioria), comparacao, citacao, encerramento (1x). APENAS JSON.`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 4000,
          temperature: 0.6,
        });
        const slidesData = JSON.parse(gen.choices[0].message.content ?? "{}");
        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'slides', ${slidesData.titulo ?? args.topico}, ${JSON.stringify(slidesData)}::jsonb)
        `).catch(() => null);
        return {
          result: `Apresentação "${slidesData.titulo ?? args.topico}" criada com ${slidesData.slides?.length ?? qtd} slides!`,
          action: { type: "criar_slides", slides: slidesData, titulo: slidesData.titulo ?? args.topico },
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
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um professor especialista com visão sistêmica do conteúdo. Crie um mapa mental completo e profissional sobre "${args.topico}" ${args.materia ? "(" + args.materia + ")" : ""}.

PADRÃO EXIGIDO:
- Estrutura hierárquica real: categorias = grandes eixos do tema
- Tópicos = conceitos específicos dentro de cada eixo
- Subtópicos = definições, exemplos, aplicações, dados e fórmulas
- Detalhes ("detail"): frase informativa completa — não apenas nomear, mas explicar
- Cobrir todos os aspectos relevantes: histórico, teoria, aplicação, ENEM, erros comuns
- Mínimo: 4 categorias, 3 tópicos por categoria, 4 subtópicos por tópico

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
          }],
          response_format: { type: "json_object" },
          max_tokens: 3500,
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
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Crie um briefing para infográfico educacional sobre "${args.topico}" ${args.materia ? "(" + args.materia + ")" : ""}.
Retorne JSON:
{
  "titulo": "Título (max 8 palavras)",
  "subtitulo": "Subtítulo (max 15 palavras)",
  "secoes": [
    { "rotulo": "Nome (max 4 palavras)", "elementos": ["fato 1", "fato 2", "fato 3"] }
  ],
  "icones_chave": ["substantivo 1", "substantivo 2", "substantivo 3"]
}
3-4 seções, 3-5 elementos por seção. APENAS JSON.`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 1000,
          temperature: 0.5,
        });
        const briefData = JSON.parse(gen.choices[0].message.content ?? "{}");
        return {
          result: `Infográfico sobre "${args.topico}" preparado! Abrindo Estúdio IA para gerar a imagem.`,
          action: {
            type: "criar_infografico",
            brief: briefData,
            topico: args.topico,
            materia: args.materia ?? "Geral",
            estilo: args.estilo ?? "profissional",
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
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um professor universitário especialista em ${args.materia ?? "educação"}, com domínio profundo de todo o conteúdo cobrado no ENEM, vestibulares e concursos públicos brasileiros.

Crie um resumo de estudo completo e profissional sobre "${args.topico}" para nível ${nivel}.

PADRÃO EXIGIDO:
- Introdução: contextualização histórica/científica, relevância do tema, onde aparece em provas
- Tópicos: 5 a 7 seções temáticas, cada uma com conteúdo explicativo denso (mínimo 3 parágrafos de conteúdo por tópico)
- Exemplos: práticos, do cotidiano brasileiro, resolução passo a passo quando houver cálculo
- Destaque: o conceito mais cobrado em provas desse tópico + dica de como reconhecer na questão
- Pontos-chave: 6 a 8 afirmações precisas que o aluno deve dominar
- Dica ENEM: como o ENEM aborda esse tema, tipos de questão, pegadinhas comuns
- Palavras-chave: 8 a 12 termos técnicos com definições breves
- Erros comuns: o que os alunos costumam errar e como evitar

Retorne APENAS este JSON:
{
  "titulo": "Resumo Completo: [topico]",
  "materia": "${args.materia ?? "Geral"}",
  "nivel": "${nivel}",
  "introducao": "parágrafo rico de contextualização",
  "topicos": [
    {
      "titulo": "Título do subtópico",
      "conteudo": "explicação completa e densa",
      "exemplos": ["exemplo detalhado 1", "exemplo detalhado 2"],
      "destaque": "conceito-chave para prova: frase precisa"
    }
  ],
  "pontos_chave": ["afirmação precisa 1", "afirmação precisa 2"],
  "dica_enem": "análise de como o ENEM aborda o tema com tipos de questão",
  "erros_comuns": ["erro 1 — como evitar", "erro 2 — como evitar"],
  "palavras_chave": ["termo: definição breve"]
}
APENAS JSON.`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 5000,
          temperature: 0.5,
        });
        const resumoData = JSON.parse(gen.choices[0].message.content ?? "{}");
        if (userId) {
          await db.execute(sql`
            INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
            VALUES (${userId}, 0, 'resumo', ${resumoData.titulo ?? "Resumo: " + args.topico}, ${JSON.stringify(resumoData)}::jsonb)
          `).catch(() => null);
        }
        return {
          result: `Resumo de "${args.topico}" criado com ${resumoData.topicos?.length ?? 4} tópicos!`,
          action: { type: "criar_resumo", resumo: resumoData, topico: args.topico, materia: args.materia },
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
        const gen = await gpt.chat.completions.create({
          model: CONTENT_MODEL,
          messages: [{
            role: "system",
            content: `Você é um pedagogo especialista em planejamento de estudos para vestibulares e concursos. Crie um plano de estudos profissional e realista para: "${args.objetivo}"${args.materia ? " — Foco em " + args.materia : ""}.

Parâmetros: ${prazo} dias | ${horas}h por dia de estudo | ${semanas} semanas.

PADRÃO EXIGIDO:
- Progressão pedagógica real: começa pelos fundamentos, avança para intermediário, finaliza com revisão e simulados
- Cada semana com tema central coerente (não aleatório)
- Tópicos específicos e concretos — não "estudar Matemática" mas "funções quadráticas e gráficos"
- Atividades diversificadas: leitura, exercícios, flashcards, simulados, revisão ativa
- Distribuição de carga horária equilibrada e sustentável
- Semana final sempre de revisão e simulados
- Dicas de técnica de estudo: Pomodoro, espaçamento, retrieval practice
- Meta semanal mensurável e específica

Retorne APENAS este JSON:
{
  "titulo": "Plano de Estudos: [objetivo]",
  "objetivo": "${args.objetivo}",
  "prazo_dias": ${prazo},
  "horas_dia": ${horas},
  "total_horas": number,
  "metodologia": "descrição breve da abordagem pedagógica",
  "semanas": [
    {
      "numero": 1,
      "tema_central": "tema da semana",
      "topicos": ["tópico específico 1", "tópico específico 2", "tópico específico 3"],
      "atividades": [
        { "tipo": "teoria", "descricao": "...", "horas": number },
        { "tipo": "exercicios", "descricao": "...", "horas": number },
        { "tipo": "revisao", "descricao": "...", "horas": number }
      ],
      "meta_semanal": "meta mensurável e específica",
      "materiais": ["livro/recurso recomendado"]
    }
  ],
  "tecnicas_estudo": ["técnica com explicação breve"],
  "cronograma_diario": "sugestão de como distribuir as horas do dia",
  "dicas_gerais": ["dica específica e acionável"],
  "meta_final": "o que o aluno será capaz de fazer ao concluir o plano"
}
APENAS JSON.`,
          }],
          response_format: { type: "json_object" },
          max_tokens: 4500,
          temperature: 0.6,
        });
        const planoData = JSON.parse(gen.choices[0].message.content ?? "{}");
        await db.execute(sql`
          INSERT INTO notebook_artifacts (user_id, doc_id, kind, title, payload)
          VALUES (${userId}, 0, 'plano_estudos', ${planoData.titulo ?? "Plano: " + args.objetivo}, ${JSON.stringify(planoData)}::jsonb)
        `).catch(() => null);
        return {
          result: `Plano de estudos "${planoData.titulo}" criado! ${planoData.semanas?.length ?? 4} semanas, ${horas}h/dia.`,
          action: { type: "criar_plano_estudos", plano: planoData, titulo: planoData.titulo },
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

    default:
      return { result: `Ferramenta ${toolName} executada.` };
  }
}

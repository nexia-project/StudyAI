/**
 * scripts/ingest-enem.ts — STUB (PR-3, data scaffolding).
 *
 * Pipeline (NÃO IMPLEMENTADO ainda — este arquivo é documentação executável):
 *
 *   1. Fontes oficiais
 *      ────────────────
 *      INEP — Instituto Nacional de Estudos e Pesquisas Educacionais Anísio
 *      Teixeira é a entidade responsável pelos microdados do ENEM.
 *
 *      Microdados (CSV gigantes, ~5 GB descompactado por edição):
 *        https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/enem
 *      Provas e gabaritos (PDF + gabarito oficial):
 *        https://www.inep.gov.br/web/guest/educacao-basica/enem/provas-e-gabaritos
 *        https://download.inep.gov.br/enem/provas_e_gabaritos/
 *      API pública (terceiros, NÃO oficial, mas útil para textos das questões):
 *        https://api.enem.dev/
 *        https://github.com/yunger7/enem-api
 *
 *      Decisão recomendada (definir com o time):
 *        - Para dados estatísticos (acertos por questão, perfil socioeconômico),
 *          usar microdados CSV oficiais (INEP).
 *        - Para texto + imagens das questões, usar api.enem.dev (rápido) com
 *          verificação cruzada com os PDFs oficiais do INEP.
 *
 *   2. Parsing
 *      ───────
 *      a) Microdados:
 *           - Download dos ZIPs anuais (https://download.inep.gov.br/microdados/microdados_enem_<ANO>.zip).
 *           - Extrair com adm-zip (já presente nas deps).
 *           - Ler `ITENS_PROVA_<ANO>.csv` (delimitador ';', encoding latin1).
 *           - Campos relevantes:
 *               CO_ITEM       — id do item (estável entre edições)
 *               TX_GABARITO   — gabarito oficial (A-E)
 *               SG_AREA       — LC | MT | CN | CH
 *               TX_COR        — cor do caderno (mapear para nº de questão)
 *               CO_HABILIDADE — habilidade da Matriz de Referência (1-30)
 *               NU_PARAM_*    — parâmetros TRI (a, b, c) — útil para escolher
 *                                questões por dificuldade alvo.
 *           - O texto da questão NÃO vem nos microdados — buscar via api.enem.dev
 *             ou parse dos PDFs (`pdf-parse`).
 *
 *      b) api.enem.dev (alternativa rápida para textos):
 *           - `GET https://api.enem.dev/v1/exams/{ANO}/questions/{NUMERO}` retorna
 *             enunciado, alternativas e gabarito em JSON.
 *           - Cuidado com rate-limit (~60 req/min). Persistir tudo localmente.
 *
 *   3. Upsert em Postgres
 *      ──────────────────
 *      Esquema sugerido (criar migração Drizzle em PR futura — NÃO criar agora):
 *
 *          CREATE TABLE enem_questao (
 *            id              text PRIMARY KEY,                   -- enem-2023-115
 *            ano             smallint NOT NULL,
 *            numero          smallint NOT NULL,
 *            area            char(2) NOT NULL CHECK (area IN ('LC','MT','CN','CH','R')),
 *            disciplina      text,
 *            tema            text,
 *            enunciado       text NOT NULL,
 *            comando         text NOT NULL,
 *            gabarito        char(1),                            -- NULL para Redação
 *            resolucao       text,
 *            bncc_codigos    text[],
 *            param_tri_a     real,
 *            param_tri_b     real,
 *            param_tri_c     real,
 *            fonte_url       text,
 *            tsv             tsvector GENERATED ALWAYS AS (
 *                              to_tsvector('portuguese',
 *                                coalesce(tema,'')||' '||coalesce(enunciado,'')||' '||coalesce(comando,'')
 *                              )
 *                            ) STORED,
 *            UNIQUE (ano, numero)
 *          );
 *          CREATE INDEX enem_q_area_ano_idx ON enem_questao (area, ano);
 *          CREATE INDEX enem_q_tsv_idx      ON enem_questao USING gin(tsv);
 *
 *          CREATE TABLE enem_alternativa (
 *            questao_id  text NOT NULL REFERENCES enem_questao(id) ON DELETE CASCADE,
 *            letra       char(1) NOT NULL CHECK (letra IN ('A','B','C','D','E')),
 *            texto       text NOT NULL,
 *            correta     boolean NOT NULL,
 *            PRIMARY KEY (questao_id, letra)
 *          );
 *
 *          CREATE TABLE enem_redacao_tema (
 *            ano        smallint PRIMARY KEY,
 *            tema       text NOT NULL,
 *            textos_motivadores text,
 *            fonte_url  text
 *          );
 *
 *   4. Invocação
 *      ──────────
 *          pnpm --filter @workspace/api-server run ingest:enem
 *          # ou, da pasta artifacts/api-server:
 *          npm run ingest:enem -- --ano=2023 --source=api.enem.dev
 *
 *      Argumentos sugeridos para o script real:
 *          --ano <YYYY>       repete-se para vários anos
 *          --source <enum>    "inep-csv" | "api.enem.dev" | "pdf"
 *          --dry-run          parse sem escrever em DB
 *
 *   5. Validação pós-ingestão
 *      ──────────────────────
 *      - Cada ano ENEM regular deve ter 180 questões objetivas (45 por área)
 *        + 1 tema de redação.
 *      - Para cada questão, exatamente 1 alternativa marcada como correta
 *        (`select count(*) from enem_alternativa where correta group by questao_id`
 *         deve ser sempre 1).
 *      - Cross-check do gabarito INEP vs api.enem.dev: divergências viram alertas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANTE: este arquivo NÃO faz nada ainda. Está marcado como TODO para
 * que o pipeline real seja construído junto com a migração Drizzle (PR
 * separada). Por enquanto o `/api/enem/*` responde a partir do seed
 * in-memory de `lib/enem/seed.ts`.
 */

async function main(): Promise<void> {
  console.warn(
    "[ingest-enem] stub não implementado — consulte o cabeçalho deste arquivo. " +
      "O banco corrente é o seed em lib/enem/seed.ts.",
  );
  process.exitCode = 0;
}

void main();

/**
 * scripts/ingest-bncc.ts — STUB (PR-3, data scaffolding).
 *
 * Pipeline (NÃO IMPLEMENTADO ainda — este arquivo é documentação executável):
 *
 *   1. Download dos artefatos oficiais MEC
 *      ────────────────────────────────────
 *      Base Nacional Comum Curricular — homologada em 2018 (EI/EF) e 2018 (EM).
 *
 *      Documentos-fonte:
 *        - PDF oficial completo:
 *            http://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf
 *            http://basenacionalcomum.mec.gov.br/images/historico/BNCC_EnsinoMedio_embaixa_site_110518.pdf
 *        - Versão CSV/JSON estruturada (terceiros, baixa qualidade — preferir parse do PDF
 *          oficial ou o portal de itinerários novo do MEC):
 *            https://novoensinomedio.mec.gov.br/recursos/itinerarios
 *        - Repositório auxiliar (códigos e descrições limpas, comunidade):
 *            https://github.com/dadosjusbr/bncc (verificar licenciamento antes de uso)
 *
 *   2. Parsing
 *      ───────
 *      - PDF: usar pdf-parse (já presente nas deps do api-server) para extrair o texto.
 *        Cada habilidade tem o padrão `EM13{AREA}{COMP}{NN}` no início da linha
 *        + descrição contínua até o próximo código.
 *      - Pseudocódigo:
 *
 *            import fs from "node:fs/promises";
 *            import pdfParse from "pdf-parse";
 *            const buf = await fs.readFile("./tmp/bncc-em.pdf");
 *            const { text } = await pdfParse(buf);
 *            const re = /(EM13[A-Z]{2,3}\d{2,3})\s+([^\n]+(?:\n(?!EM13)[^\n]+)*)/g;
 *            for (const m of text.matchAll(re)) {
 *              upsertHabilidade({ codigo: m[1], descricao: m[2].trim(), ... });
 *            }
 *
 *   3. Upsert em Postgres
 *      ──────────────────
 *      Esquema sugerido (criar migração Drizzle em PR futura — NÃO criar agora):
 *
 *          CREATE TABLE bncc_area (
 *            codigo       text PRIMARY KEY,            -- LGG, MAT, CNT, CHS
 *            nome         text NOT NULL,
 *            descricao    text,
 *            componentes  text[]
 *          );
 *
 *          CREATE TABLE bncc_competencia_geral (
 *            numero       smallint PRIMARY KEY,
 *            titulo       text NOT NULL,
 *            descricao    text NOT NULL
 *          );
 *
 *          CREATE TABLE bncc_competencia_especifica (
 *            codigo            text PRIMARY KEY,        -- EM13CNT101
 *            area_codigo       text NOT NULL REFERENCES bncc_area(codigo),
 *            competencia       smallint NOT NULL,
 *            descricao         text NOT NULL,
 *            palavras_chave    text[],
 *            tsv               tsvector GENERATED ALWAYS AS (
 *                                to_tsvector('portuguese', descricao)
 *                              ) STORED
 *          );
 *          CREATE INDEX bncc_comp_tsv_idx ON bncc_competencia_especifica USING gin(tsv);
 *
 *   4. Invocação
 *      ──────────
 *          pnpm --filter @workspace/api-server run ingest:bncc
 *          # ou, da pasta artifacts/api-server:
 *          npm run ingest:bncc
 *
 *      O script DEVE ser idempotente — re-rodar não duplica linhas (use
 *      ON CONFLICT DO UPDATE).
 *
 *   5. Validação pós-ingestão
 *      ──────────────────────
 *      - Contagens esperadas: 4 áreas, 10 competências gerais, ~240 habilidades
 *        específicas (EM). Comparar com `BNCC_SEED_STATS` em `lib/bncc/data.ts`.
 *      - Smoke test: queries em pt-BR (`'energia & conservação'::tsquery`) devem
 *        retornar EM13CNT101.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANTE: este arquivo NÃO faz nada ainda. Está marcado como TODO para
 * que o pipeline real seja construído junto com a migração Drizzle (PR
 * separada). Por enquanto a aplicação roda a partir do seed in-memory de
 * `lib/bncc/data.ts`.
 */

async function main(): Promise<void> {
  console.warn(
    "[ingest-bncc] stub não implementado — consulte o cabeçalho deste arquivo. " +
      "O dataset corrente é o seed em lib/bncc/data.ts.",
  );
  process.exitCode = 0;
}

void main();

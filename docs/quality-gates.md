# StudyAI Quality Gates

Atualizado em 2026-05-17.

## Typecheck raiz

Status: aprovado.

Comando:

```bash
pnpm run typecheck
```

Cobertura do gate:

- `tsc --build` nas libs compartilhadas.
- `typecheck` dos artefatos em `artifacts/**`.
- `typecheck` de `scripts`.

Correcoes aplicadas:

- Tipos Node adicionados no workspace raiz.
- Tipos/dev runtime React adicionados em `@workspace/integrations-openai-ai-react` para typecheck de hooks.
- Uso de `p-retry` atualizado para `AbortError` exportado pela versao instalada.

Observacao operacional: em Windows, comandos `pnpm add` precisaram de `--ignore-scripts` porque o `preinstall` raiz chama `sh`.

## Notebook RAG QA

Status geral: parcialmente validado.

Automatizado:

- `pnpm --filter @workspace/api-server run smoke:notebook-fallbacks`
- Valida, sem provider real, que entradas fracas/vazias geram apresentacao fallback com pelo menos 8 slides, planos visuais, checkpoints e objetivos.
- Valida, sem provider real, que mapa mental fallback gera ramos principais, topicos achatados e conexoes cruzadas.

Manual pendente:

- Upload de texto curto em `/notebook`, gerar chat RAG e confirmar citacoes `[Fonte N]`.
- Gerar `Mapa Mental` a partir de fonte curta e confirmar aviso/indicador de fallback estruturado.
- Gerar `Apresentação` a partir de fonte curta e confirmar renderizacao dos slides, navegacao e exportacao/impressao.
- Confirmar que visual enrichment indisponivel nao quebra material nem PDF.
- Confirmar que rate limit/401 continuam amigaveis para usuario anonimo ou sem sessao valida.

Aceite minimo para liberar continuidade premium:

- Gate raiz `pnpm run typecheck` verde.
- Smoke fallback verde.
- Manual Notebook/RAG acima executado antes de marcar QA como completo.

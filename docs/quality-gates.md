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

## Deploy/producao

Status: aprovado para o commit `65e9e836` ou equivalente.

Evidencia em 2026-05-17:

- `https://api.study.ia.br/api/healthz` respondeu `status=ok`.
- Commit publicado: `65e9e83`, equivalente ao commit `65e9e836` usado para restaurar o typecheck raiz.
- Chaves OpenAI, OpenRouter, Clerk e DB reportadas como ativas pelo healthcheck.

## Notebook RAG QA

Status geral: parcialmente validado.

Automatizado:

- `pnpm --filter @workspace/api-server run smoke:notebook-fallbacks`
- Valida, sem provider real, que entradas fracas/vazias geram apresentacao fallback com pelo menos 8 slides, planos visuais, checkpoints e objetivos.
- Valida, sem provider real, que mapa mental fallback gera ramos principais, topicos achatados e conexoes cruzadas.
- `pnpm --filter @workspace/api-server run smoke:notebook-preview-export`
- Valida serializacao JSON de apresentacao e mapa mental para reabertura/exportacao, incluindo layout, visual/caption, evidencia, notas do professor, exemplos/checkpoints, metadados achatados do mapa e conexoes cruzadas.
- Notebook do Professor: `/professor?section=notebook` deve listar fontes do Notebook, aceitar upload de texto e chamar `/api/notebook/teacher-output` com contexto docente (`teacher_notebook_output_generated`).

Manual pendente:

- Upload de texto curto em `/notebook`, gerar chat RAG e confirmar citacoes `[Fonte N]`.
- Gerar `Mapa Mental` a partir de fonte curta e confirmar aviso/indicador visual de fallback estruturado no navegador.
- Gerar `Apresentação` a partir de fonte curta e confirmar renderizacao dos slides, navegacao, tela cheia e exportacao/impressao no navegador.
- Confirmar que visual enrichment indisponivel nao quebra material nem PDF.
- Professor: gerar ao menos `Plano de aula`, `Atividade avaliativa`, `Rubrica` e `Slides com notas` a partir de uma fonte real; conferir objetivos, habilidades, tempo, desenvolvimento, avaliacao, adaptacoes, evidencias/citacoes e slots visuais.
- Confirmar que rate limit/401 continuam amigaveis para usuario anonimo ou sem sessao valida.

Aceite minimo para liberar continuidade premium:

- Gate raiz `pnpm run typecheck` verde.
- Smoke fallback e preview/export verde.
- Manual Notebook/RAG acima executado antes de marcar QA como completo.

## QA visual/manual geral - App interno

Status geral: em validacao.

Passada estatica aplicada em 2026-05-18:

- Cabecalhos compartilhados agora quebram acoes e subtitulos em telas estreitas, reduzindo compressao de botoes.
- Caderno, Notebook, Simulado, ProfessorTurma, Instituicao, Meus Conteudos e Admin receberam ajustes conservadores de overflow, largura e CTA mobile.
- Navegacao simplificada: modo instituicao deixou de repetir tres entradas para `/instituicao`; professor deixou de repetir `/professor` nos atalhos rapidos e removeu atalho interno duplicado para o Notebook.
- Separacao de papeis Professor Premium+: shell do aluno nao exibe alternancia visivel para Professor/Escola; portal do professor nao oferece retorno primario para `/app`; Tiagao flutuante generico fica oculto em `/professor`, `/instituicao`, `/admin` e `/governo`.
- Notebook do Professor deve validar tambem `Mensagem de intervencao`: rascunho profissional para aluno/familia/coordenacao, com motivo pedagogico, acao combinada, prazo de acompanhamento, revisao humana e sem promessa de resultado.

Checklist manual pendente:

- Aluno: Home, Notebook RAG, Simulado ENEM, Caderno e Meus Conteudos em desktop e mobile.
- Professor: painel, turma, criadores, relatorios e acesso ao Notebook/Conteudos pelo shell.
- Instituicao: portal, abas internas, relatorios/exportacao e menu simplificado.
- Admin: dashboard, busca, IA & Custos, Hermes, Conteudos/Base de Conhecimento e secoes operacionais sem scroll horizontal desnecessario em desktop.

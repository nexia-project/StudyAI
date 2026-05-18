# Comunicação Institucional / WhatsApp

Primeira fundação segura para o centro de comunicação do StudyAI. A arquitetura escolhida é uma camada de intenção: a UI cria uma intenção de comunicação com destinatário, papel, finalidade, template, variáveis, consentimento e canal preferido. O backend valida guardrails antes de qualquer provider externo.

## Escopo atual

- Canal externo primário: WhatsApp, quando `WHATSAPP_PROVIDER=meta` e credenciais Meta Cloud API estiverem configuradas.
- Visibilidade interna: cada tentativa segura, bloqueada ou pendente de configuração é registrada em `communication_logs`.
- Hermes: falhas de provider, missing consent e bloqueios críticos geram sinal best-effort em `hermes_admin_inbox`.
- UI: `/comunicacao` com presets institucionais, destinatário manual, preview e envio desabilitado quando WhatsApp não está pronto.

## Guardrails

- Consentimento/opt-in WhatsApp obrigatório por destinatário.
- Marketing exige opt-in explícito, template aprovado e opção clara de PARAR/STOP.
- Cobrança deve usar contato cadastrado do responsável, não telefone do aluno por padrão.
- Conteúdo sensível deve ficar no StudyAI/portal autenticado; WhatsApp serve para chamada, lembrete e confirmação.
- Sem disparos em massa sem revisão humana. A primeira fatia limita o fluxo manual e exige confirmação de revisão.
- WhatsApp fora da janela de 24h precisa de template aprovado.

## Configuração

Variáveis esperadas:

```env
WHATSAPP_PROVIDER=meta
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_META_BUSINESS_ACCOUNT_ID=
WHATSAPP_META_TEMPLATE_LANGUAGE=pt_BR
```

Sem essas variáveis, a API responde em modo `dry_run`/`configuration_required` e não envia mensagens reais.

## Próximos passos para produção

- Modelar consentimento por contato e instituição, incluindo fonte, data, finalidade e opt-out.
- Vincular responsáveis reais aos alunos e bloquear cobrança quando só houver telefone do estudante.
- Criar catálogo persistido de templates aprovados por instituição e finalidade.
- Adicionar seleção real de destinatários por turma, papel e instituição.
- Implementar fila com rate limit por instituição, retries, deduplicação e webhooks de status do provider.
- Revisar termos/LGPD e políticas WhatsApp Business antes de liberar marketing.

# External config checklist

**Atualizado em:** 2026-05-18  
**Escopo:** itens que dependem de dashboard externo, credenciais, billing, webhooks ou decisao operacional do usuario.

## Railway e cron Hermes

- `HERMES_CRON_SECRET`: gerar valor aleatorio forte e configurar no Railway.
- Cron diario: `POST https://study.ia.br/internal/hermes/daily-learn` com header `x-cron-secret`.
- Cron horario: `POST https://study.ia.br/internal/hermes/hourly-proactive` com header `x-cron-secret`.
- Cron worker: `POST https://study.ia.br/internal/hermes/process-tasks?limit=10` a cada 5-15 minutos com header `x-cron-secret`.
- Verificar se Railway Cron ou scheduler externo permite metodo `POST` e header customizado; se nao permitir, usar scheduler que suporte headers.
- Manter `CRON_SECRET` separado de `HERMES_CRON_SECRET` quando houver outros endpoints cron.

## WhatsApp / Meta

- `WHATSAPP_PROVIDER=meta`.
- `WHATSAPP_META_ACCESS_TOKEN`: token Meta Cloud API com permissao adequada.
- `WHATSAPP_META_PHONE_NUMBER_ID`: phone number id do WhatsApp Business.
- `WHATSAPP_META_BUSINESS_ACCOUNT_ID`: WABA id para operacao e auditoria.
- `WHATSAPP_META_TEMPLATE_LANGUAGE=pt_BR` ou idioma aprovado.
- Templates aprovados na Meta para cada finalidade: aviso, lembrete, cobranca, marketing e follow-up institucional.
- Consentimento/opt-in rastreavel por destinatario, finalidade, fonte, data e opt-out.
- Webhook Meta configurado para status de mensagem, erro, entrega, leitura e inbound quando o fluxo for liberar envio real.
- Politica de STOP/PARAR e revisao LGPD antes de marketing ou cobranca.
- Enquanto qualquer item acima faltar, manter fluxo em `dry_run`/`configuration_required`.

## Billing e provedores IA

- `AI_INTEGRATIONS_OPENROUTER_API_KEY`: chave runtime para roteamento atual de Claude/DeepSeek via OpenRouter.
- `OPENROUTER_MANAGEMENT_API_KEY`: chave de management para saldo/credits, separada da runtime quando possivel.
- `AI_INTEGRATIONS_OPENAI_API_KEY`: runtime OpenAI para TTS/STT.
- `OPENAI_ADMIN_API_KEY`: chave admin com permissao de Usage/Costs antes de reconciliar custo real.
- `OPENAI_ORG_ID` e `OPENAI_PROJECT_ID`: configurar quando a conta exigir escopo para billing.
- `ANTHROPIC_ADMIN_API_KEY`: chave admin de custos Anthropic; `ANTHROPIC_API_KEY` comum nao substitui billing.
- `ELEVENLABS_API_KEY`: necessario para uso real de caracteres/limite.
- Google Billing: configurar `GOOGLE_CLOUD_PROJECT`, credenciais de service account ou mecanismo equivalente, billing account/export e permissao de leitura de custos antes de prometer reconciliacao.
- `GEMINI_API_KEY` ou `GOOGLE_GENERATIVE_AI_API_KEY`: runtime, nao billing.
- DeepSeek direto nao esta implementado no runtime atual; `deepseek/*` roda via OpenRouter.

## Auth, roles e admin

- `CLERK_SECRET_KEY` e `VITE_CLERK_PUBLISHABLE_KEY` precisam ser do ambiente live correto.
- `ADMIN_EMAILS` e/ou `ADMIN_USER_IDS` devem conter somente operadores reais.
- `GET /api/agents/hermes/status` exige usuario autenticado e admin; validar com conta admin, nao por curl anonimo.
- Revisar separacao por papel: aluno, professor, instituicao e admin nao devem compartilhar entradas primarias indevidas.
- Confirmar que comunicacao externa e acoes Hermes continuam revisaveis por humano antes de contato real, alteracao contratual ou mudanca pedagogica sensivel.

## Stripe, email e base operacional

- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` e `STRIPE_PREMIUM_PRICE_ID` devem apontar para live/prod quando o ambiente for producao.
- `RESEND_API_KEY` deve estar ativo para emails transacionais.
- `DATABASE_URL` deve ser o Postgres Railway do ambiente production.
- `NODE_ENV=production`; nao definir `PORT` manualmente no Railway.
- `ENEM_BANK_SOURCE` deve ficar em `json` ou `db` conforme ingestao real validada.

## Evidencia de pronto

- Health publico mostra `openai=true`, `openrouter=true`, `clerk=true`, `db=true`.
- Admin Hermes mostra status e catalogo com usuario admin real.
- Cron Hermes retorna `ok` ou erros acionaveis sem 401/500 de configuracao.
- `communication_logs` registra envio, bloqueio, dry-run ou erro.
- Custos IA mostram claramente o que e billing real e o que e estimativa/log interno.


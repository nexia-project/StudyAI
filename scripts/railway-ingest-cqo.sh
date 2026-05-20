#!/usr/bin/env bash
# Cole no Railway Shell (serviço StudyAI). Não rode no Windows local.
set -euo pipefail

echo "=== StudyAI — ingest postulados CQO (Railway Shell) ==="
echo ""
echo "# 1) Confirmar pasta e arquivos"
echo "pwd"
echo "ls -la docs/postulados-cqo/"
echo ""
echo "# 2) Obter UUID admin (copie o id da coluna id)"
echo 'psql "$DATABASE_URL" -c "SELECT id, email, role FROM users WHERE role = '\''admin'\'' ORDER BY created_at LIMIT 5;"'
echo ""
echo "# 3) Dry-run (substitua <UUID_ADMIN>)"
echo 'cd /app'
echo 'pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --dry-run'
echo ""
echo "# 4) Ingest real"
echo 'pnpm --filter @workspace/api-server run ingest:postulados -- "./docs/postulados-cqo" --uploaded-by=<UUID_ADMIN> --skip-existing'
echo ""
echo "# 5) Validação SQL"
echo 'psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM knowledge_documents WHERE metadata->>'\''source'\'' = '\''postulado'\'';"'
echo ""
echo "Docs: docs/railway-runbook.md (Passo 2)"

#!/bin/bash
# deploy.sh — envia alterações para GitHub → Railway atualiza automaticamente
# Uso: ./deploy.sh "descrição do que mudou"

GIT=/nix/store/x5hwjkyng8385q1pqhz8wyqkq0izmhpi-replit-runtime-path/bin/git
MSG=${1:-"update"}

$GIT add -A
$GIT commit -m "$MSG" 2>/dev/null || echo "(nada novo para commitar)"

# Sem --force para não quebrar o webhook do Railway
$GIT push origin HEAD:main

echo ""
echo "Enviado! Railway vai atualizar em ~3-5 minutos."

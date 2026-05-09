# PRD — Study.IA (Hub Tiagão + Navegação + Acervo)

**Versão:** 1.0 · **Data:** 2026-05-09 · **Status:** diretriz ativa de produto/UI

---

## 1. Visão em uma frase

O Study.IA é uma plataforma brasileira de preparação (ENEM, vestibular, concursos) onde **o Professor Tiagão é o ponto único de entrada**: conversa por voz ou texto, **entende objetivo e material**, executa ações no sistema (plano, notebook, lousa, simulado) e **reutiliza com o tempo o acervo do próprio usuário/instituição** para reduzir custo, aumentar velocidade e melhorar consistência pedagógica.

---

## 2. Referência visual e ritmo de interface

**Referência declarada:** SOCH ([soch.com.br](https://www.soch.com.br/)) — **cores vivas com superfície limpa**, alto contraste legível, componentes com **respiro**, cantos suaves, CTAs óbvios.

**Regras de paleta (produto):**

- **1 cor primária** (ação principal / estado ativo na sidebar).
- **1 cor secundária** (sucesso / highlights pontuais).
- **Neutros** para fundo, bordas e texto (evitar “arco‑íris” em cada card).

**Navegação:** abandono do modelo “muitas abas no topo”. **Menu lateral esquerdo fixo** por persona (Aluno / Professor / Admin…), com **grupos expansíveis** (accordion) e **subitens que abrem telas** — hierarquia clara: *Área → Funcionalidade → Tela*.

---

## 3. Personas (escopo de primeira classe)

| Persona | Objetivo principal | Sucesso |
|--------|-------------------|---------|
| **Aluno** | Estudar com direção, motivação e feedback rápido | Plano claro, sessões curtas possíveis, progresso visível |
| **Professor** | Montar turma, materiais e acompanhar risco/desempenho | Menos cliques administrativos, mais tempo pedagógico |
| **Instituição** | Visão agregada e comunicação | Dashboard útil sem ruído |
| **Admin interno** | Estabilidade, custo de IA, qualidade | Observabilidade e rollout seguro |

---

## 4. Três fluxos canônicos (não negociáveis)

Estes fluxos substituem várias telas que hoje se sobrepõem (vários chats / vários uploads).

### F1 — Entrada (primeiros 60 segundos)

1. Usuário entra **já no contexto do Tiagão** (áudio opcional + chat).
2. Tiagão pergunta objetivo (prova, prazo, matérias fracas) **em linguagem humana**.
3. Usuário **ou** cola texto / digita tema **ou** envia arquivo (PDF, imagem, DOC/DOCX onde suportado) **na mesma janela do Tiagão**.
4. Sistema gera **próximo passo concreto** (plano parcial, roteiro de estudo, ou abertura de módulo com conteúdo gerado).

**Princípio:** não espalhar “upload para criar plano” em telas diferentes — **um hub**.

### F2 — Estudo do dia (rotina)

1. “O que faço agora em 15–30 min?” → uma recomendação **única** + botão **Começar**.
2. Ao terminar, **fechamento do ciclo**: quiz flash / revisão / próximo passo.

### F3 — Acervo → reuso (custo e velocidade)

1. Todo material enviado e todo artefato útil vira **documento/chunk indexável** no acervo do usuário (e, quando aplicável, da turma/instituição).
2. Política explícita de geração: **priorizar trechos do acervo** quando couber; só buscar “fora” quando necessário ou quando o usuário pedir ampliação.

---

## 5. Consolidação de funcionalidades (diretriz)

**Reduzir duplicidade:** onde hoje existem fluxos paralelos (vários geradores, vários chats), consolidar sob:

- **Conversar com o Tiagão** (com ferramentas / ações).
- **Notebook / acervo** (fonte de verdade do material).
- **Módulos pedagógicos** (simulado, redação, trilha) como **destinos** chamados pelo tutor ou pelo menu — não como “produtos concorrentes” entre si.

**Critério de corte:** se duas telas resolvem 80% do mesmo problema, **uma vira canônica** e a outra vira atalho ou some.

---

## 6. Professor Tiagão — refinamento de voz (produto + técnico)

**Expectativa de produto:** voz **masculina**, **pt‑BR**, tom de professor (claro, caloroso, não robótico).

**Implementação (alinhamento técnico):**

- TTS primário: voz **masculina** consistente no endpoint de áudio (ex.: perfil OpenAI TTS adequado).
- Fallback do navegador: seleção de voz **pt‑BR masculina** quando existir; caso contrário, melhor voz disponível sem quebrar UX.

**UX:** controle simples no painel do Tiagão: **Som ligado / modo só texto / velocidade** (avançado pode ficar oculto).

---

## 7. Entregas por fases (roadmap de execução)

| Fase | O quê | Critério de “feito” |
|------|--------|---------------------|
| **A** | Estabilidade: rotas críticas, smoke mínimo, voz alinhada | Fluxos F1/F2 usáveis sem 500 “fantasma” |
| **B** | Nova navegação: sidebar por persona + rotas limpas | Usuário acha qualquer função em ≤3 cliques |
| **C** | Hub Tiagão como home pós‑login (aluno) | Upload + objetivo + próximo passo na mesma superfície |
| **D** | Acervo institucional maduro: ingestão, dedupe, políticas de reuso | Métricas de *hit rate* do acervo + redução de custo médio por sessão |

---

## 8. Métricas de sucesso (produto)

- **Ativação:** % usuários que completam F1 em < 3 min.
- **Retenção:** retorno D1/D7 na rotina F2.
- **Qualidade percebida:** NPS por módulo + taxa de erro por rota (API).
- **Eficiência de IA:** custo médio por sessão, % respostas com *cache/acervo*, tempo médio de primeira resposta.

---

## 9. Fora de escopo imediato (explícito)

- Multiplicar novas features antes de fechar Fase A/B.
- Novos módulos “paralelos” ao hub sem dono claro de UX.
- Prometer “zero custo de IA” absoluto — o alvo é **margem e previsibilidade**, com transparência.

---

## 10. Governança deste documento

Alterações relevantes de produto/UI devem **atualizar este PRD** ou referenciar um ADR; releases devem citar **qual fase** avançou.

**Autorização:** diretriz aprovada pelo gestor do projeto para orientar implementação contínua.

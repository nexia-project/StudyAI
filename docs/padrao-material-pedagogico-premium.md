# Padrao de material pedagogico premium

Este documento operacionaliza o ticket 6 do `docs/plano-mestre-evolucao-studyai.md`: todo material gerado, importado ou curado deve ter estrutura pedagogica minima antes de ser tratado como premium.

## Objetivo

O padrao existe para impedir que um material seja apenas "texto bonito". Um material premium precisa ensinar, diagnosticar ou treinar com evidencias suficientes para aluno, professor, instituicao e Hermes confiarem no resultado.

## Metadados minimos

Todo material pedagogico premium deve carregar:

- `objective`: objetivo de aprendizagem em linguagem simples.
- `subject`: materia ou area.
- `targetLevel`: serie, ano, nivel ou persona quando aplicavel.
- `targetExam`: ENEM, vestibular, concurso, OAB, Revalida ou outro alvo quando aplicavel.
- `skill`: habilidade/competencia BNCC, ENEM, concurso ou taxonomia interna.
- `prerequisites`: conhecimentos previos explicitos.
- `keyConcepts`: conceitos-chave.
- `vocabulary`: vocabulario essencial.
- `commonErrors`: erro comum, causa provavel e intervencao sugerida.
- `explanationLevels`: explicacao curta, passo a passo e aprofundada.
- `exercises`: exercicios com gabarito, justificativa e distratores explicados quando houver alternativas.
- `sources`: fonte, citacao ou evidencia quando houver RAG, banco oficial, documento do usuario ou curadoria.
- `quality`: score de qualidade e status.
- `humanReviewed`: sinalizacao de revisao humana quando o material for liberado para turma/instituicao.

## Score de qualidade

O helper em `artifacts/api-server/src/lib/pedagogy/premium-material-standard.ts` calcula um score conservador com:

- `completeness`: completude dos campos obrigatorios.
- `verifiability`: presenca de fonte verificada.
- `pedagogicalFit`: objetivo, habilidade, erros comuns e exercicios ajudando a ensinar/diagnosticar/treinar.
- `levelAdequacy`: linguagem e profundidade aderentes ao nivel.
- `hallucinationRisk`: risco de fonte, habilidade, gabarito ou justificativa inventada.

Status possiveis:

- `rascunho`: material incompleto ou sem revisao suficiente.
- `precisa_revisao`: material util, mas ainda falha em fonte, exercicio, nivel ou alinhamento pedagogico.
- `aprovado_premium`: atende ao minimo e pode entrar em fluxo premium com revisao humana quando aplicavel.
- `bloqueado`: risco pedagogico, fonte insuficiente ou inconsistencia que impede publicacao.

## Uso esperado

Novos geradores de explicacao, lista, aula, plano, revisao e simulado devem montar `PremiumMaterialMetadata` e anexar `quality = scorePremiumMaterialMetadata(metadata)` antes de persistir ou expor o resultado como premium.

Para conteudo vindo de RAG, banco oficial ou documento do usuario, `sources` deve apontar a origem usada. Se a fonte nao puder ser verificada, o material nao deve sair como `aprovado_premium`.

Para professor/instituicao, `humanReviewed` deve ser exigido antes de liberar material sensivel para turma. Hermes pode recomendar revisao, mas nao deve alterar conteudo de producao automaticamente.

## Integracao Hermes/QA

O QA sintetico recebe o resumo do padrao no snapshot e o expoe em `GET /api/agents/qa_sintetico/catalogo`. As auditorias podem usar essa rubrica para apontar lacunas de conteudo, fonte, habilidade, explicacao em niveis e exercicios sem executar mutacoes destrutivas.

## Exemplo minimo

```ts
import {
  scorePremiumMaterialMetadata,
  type PremiumMaterialMetadata,
} from "../lib/pedagogy/premium-material-standard";

const metadata: PremiumMaterialMetadata = {
  objective: "Resolver questoes de porcentagem em problemas contextualizados.",
  subject: "Matematica",
  targetLevel: "Ensino medio",
  targetExam: "ENEM",
  skill: {
    kind: "enem",
    code: "H12",
    description: "Resolver situacoes-problema envolvendo porcentagem.",
  },
  prerequisites: ["Razao", "fracao", "multiplicacao decimal"],
  keyConcepts: ["porcentagem", "aumento percentual", "desconto"],
  vocabulary: ["percentual", "taxa", "valor inicial", "valor final"],
  commonErrors: [
    {
      error: "Somar 20% e depois subtrair 20% esperando voltar ao valor inicial.",
      likelyCause: "Confusao entre bases percentuais diferentes.",
      suggestedIntervention: "Comparar valor inicial e novo valor em tabela simples.",
    },
  ],
  explanationLevels: {
    curta: "Porcentagem e uma fracao de denominador 100.",
    passo_a_passo: "Identifique a base, transforme a taxa em decimal e multiplique.",
    aprofundada: "Aumentos e descontos sucessivos mudam a base de calculo.",
  },
  exercises: [
    {
      statement: "Um produto de R$ 200 recebeu desconto de 15%. Qual o preco final?",
      answer: "R$ 170",
      rationale: "15% de 200 = 30; 200 - 30 = 170.",
    },
  ],
  sources: [
    {
      kind: "curadoria_professor",
      title: "Lista de porcentagem - professor",
      verified: true,
    },
  ],
};

const quality = scorePremiumMaterialMetadata(metadata);
```

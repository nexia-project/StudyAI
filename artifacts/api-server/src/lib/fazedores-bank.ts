/**
 * Banco estático inicial do Módulo Fazedores (StudyAI).
 * Metodologia: contexto → 3 perguntas → 5 passos → +1 → estudos → orgulho.
 * Segurança: apenas situações com ferramentas simples; sem eletricidade aberta, fogo, químicos ou altura.
 */

export type FazedorCategoria = "consertar" | "organizar" | "criar" | "estudar";
export type FazedorNivel = "facil" | "medio" | "dificil";

export interface FazedoresDesafioDTO {
  desafioId: string;
  categoria: FazedorCategoria;
  titulo: string;
  nivel: FazedorNivel;
  tempoMinutos: number;
  ferramentas: string;
  situacao: string;
  perguntas: [string, string, string];
  passos: [string, string, string, string, string];
  desafioExtra: string;
  conexaoEstudos: string;
  mensagemFinal: string;
}

const ORGULHO_BASE =
  "Você acabou de fazer o que muita gente nem tenta: parar para observar, planejar e agir. Isso é atitude de quem resolve problemas — na vida e na escola.";

function orgulho(tail: string): string {
  return `${ORGULHO_BASE} ${tail}`;
}

export const FAZEDORES_BANK: FazedoresDesafioDTO[] = [
  {
    desafioId: "consertar-gaveta",
    categoria: "consertar",
    titulo: "A Gaveta que Emperra",
    nivel: "facil",
    tempoMinutos: 10,
    ferramentas: "Chave de fenda comum, pano seco, um pouco de óleo de cozinha (opcional), lanterna de celular",
    situacao:
      "Você tem uma gaveta do guarda-roupa que não abre direito. Quando puxa, trava e faz barulho de raspando. Parece que vai quebrar se forçar.",
    perguntas: [
      "O que você observa que está diferente em relação às outras gavetas que funcionam bem?",
      "Quais ferramentas ou materiais simples você já tem em casa que podem ajudar (sem desmontar motor elétrico)?",
      "Se você fosse explicar para um amigo mais novo o que está acontecendo, o que diria com suas palavras?",
    ],
    passos: [
      "Observe com calma: puxe devagar e veja em qual lado ou altura a gaveta encosta ou trava.",
      "Tente nomear o problema: emperra na corrediça, inclinou, algo está torto ou com folga?",
      "Separe só o que for necessário (chave, pano) e peça ajuda de um adulto se precisar forçar um pouco.",
      "Faça uma tentativa simples primeiro (ex.: parafusos visíveis da corrediça mais firmes, sem inventar moda).",
      "Teste abrindo e fechando devagar várias vezes; se melhorar, ótimo; se não, ajuste uma variável de cada vez.",
    ],
    desafioExtra:
      "Depois que melhorar, desenhe ou descreva como organizar o DENTRO da gaveta para não voltar a bagunçar.",
    conexaoEstudos:
      "Isso é o método científico na prática: observação → hipótese → teste → conclusão. Na redação, você faz o mesmo: acha o problema, testa uma correção, revisa.",
    mensagemFinal: orgulho("Consertar coisas do dia a dia treina a mesma paciência que você usa para revisar uma questão difícil."),
  },
  {
    desafioId: "consertar-cadeira",
    categoria: "consertar",
    titulo: "A Cadeira Bamba",
    nivel: "medio",
    tempoMinutos: 15,
    ferramentas: "Chave combinada ou fenda, pano, feltro adesivo ou pedaço de borracha fina",
    situacao: "Sua cadeira de estudo balança quando você senta. Às vezes range e incomoda na hora da leitura.",
    perguntas: [
      "O balanço vem das pernas, do encosto ou do chão irregular?",
      "Você consegue ver parafusos ou encaixes soltos sem precisar desmontar nada elétrico?",
      "Qual seria o menor ajuste possível que ainda valeria a pena testar primeiro?",
    ],
    passos: [
      "Vire a cadeira com cuidado (com ajuda se for pesada) e inspecione parafusos aparentes.",
      "Aperte o que estiver frouxo, sempre devagar e sem exagero.",
      "Se o chão for irregular, teste colocar feltro fino só onde encosta.",
      "Sente de novo e observe se o movimento diminuiu.",
      "Se continuar, anote o que não funcionou — isso ajuda no próximo teste (uma mudança por vez).",
    ],
    desafioExtra: "Crie uma 'ficha de diagnóstico' com desenho simples da cadeira e onde você acha que está o problema.",
    conexaoEstudos:
      "Em Física, estabilidade e forças aparecem o tempo todo; aqui você sente na peça o que é base e equilíbrio.",
    mensagemFinal: orgulho("Ajustar detalhes com calma é o mesmo hábito que melhora provas: menos achismo, mais verificação."),
  },
  {
    desafioId: "consertar-brinquedo",
    categoria: "consertar",
    titulo: "O Brinquedo Solto",
    nivel: "facil",
    tempoMinutos: 10,
    ferramentas: "Cola branca ou fita adesiva forte, palito de dente, elásticos grossos (sem engolir perto de crianças pequenas)",
    situacao: "Uma peça de um brinquedo soltou. Não é elétrico. Você quer usar de novo sem que quebre fácil.",
    perguntas: [
      "A peça encaixa por pressão, parafuso ou encaixe de mola?",
      "O que você tem em casa que segura bem sem virar 'gambiarra perigosa'?",
      "Se colar ou amarrar, onde exatamente faria força para não atrapalhar o movimento?",
    ],
    passos: [
      "Limpe o pó do encaixe com pano seco.",
      "Teste encaixar seco primeiro para ver se ainda trava sozinho.",
      "Se precisar colar, use pouco material e espere secar como a embalagem manda.",
      "Faça um teste de movimento devagar.",
      "Se não der certo, desmonte o que fez com cuidado e tente outra ideia (uma de cada vez).",
    ],
    desafioExtra: "Invente um nome 'técnico' engraçado para a sua solução, como se fosse uma patente.",
    conexaoEstudos: "Em Ciências, muitas experiências começam com hipótese simples e material barato.",
    mensagemFinal: orgulho("Cuidar do que é seu também é treino de responsabilidade."),
  },
  {
    desafioId: "consertar-torneira",
    categoria: "consertar",
    titulo: "A Torneira Gotejando",
    nivel: "medio",
    tempoMinutos: 20,
    ferramentas: "Pano, chave apropriada se houver acabamento rosqueado visível, ajuda de adulto",
    situacao:
      "A torneira do banheiro não fecha 100% e fica gotejando. Você não vai mexer em fiação elétrica — só no acabamento comum da torneira, com supervisão.",
    perguntas: [
      "O gotejamento acontece com a torneira bem fechada ou só quando mal fechada?",
      "Tem algum adulto em casa que já apertou esse tipo de acabamento antes?",
      "O que aconteceria se você ignorasse o problema por semanas (água, conta, barulho)?",
    ],
    passos: [
      "Peça supervisão: muitas vezes o ajuste é no próprio volante/acabamento, com cuidado.",
      "Feche com firmeza sem usar força bruta.",
      "Observe se o gotejamento muda.",
      "Se precisar desrosquear algo, combine com adulto e use ferramenta certa.",
      "Teste várias vezes abrindo e fechando devagar.",
    ],
    desafioExtra: "Calcule com adulto quantos litros por dia seriam perdidos (estimativa) — liga com Matemática.",
    conexaoEstudos: "Proporção e estimativa aparecem no ENEM; aqui você vê utilidade no mundo real.",
    mensagemFinal: orgulho("Resolver desperdício é pensar no coletivo — inteligência com coração."),
  },
  {
    desafioId: "consertar-mochila",
    categoria: "consertar",
    titulo: "A Mochila Rasgada",
    nivel: "medio",
    tempoMinutos: 15,
    ferramentas: "Agulha e linha grossa, dedal, fita adesiva por dentro como reforço temporário, tesoura",
    situacao: "Sua mochila tem um rasgo pequeno perto do zíper. Quer durar até o fim do ano.",
    perguntas: [
      "O rasgo está só no tecido ou também no zíper?",
      "Você prefere costura firme ou reforço por dentro primeiro?",
      "O que pode furar de novo se você não arredondar as pontas do rasgo?",
    ],
    passos: [
      "Limpe a região e alinhe as bordas.",
      "Se for costurar, comece por dentro com reforço leve.",
      "Dê pontos firmes, sem apertar tanto que amasse o tecido.",
      "Teste puxando com moderação.",
      "Planeje onde não pendurar peso extra daqui pra frente.",
    ],
    desafioExtra: "Costure um pedaço de fita colorida como 'etiqueta' para marcar seu lado da mochila.",
    conexaoEstudos: "Costura é sequência lógica — parecido com algoritmo: passo a passo sem pular etapa.",
    mensagemFinal: orgulho("Consertar o que te acompanha todo dia é autocuidado."),
  },
  {
    desafioId: "organizar-porta-malas",
    categoria: "organizar",
    titulo: "O Porta-Malas Cheio",
    nivel: "medio",
    tempoMinutos: 15,
    ferramentas: "Caixas plásticas ou sacolas firmes, pano, elásticos",
    situacao: "A família precisa levar quatro volumes no carro e parece que não cabe nada.",
    perguntas: [
      "O que é obrigatório ir e o que só está 'por preguiça de tirar'?",
      "Qual objeto ocupa volume mas é oco por dentro (dá para encaixar coisa dentro)?",
      "Se você fosse empacotador de mudança, qual regra usaria primeiro?",
    ],
    passos: [
      "Tire tudo e limpe o fundo rapidamente.",
      "Separe por prioridade: primeiro o que não pode amassar.",
      "Coloque o mais pesado encostado no fundo (com adulto dirigindo a decisão de peso).",
      "Use espaços vazios (dentro de malas pequenas, por exemplo).",
      "Feche e teste se nada balança solto (barulho seguro).",
    ],
    desafioExtra: "Desenhe o 'mapa' do porta-malas visto de cima com quadrados nomeados.",
    conexaoEstudos: "Geometria espacial e otimização — parentes do que cai em matemática aplicada.",
    mensagemFinal: orgulho("Organizar é projeto: treina clareza de mente."),
  },
  {
    desafioId: "organizar-mesa",
    categoria: "organizar",
    titulo: "A Mesa de Estudos",
    nivel: "medio",
    tempoMinutos: 20,
    ferramentas: "Caixas, clips, post-its se tiver, saco de reciclagem",
    situacao: "Sua mesa está cheia de papéis, canetas e copos. Você demora a começar a estudar por causa da bagunça.",
    perguntas: [
      "O que na mesa é lixo, o que é arquivo e o que é 'em uso hoje'?",
      "Quantas coisas você realmente usa nas próximas 2 horas?",
      "Qual cantinho pode virar 'zona de foco' só com limpeza leve?",
    ],
    passos: [
      "Tire lixo e louça primeiro (impacto rápido).",
      "Agrupe papéis por matéria ou por prazo.",
      "Deixe só 3 itens principais na área de trabalho.",
      "Guarde o restante em caixas rotuladas.",
      "Tire foto do antes/depois para lembrar do padrão.",
    ],
    desafioExtra: "Crie um ritual de 60 segundos para 'fechar o dia' na mesa toda noite.",
    conexaoEstudos: "Redação boa pede clareza; mesa limpa é o mesmo princípio aplicado ao ambiente.",
    mensagemFinal: orgulho("Ambiente arrumado é voto de confiança no seu futuro eu."),
  },
  {
    desafioId: "organizar-armario",
    categoria: "organizar",
    titulo: "O Armário Bagunçado",
    nivel: "dificil",
    tempoMinutos: 30,
    ferramentas: "Cabides, caixas, sacos para doação",
    situacao: "Roupas misturadas: verão, inverno, uniforme, pijama. Você perde tempo todo dia.",
    perguntas: [
      "Quais pilhas naturais já existem (mesmo bagunçadas)?",
      "O que você usa toda semana versus 1x por mês?",
      "Qual regra simples você consegue manter (ex.: '1 gaveta = pijamas')?",
    ],
    passos: [
      "Separe montes: manter / lavar / doar (combinando com responsável).",
      "Dobre ou pendure o básico que usa sempre na frente.",
      "Rotule gavetas com papel e fita.",
      "Deixe doação longe do fluxo diário para não misturar.",
      "Teste por 3 dias e ajuste a regra se não colar.",
    ],
    desafioExtra: "Escreva uma 'constituição' de 5 linhas do seu armário.",
    conexaoEstudos: "Classificar e rotular é taxonomia — base de Ciências e até tabelas periódicas (organização).",
    mensagemFinal: orgulho("Organizar armário é treino de prioridade — habilidade de líder."),
  },
  {
    desafioId: "organizar-mochila",
    categoria: "organizar",
    titulo: "A Mochila Escolar",
    nivel: "facil",
    tempoMinutos: 10,
    ferramentas: "Zíper funcionando, sacos plásticos pequenos, etiquetas de papel",
    situacao: "Você não acha o material certo na hora da aula. Tudo misturado.",
    perguntas: [
      "Quais matérias precisam de material pesado todos os dias?",
      "O que poderia ficar em casa ou na escola em vez de carregar sempre?",
      "Qual seria o 'kit mínimo' de 60 segundos para montar a mochila?",
    ],
    passos: [
      "Esvazie em cima de uma toalha ou mesa limpa.",
      "Limpe migalhas e papéis velhos.",
      "Faça saquinhos por matéria ou por tipo (caderno / fichário / estojo).",
      "Coloque o peso encostado nas costas.",
      "Teste fechar e abrir três vezes como se estivesse com pressa.",
    ],
    desafioExtra: "Crie uma checklist de 7 itens no verso do caderno.",
    conexaoEstudos: "Checklist é método de revisão — igual ao que aviador e médico usam para não esquecer nada.",
    mensagemFinal: orgulho("Ordem na mochila é menos estresse na porta da sala."),
  },
  {
    desafioId: "organizar-geladeira",
    categoria: "organizar",
    titulo: "A Geladeira",
    nivel: "medio",
    tempoMinutos: 20,
    ferramentas: "Pano, saco de lixo, potes limpos, caneta para data (se tiver)",
    situacao: "Comidas ficam escondidas no fundo e estragam. A família reclama do desperdício.",
    perguntas: [
      "O que costuma estragar primeiro na sua casa?",
      "Onde faria sentido colocar o que vence logo (visível)?",
      "Quem da casa pode combinar regras com você?",
    ],
    passos: [
      "Tire tudo com adulto (segurança de temperatura e cheiro).",
      "Limpe prateleiras com pano.",
      "Descarte o estragado no lixo certo.",
      "Agrupe: laticínios, sobremesas, sobras com nome+data se possível.",
      "Combine uma 'zona do vence logo' na frente.",
    ],
    desafioExtra: "Invente um código de cores com fitas (ex.: verde = ok, amarelo = essa semana).",
    conexaoEstudos: "Biologia e saúde — conservação e micro-organismos aparecem no cotidiano.",
    mensagemFinal: orgulho("Cuidar de comida é ciência cívica: menos desperdício, mais respeito."),
  },
  {
    desafioId: "criar-suporte-celular",
    categoria: "criar",
    titulo: "Suporte de Celular",
    nivel: "medio",
    tempoMinutos: 20,
    ferramentas: "Papelão grosso, tesoura, régua, fita, elásticos, cola branca",
    situacao: "Você quer assistir a uma aula no celular sem segurar o tempo todo.",
    perguntas: [
      "Qual ângulo de tela é confortável para o seu pescoço?",
      "O que segura o celular sem tapar a saída de som?",
      "Como evitar que deslize (borracha, dobra extra)?",
    ],
    passos: [
      "Desenhe um formato simples em papelão (tipo 'L' com contrapeso).",
      "Recorte com cuidado (tesoura boa, mesa protegida).",
      "Teste encaixe sem cola primeiro.",
      "Reforce dobras com fita.",
      "Ajuste altura com dobras extras até ficar estável.",
    ],
    desafioExtra: "Crie uma segunda versão 'baixa custo' usando só um copo descartável cortado com critério.",
    conexaoEstudos: "Prototipagem — igual laboratório de Física: testa, falha rápido, melhora.",
    mensagemFinal: orgulho("Inventar solução barata é engenharia de verdade."),
  },
  {
    desafioId: "criar-cabos",
    categoria: "criar",
    titulo: "Organizador de Cabos",
    nivel: "medio",
    tempoMinutos: 15,
    ferramentas: "Clips grandes, canudos de papelão, fita, elásticos",
    situacao: "Cabos de carregador e fone embolam na mesa. Irrita na hora de estudar.",
    perguntas: [
      "Quais cabos você usa todo dia versus 1x por semana?",
      "Dá para pendurar, enrolar ou separar fisicamente?",
      "Qual solução você consegue manter por 2 semanas sem irritar?",
    ],
    passos: [
      "Desembolce devagar (sem puxar com raiva).",
      "Enrole cada um com laço frouxo (não apertar demais o fio).",
      "Identifique com etiqueta de papel.",
      "Use suporte simples (clipe na borda da mesa).",
      "Tire foto do resultado.",
    ],
    desafioExtra: "Nomeie cada cabo como se fosse personagem de série.",
    conexaoEstudos: "Grafos e nós: cabos são arestas; evitar nó impossível é problema clássico.",
    mensagemFinal: orgulho("Ordem nos fios é ordem nos pensamentos."),
  },
  {
    desafioId: "criar-porta-lapis",
    categoria: "criar",
    titulo: "Porta-Lápis Reciclado",
    nivel: "medio",
    tempoMinutos: 20,
    ferramentas: "Garrafa PET, tesoura afiada com adulto, fita, papel para decorar",
    situacao: "Você quer um porta-lápis firme usando material que iria pro lixo.",
    perguntas: [
      "Qual altura ideal para seus lápis sem tombar?",
      "Como fazer a borda sem ficar cortante?",
      "Que decoração representa você (cores, símbolo)?",
    ],
    passos: [
      "Marque o corte com caneta e régua.",
      "Corte com supervisão para borda lisa.",
      "Enrole fita na borda por segurança.",
      "Teste peso com lápis altos.",
      "Ajuste altura cortando um pouco mais se precisar.",
    ],
    desafioExtra: "Crie divisórias internas com papelão fino.",
    conexaoEstudos: "Sustentabilidade cai em provas de Ciências e em redação tema ambiental.",
    mensagemFinal: orgulho("Transformar lixo em útil é criatividade com propósito."),
  },
  {
    desafioId: "criar-marcador",
    categoria: "criar",
    titulo: "Marcador de Páginas",
    nivel: "facil",
    tempoMinutos: 10,
    ferramentas: "Cartolina, retalhos, fita, elástico fino, caneta",
    situacao: "Você não tem post-it e precisa marcar página de estudo sem rasgar o livro.",
    perguntas: [
      "O marcador precisa ser fino ou pode ser largo?",
      "Como evitar que caia para fora do livro fechado?",
      "Que palavra ou símbolo te lembra do conteúdo da página?",
    ],
    passos: [
      "Recorte uma faixa de papel resistente.",
      "Faça um corte central na parte superior para encaixar na página (modelo clássico).",
      "Teste fechando o livro.",
      "Reforce com fita transparente.",
      "Escreva uma palavra-chave pequena.",
    ],
    desafioExtra: "Faça um conjunto de 3 marcadores com níveis 'urgente / revisar / tranquilo'.",
    conexaoEstudos: "Leitura e literatura: marcar bem acelera revisão de texto longo.",
    mensagemFinal: orgulho("Pequenas ferramentas boas mudam o ritmo de estudo."),
  },
  {
    desafioId: "criar-embalagem",
    categoria: "criar",
    titulo: "Embalagem de Presente",
    nivel: "medio",
    tempoMinutos: 15,
    ferramentas: "Jornal bonito, revista, fita, tesoura, cola stick",
    situacao: "Você precisa embalar um presente e não tem papel de presente tradicional.",
    perguntas: [
      "Qual padrão visual ainda assim fica bonito?",
      "Como esconder o nome do presente sem estragar a surpresa?",
      "Que dobra esconde melhor as imperfeições?",
    ],
    passos: [
      "Meça papel com margem.",
      "Centralize o objeto.",
      "Dobre cantos como envelope simples.",
      "Cole só onde não mancha.",
      "Finalize com laço de fita ou barbante.",
    ],
    desafioExtra: "Escreve um cartão de 2 frases sem revelar o objeto.",
    conexaoEstudos: "Geometria de dobras e simetria — matemática escondida no artesanato.",
    mensagemFinal: orgulho("Capricho no detalhe é gentileza — e gentileza é inteligência emocional."),
  },
  {
    desafioId: "estudar-resumo",
    categoria: "estudar",
    titulo: "Resumir um Capítulo",
    nivel: "dificil",
    tempoMinutos: 30,
    ferramentas: "Caderno, caneta de cores, timer do celular",
    situacao: "Você tem um capítulo enorme e sente que 'não cabe na cabeça'.",
    perguntas: [
      "Qual é a pergunta que o capítulo responde?",
      "Quais 5 conceitos se tudo mais fosse apagado ainda precisariam ficar?",
      "O que você já sabe sobre o tema antes de ler de novo?",
    ],
    passos: [
      "Leia só títulos e subtítulos em 3 minutos.",
      "Leia o primeiro e último parágrafo de cada seção grande.",
      "Escreva 10 linhas máximo em suas palavras.",
      "Destaque 3 palavras-chave por página mentalmente.",
      "Refaça o resumo em metade do tamanho (versão final).",
    ],
    desafioExtra: "Grave um áudio de 60 segundos explicando o capítulo para um amigo imaginário.",
    conexaoEstudos: "Síntese é competência central do ENEM (interpretar e condensar).",
    mensagemFinal: orgulho("Resumir bem é dominar, não decorar."),
  },
  {
    desafioId: "estudar-formulas",
    categoria: "estudar",
    titulo: "Organizar Fórmulas",
    nivel: "medio",
    tempoMinutos: 20,
    ferramentas: "Ficha ou caderno, três cores, régua",
    situacao: "Você tem muitas fórmulas de Física anotadas soltas e confunde na hora da prova.",
    perguntas: [
      "Quais fórmulas são irmãs (mesmo tipo de situação)?",
      "Quais têm mesmas letras com significados diferentes?",
      "Como você nomearia cada 'família' de fórmulas?",
    ],
    passos: [
      "Liste todas que precisa neste mês.",
      "Agrupe por tema: movimento, energia, eletricidade básica (só papel!).",
      "Escreva uma frase-caso de uso ao lado de cada.",
      "Faça mini-desenho quando ajudar.",
      "Revise em voz alta em 5 minutos.",
    ],
    desafioExtra: "Crie um 'mapa mental' só com setas entre fórmulas relacionadas.",
    conexaoEstudos: "Matemática e Física: estruturação reduz erro de aplicação.",
    mensagemFinal: orgulho("Ordem no caderno vira velocidade na prova."),
  },
  {
    desafioId: "estudar-cronograma",
    categoria: "estudar",
    titulo: "Criar Cronograma",
    nivel: "dificil",
    tempoMinutos: 30,
    ferramentas: "Papel quadriculado ou planilha simples, caneta",
    situacao: "Prova em 7 dias, 5 matérias, e você sente que não dá tempo.",
    perguntas: [
      "Qual matéria drena mais energia sua?",
      "Quais dias você realmente tem bloco livre honesto?",
      "O que é 'mínimo aceitável' por matéria versus 'sonho perfeito'?",
    ],
    passos: [
      "Liste matérias e pesos reais (tempo/prova).",
      "Corte metas impossíveis pela metade (plano realista).",
      "Distribua blocos curtos (25–50 min).",
      "Coloque revisão espaçada no fim de cada dois dias.",
      "Marque 1 folga leve para não queimar.",
    ],
    desafioExtra: "Adicione um 'plano B' se perder um dia inteiro.",
    conexaoEstudos: "Gestão do tempo é transversal: melhora todas as notas.",
    mensagemFinal: orgulho("Plano honesto vence plano heroico que ninguém cumpre."),
  },
  {
    desafioId: "estudar-mapa",
    categoria: "estudar",
    titulo: "Mapa Mental",
    nivel: "medio",
    tempoMinutos: 25,
    ferramentas: "Folha em branco, canetas coloridas",
    situacao: "Você precisa conectar conceitos de História para lembrar na prova.",
    perguntas: [
      "Qual é o conceito central (no meio)?",
      "Quais causas e consequências formam galhos principais?",
      "O que você confunde sempre (coloque longe um do outro ou ligue com nota)?",
    ],
    passos: [
      "Escreva o tema central.",
      "Desenhe 4–6 galhos grossos.",
      "Em cada galho, 3 palavras só.",
      "Use cor para época ou tipo (político/econômico/cultural).",
      "Explique em voz alta em 2 minutos.",
    ],
    desafioExtra: "Transforme um galho em mini-tirinha de 3 quadrinhos.",
    conexaoEstudos: "História pede conexão; mapa mental é a ferramenta certa.",
    mensagemFinal: orgulho("Ver o todo no papel acalma a mente na prova."),
  },
  {
    desafioId: "estudar-flashcards",
    categoria: "estudar",
    titulo: "Flashcards Rápidos",
    nivel: "medio",
    tempoMinutos: 15,
    ferramentas: "Papel pequeno cortado ou cartões, caneta",
    situacao: "Você precisa memorizar vocabulário ou fórmulas curtas até sexta.",
    perguntas: [
      "Quais 20 itens são realmente essenciais?",
      "Frente do card pergunta o quê exatamente (definição, aplicação, exemplo)?",
      "Como você vai testar sem olhar a resposta?",
    ],
    passos: [
      "Corte 20 cartões.",
      "Frente: pergunta curta. Verso: resposta em 1 linha.",
      "Estude em leitura alta por 5 minutos.",
      "Separe os que errou em monte 'difícil'.",
      "Repita só o monte difícil três vezes.",
    ],
    desafioExtra: "Invente um 'modo desafio' com timer de 30s por card.",
    conexaoEstudos: "Active recall — uma das bases mais fortes da ciência da aprendizagem.",
    mensagemFinal: orgulho("Memória boa é técnica, não 'dom natural'. Você treinou."),
  },
];

export function listByCategoria(c: FazedorCategoria): FazedoresDesafioDTO[] {
  return FAZEDORES_BANK.filter((d) => d.categoria === c);
}

export function findById(id: string): FazedoresDesafioDTO | undefined {
  return FAZEDORES_BANK.find((d) => d.desafioId === id);
}

export function pickDesafio(opts: {
  categoria?: FazedorCategoria;
  nivel?: FazedorNivel;
  desafioId?: string;
  seed?: string;
}): FazedoresDesafioDTO {
  const { categoria, nivel, desafioId, seed } = opts;
  if (desafioId) {
    const found = findById(desafioId);
    if (found) return found;
  }
  let pool = [...FAZEDORES_BANK];
  if (categoria) pool = pool.filter((d) => d.categoria === categoria);
  if (nivel) pool = pool.filter((d) => d.nivel === nivel);
  if (pool.length === 0) pool = [...FAZEDORES_BANK];
  let idx = 0;
  if (seed) {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    idx = h % pool.length;
  } else {
    idx = Math.floor(Math.random() * pool.length);
  }
  return pool[idx]!;
}

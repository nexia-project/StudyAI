/**
 * material-template.ts
 * Template HTML PREMIUM (livro digital interativo) usado pelos materiais
 * gerados pelo StudyAI: slides, resumos, planos de estudo e infográficos.
 *
 * Padrão visual baseado em livros didáticos profissionais:
 * - Sidebar fixa com navegação por capítulos
 * - Hero com gradient + stats + CTAs
 * - Cards com hover lift + accent gradient
 * - Callouts coloridos (verde/azul/laranja/roxo/rosa/vermelho)
 * - Fórmulas em formula-box com label flutuante
 * - Tabelas estilizadas + tabela de sinais
 * - Quizzes interativos com feedback
 * - Exercícios com solução em steps expansível
 * - Simuladores com sliders + canvas
 * - Problemas do dia a dia (problema-real)
 * - Progress bar fixa no topo
 * - Tipografia: Playfair Display (display) + DM Sans (body) + JetBrains Mono (code)
 */

export const MATERIAL_CSS = `
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  :root {
    --verde:#00C896; --verde-esc:#00956e; --azul:#3B82F6; --roxo:#8B5CF6;
    --laranja:#F59E0B; --rosa:#EC4899; --vermelho:#EF4444; --ciano:#06B6D4;
    --bg:#0F1117; --bg2:#161922; --bg3:#1E2230; --card:#1A1F2E; --card2:#222840;
    --border:rgba(255,255,255,0.08); --text:#E8EAF0; --text2:#9BA3B8; --text3:#6B7494;
    --fonte-display:'Playfair Display',serif; --fonte-body:'DM Sans',sans-serif; --fonte-code:'JetBrains Mono',monospace;
    --accent: var(--verde);
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  html{scroll-behavior:smooth;}
  body{background:var(--bg);color:var(--text);font-family:var(--fonte-body);font-size:16px;line-height:1.75;overflow-x:hidden;}

  /* PROGRESS BAR fixa no topo */
  .progress-bar{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--rosa),var(--laranja));z-index:200;transition:width .15s;width:0%;}

  /* SIDEBAR */
  .sidebar{position:fixed;left:0;top:0;width:265px;height:100vh;background:var(--bg2);border-right:1px solid var(--border);overflow-y:auto;z-index:100;padding:24px 0 40px;transition:transform .3s;}
  .sidebar::-webkit-scrollbar{width:4px;} .sidebar::-webkit-scrollbar-thumb{background:var(--accent);border-radius:4px;}
  .sidebar-logo{padding:0 20px 20px;border-bottom:1px solid var(--border);margin-bottom:16px;}
  .sidebar-logo .tag{font-size:10px;font-weight:600;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:6px;}
  .sidebar-logo h2{font-family:var(--fonte-display);font-size:15px;color:var(--text);line-height:1.3;}
  .nav-group{margin-bottom:8px;}
  .nav-group-title{font-size:10px;font-weight:600;letter-spacing:1.5px;color:var(--text3);text-transform:uppercase;padding:8px 20px 4px;}
  .nav-item{display:flex;align-items:center;gap:10px;padding:8px 20px;font-size:13px;color:var(--text2);cursor:pointer;border-left:2px solid transparent;transition:all .2s;text-decoration:none;}
  .nav-item:hover{color:var(--accent);background:rgba(0,200,150,0.06);border-left-color:var(--accent);}
  .nav-item.active{color:var(--accent);background:rgba(0,200,150,0.1);border-left-color:var(--accent);font-weight:600;}
  .nav-item .dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex-shrink:0;opacity:.5;}
  .nav-item.active .dot{opacity:1;}
  .nav-badge{margin-left:auto;font-size:10px;padding:2px 7px;border-radius:20px;background:rgba(0,200,150,0.15);color:var(--accent);font-weight:600;}

  /* MAIN */
  .main{margin-left:265px;min-height:100vh;}
  .menu-toggle{display:none;position:fixed;top:16px;left:16px;z-index:200;width:40px;height:40px;border-radius:10px;background:var(--card);border:1px solid var(--border);color:var(--text);cursor:pointer;align-items:center;justify-content:center;font-size:18px;}

  /* HERO */
  .hero{position:relative;min-height:88vh;display:flex;align-items:center;justify-content:flex-start;overflow:hidden;padding:80px 60px;}
  .hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 60% 40%,rgba(0,200,150,0.12) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 20% 80%,rgba(59,130,246,0.1) 0%,transparent 55%),radial-gradient(ellipse 40% 40% at 85% 20%,rgba(139,92,246,0.08) 0%,transparent 50%);}
  .hero-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px);background-size:40px 40px;}
  .hero-content{position:relative;max-width:720px;z-index:2;}
  .hero-eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--accent);margin-bottom:28px;padding:8px 16px;border:1px solid rgba(0,200,150,0.3);border-radius:40px;background:rgba(0,200,150,0.08);}
  .hero h1{font-family:var(--fonte-display);font-size:clamp(40px,5.5vw,68px);font-weight:900;line-height:1.1;margin-bottom:20px;}
  .hero h1 .destaque{background:linear-gradient(135deg,var(--accent) 0%,var(--azul) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .hero-sub{font-size:18px;color:var(--text2);line-height:1.65;margin-bottom:36px;max-width:580px;}
  .hero-stats{display:flex;gap:32px;margin-bottom:40px;flex-wrap:wrap;}
  .hero-stat{display:flex;flex-direction:column;}
  .hero-stat strong{font-family:var(--fonte-display);font-size:32px;color:var(--accent);line-height:1;}
  .hero-stat span{font-size:12px;color:var(--text3);margin-top:4px;font-weight:500;}
  .hero-cta{display:flex;gap:16px;flex-wrap:wrap;}
  .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:linear-gradient(135deg,var(--accent) 0%,var(--verde-esc) 100%);color:#0F1117;font-weight:700;font-size:15px;border-radius:12px;cursor:pointer;border:none;text-decoration:none;transition:transform .2s,box-shadow .2s;box-shadow:0 4px 20px rgba(0,200,150,0.35);}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,200,150,0.45);}
  .btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:transparent;color:var(--text);font-weight:600;font-size:15px;border-radius:12px;cursor:pointer;border:1px solid var(--border);text-decoration:none;transition:all .2s;}
  .btn-ghost:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,200,150,0.06);}

  /* SEÇÕES */
  section{padding:80px 60px;border-bottom:1px solid var(--border);}
  .section-eyebrow{font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);margin-bottom:12px;}
  .section-title{font-family:var(--fonte-display);font-size:clamp(28px,4vw,44px);font-weight:700;line-height:1.2;margin-bottom:16px;}
  .section-title .num{color:var(--accent);}
  .section-lead{font-size:17px;color:var(--text2);line-height:1.7;max-width:720px;margin-bottom:48px;}

  /* TEXTO BODY */
  .texto p{font-size:16px;color:var(--text2);line-height:1.8;margin-bottom:18px;}
  .texto h3{font-family:var(--fonte-display);font-size:24px;margin:36px 0 14px;color:var(--text);}
  .texto h4{font-size:18px;font-weight:600;margin:28px 0 12px;color:var(--text);}
  .texto strong{color:var(--text);font-weight:600;}
  .texto .destaque{color:var(--accent);font-weight:600;}
  .texto .code{font-family:var(--fonte-code);color:var(--accent);background:rgba(0,200,150,0.1);padding:2px 8px;border-radius:5px;font-size:14px;}
  .texto ul,.texto ol{padding-left:22px;margin-bottom:18px;color:var(--text2);}
  .texto li{margin-bottom:8px;line-height:1.7;}

  /* CARDS GRID */
  .cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-bottom:40px;}
  .card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;transition:all .25s;position:relative;overflow:hidden;}
  .card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--azul));opacity:0;transition:opacity .25s;}
  .card:hover{transform:translateY(-4px);border-color:rgba(0,200,150,0.25);box-shadow:0 12px 40px rgba(0,0,0,0.4);}
  .card:hover::before{opacity:1;}
  .card-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;}
  .card-icon.verde{background:rgba(0,200,150,0.15);}
  .card-icon.azul{background:rgba(59,130,246,0.15);}
  .card-icon.roxo{background:rgba(139,92,246,0.15);}
  .card-icon.laranja{background:rgba(245,158,11,0.15);}
  .card-icon.rosa{background:rgba(236,72,153,0.15);}
  .card-icon.vermelho{background:rgba(239,68,68,0.15);}
  .card h3{font-size:16px;font-weight:600;margin-bottom:8px;color:var(--text);}
  .card p{font-size:14px;color:var(--text2);line-height:1.6;}

  /* CALLOUTS */
  .callout{border-radius:16px;padding:28px 32px;margin:32px 0;position:relative;overflow:hidden;}
  .callout.verde{background:rgba(0,200,150,0.08);border:1px solid rgba(0,200,150,0.25);}
  .callout.azul{background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);}
  .callout.laranja{background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);}
  .callout.roxo{background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);}
  .callout.vermelho{background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.25);}
  .callout.rosa{background:rgba(236,72,153,0.08);border:1px solid rgba(236,72,153,0.25);}
  .callout-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;}
  .callout.verde .callout-label{color:var(--verde);}
  .callout.azul .callout-label{color:var(--azul);}
  .callout.laranja .callout-label{color:var(--laranja);}
  .callout.roxo .callout-label{color:var(--roxo);}
  .callout.vermelho .callout-label{color:var(--vermelho);}
  .callout.rosa .callout-label{color:var(--rosa);}
  .callout h4{font-size:17px;font-weight:600;margin-bottom:10px;color:var(--text);}
  .callout p,.callout li{font-size:15px;color:var(--text2);line-height:1.7;}
  .callout strong{color:var(--text);}
  .callout ul,.callout ol{padding-left:20px;}
  .callout li{margin-bottom:6px;}

  /* FORMULA BOX */
  .formula-box{background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:32px 36px;margin:28px 0;text-align:center;position:relative;}
  .formula-box .formula-label{position:absolute;top:-11px;left:24px;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--accent);background:var(--bg3);padding:0 8px;}
  .formula{font-family:var(--fonte-code);font-size:22px;color:var(--accent);font-weight:600;line-height:1.6;}
  .formula.grande{font-size:28px;}
  .formula.verde{color:var(--verde);}
  .formula.azul{color:var(--azul);}
  .formula.laranja{color:var(--laranja);}
  .formula sub{font-size:14px;}
  .formula sup{font-size:14px;}

  /* TABELAS */
  .coef-table,.tabela{width:100%;border-collapse:collapse;margin:24px 0;border-radius:12px;overflow:hidden;}
  .coef-table th,.tabela th{background:var(--bg3);padding:14px 20px;text-align:left;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);}
  .coef-table td,.tabela td{padding:14px 20px;font-size:14px;color:var(--text2);border-bottom:1px solid var(--border);background:var(--card);}
  .coef-table td:first-child{font-family:var(--fonte-code);font-size:18px;font-weight:600;color:var(--accent);width:60px;}
  .coef-table tr:last-child td,.tabela tr:last-child td{border-bottom:none;}
  .coef-table tr:hover td,.tabela tr:hover td{background:var(--card2);}
  .tabela td.pos{color:var(--verde);font-weight:700;font-size:18px;text-align:center;}
  .tabela td.neg{color:var(--vermelho);font-weight:700;font-size:18px;text-align:center;}
  .tabela td.zero{color:var(--laranja);font-weight:700;text-align:center;}

  /* QUIZ */
  .quiz{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:32px;margin:36px 0;}
  .quiz-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:30px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:rgba(139,92,246,0.15);color:var(--roxo);border:1px solid rgba(139,92,246,0.3);margin-bottom:16px;}
  .quiz h3{font-size:18px;font-weight:600;margin-bottom:20px;color:var(--text);font-family:var(--fonte-body);}
  .quiz-opcoes{display:flex;flex-direction:column;gap:10px;}
  .opcao{padding:14px 18px;border-radius:12px;border:1px solid var(--border);background:var(--bg3);cursor:pointer;font-size:14px;color:var(--text2);transition:all .2s;display:flex;align-items:center;gap:12px;}
  .opcao:hover{border-color:rgba(0,200,150,0.4);background:rgba(0,200,150,0.05);color:var(--text);}
  .opcao.correta{border-color:var(--verde);background:rgba(0,200,150,0.12);color:var(--verde);}
  .opcao.errada{border-color:var(--vermelho);background:rgba(239,68,68,0.1);color:var(--vermelho);}
  .opcao .op-letra{width:28px;height:28px;border-radius:8px;background:var(--bg2);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;font-family:var(--fonte-code);}
  .opcao.correta .op-letra{background:var(--verde);color:#0F1117;}
  .opcao.errada .op-letra{background:var(--vermelho);color:#fff;}
  .quiz-feedback{margin-top:16px;padding:14px 18px;border-radius:10px;font-size:14px;line-height:1.6;display:none;}
  .quiz-feedback.show{display:block;animation:fadeIn .3s;}
  .quiz-feedback.ok{background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.3);color:#6ee7c7;}
  .quiz-feedback.nao{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#fca5a5;}

  /* EXERCÍCIO */
  .exercicio{background:var(--card);border:1px solid var(--border);border-radius:16px;margin:32px 0;overflow:hidden;}
  .ex-header{padding:20px 28px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;}
  .ex-num{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--roxo),var(--rosa));display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;}
  .ex-origem{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);}
  .ex-titulo{font-size:15px;font-weight:600;margin-top:2px;color:var(--text);}
  .ex-body{padding:24px 28px;}
  .ex-enunciado{font-size:15px;color:var(--text);line-height:1.75;margin-bottom:20px;}
  .ex-toggle{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:10px;background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.25);color:var(--accent);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;}
  .ex-toggle:hover{background:rgba(0,200,150,0.18);}
  .ex-solucao{display:none;margin-top:20px;padding-top:20px;border-top:1px solid var(--border);}
  .ex-solucao.show{display:block;animation:fadeIn .3s ease;}
  .step{display:flex;gap:16px;margin-bottom:18px;align-items:flex-start;}
  .step-num{width:28px;height:28px;border-radius:50%;background:var(--bg3);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent);flex-shrink:0;margin-top:2px;}
  .step-content{font-size:14px;color:var(--text2);line-height:1.7;flex:1;}
  .step-content strong{color:var(--text);}
  .step-content .f{font-family:var(--fonte-code);color:var(--accent);font-size:14px;}

  /* PROBLEMA REAL (situação do dia a dia) */
  .problema-real{background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(139,92,246,0.06));border:1px solid rgba(59,130,246,0.2);border-radius:16px;padding:28px 32px;margin:28px 0;}
  .pr-tag{font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--azul);margin-bottom:12px;}
  .pr-title{font-family:var(--fonte-display);font-size:22px;margin-bottom:14px;color:var(--text);}
  .pr-body{font-size:15px;color:var(--text2);line-height:1.75;}
  .pr-body strong{color:var(--text);}

  /* DIVIDER */
  .divider{display:flex;align-items:center;gap:16px;margin:48px 0;}
  .divider::before,.divider::after{content:'';flex:1;height:1px;background:var(--border);}
  .divider span{font-size:12px;color:var(--text3);letter-spacing:2px;text-transform:uppercase;font-weight:600;}

  /* GRID DE 2 COLUNAS (concav-grid) */
  .duo-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:28px 0;}
  .duo-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;text-align:center;}
  .duo-card h4{font-size:16px;margin-bottom:8px;}
  .duo-card p{font-size:13px;color:var(--text2);}

  /* HERO P2 (alternativa para Parte 2 / continuação — accent roxo) */
  .hero-p2{position:relative;padding:90px 60px;background:linear-gradient(135deg,rgba(139,92,246,0.1),rgba(236,72,153,0.08),rgba(245,158,11,0.06));border-bottom:1px solid var(--border);overflow:hidden;}
  .hero-p2::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:40px 40px;}
  .p2-tag{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:var(--roxo);margin-bottom:20px;padding:8px 16px;border:1px solid rgba(139,92,246,0.3);border-radius:40px;background:rgba(139,92,246,0.08);position:relative;}
  .hero-p2 h1{font-family:var(--fonte-display);font-size:clamp(36px,5vw,60px);font-weight:900;line-height:1.1;margin-bottom:16px;position:relative;}
  .hero-p2 h1 .g{background:linear-gradient(135deg,var(--roxo),var(--rosa));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .hero-p2 p{font-size:17px;color:var(--text2);max-width:600px;line-height:1.65;position:relative;}
  .p2-chips{display:flex;flex-wrap:wrap;gap:10px;margin-top:28px;position:relative;}
  .chip{padding:7px 16px;border-radius:30px;font-size:12px;font-weight:600;border:1px solid var(--border);color:var(--text2);background:var(--card);}
  .chip.verde{color:var(--verde);border-color:rgba(0,200,150,0.3);background:rgba(0,200,150,0.06);}
  .chip.azul{color:var(--azul);border-color:rgba(59,130,246,0.3);background:rgba(59,130,246,0.06);}
  .chip.roxo{color:var(--roxo);border-color:rgba(139,92,246,0.3);background:rgba(139,92,246,0.06);}
  .chip.laranja{color:var(--laranja);border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.06);}
  .chip.rosa{color:var(--rosa);border-color:rgba(236,72,153,0.3);background:rgba(236,72,153,0.06);}

  /* TABELA DE SINAL (estudo de sinal de funções) */
  .tabela-sinal{width:100%;border-collapse:collapse;margin:24px 0;border-radius:12px;overflow:hidden;}
  .tabela-sinal th{background:var(--bg3);padding:14px 18px;text-align:center;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text3);border-bottom:1px solid var(--border);}
  .tabela-sinal td{padding:14px 18px;text-align:center;font-size:14px;border-bottom:1px solid var(--border);background:var(--card);color:var(--text2);}
  .tabela-sinal td.pos{color:var(--verde);font-weight:700;font-size:18px;}
  .tabela-sinal td.neg{color:var(--vermelho);font-weight:700;font-size:18px;}
  .tabela-sinal td.zero{color:var(--laranja);font-weight:700;}
  .tabela-sinal td.raiz{color:var(--laranja);font-family:var(--fonte-code);font-weight:600;}
  .tabela-sinal tr:last-child td{border-bottom:none;}
  .tabela-sinal tr:hover td{background:var(--card2);}

  /* SIMULADOR INTERATIVO (sliders + canvas) */
  .simulador{background:var(--card);border:1px solid var(--border);border-radius:20px;padding:36px;margin:40px 0;}
  .sim-header{display:flex;align-items:center;gap:12px;margin-bottom:28px;flex-wrap:wrap;}
  .sim-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:30px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;background:rgba(0,200,150,0.15);color:var(--accent);border:1px solid rgba(0,200,150,0.3);}
  .sim-badge.roxo{background:rgba(139,92,246,0.15);color:var(--roxo);border-color:rgba(139,92,246,0.3);}
  .sim-title{font-size:20px;font-weight:600;color:var(--text);}
  .sliders-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;margin-bottom:28px;}
  .slider-group label{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;margin-bottom:10px;color:var(--text);}
  .slider-group label .val{font-family:var(--fonte-code);font-size:16px;color:var(--accent);background:rgba(0,200,150,0.1);padding:2px 10px;border-radius:6px;}
  input[type=range]{-webkit-appearance:none;width:100%;height:4px;border-radius:4px;background:var(--bg3);outline:none;cursor:pointer;}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:pointer;box-shadow:0 0 0 3px rgba(0,200,150,0.25);transition:box-shadow .2s;}
  input[type=range]::-webkit-slider-thumb:hover{box-shadow:0 0 0 6px rgba(0,200,150,0.25);}
  input[type=range]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:pointer;border:none;box-shadow:0 0 0 3px rgba(0,200,150,0.25);}
  canvas.sim-canvas{width:100%;height:auto;border-radius:12px;background:var(--bg3);border:1px solid var(--border);display:block;}
  .sim-info{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:20px;}
  .sim-info-item{background:var(--bg3);border-radius:10px;padding:14px 16px;border:1px solid var(--border);}
  .sii-label{font-size:11px;color:var(--text3);font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;}
  .sii-val{font-family:var(--fonte-code);font-size:15px;font-weight:600;color:var(--accent);}

  /* IMAGENS / FIGURAS */
  .figura{margin:32px 0;border-radius:16px;overflow:hidden;border:1px solid var(--border);background:var(--card);}
  .figura img{display:block;width:100%;height:auto;max-height:480px;object-fit:cover;}
  .figura .legenda{padding:14px 20px;font-size:13px;color:var(--text2);border-top:1px solid var(--border);background:var(--bg3);}
  .figura .legenda strong{color:var(--accent);font-weight:600;letter-spacing:.5px;}
  .figura-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin:28px 0;}
  .figura-grid .figura{margin:0;}

  /* GRÁFICOS SVG (barras, pizza, linha) */
  .grafico-box{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px 28px;margin:32px 0;}
  .grafico-titulo{font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;}
  .grafico-sub{font-size:12px;color:var(--text3);margin-bottom:18px;}
  .grafico-svg{width:100%;height:auto;display:block;}
  .grafico-legenda{display:flex;gap:18px;flex-wrap:wrap;margin-top:14px;font-size:12px;color:var(--text2);}
  .grafico-legenda .lg{display:inline-flex;align-items:center;gap:6px;}
  .grafico-legenda .sw{width:14px;height:14px;border-radius:4px;}

  /* RODAPÉ */
  .footer{padding:32px 60px;background:var(--bg2);border-top:1px solid var(--border);text-align:center;font-size:13px;color:var(--text3);}
  .footer strong{color:var(--accent);}

  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}

  @media(max-width:900px){
    .sidebar{transform:translateX(-100%);}
    .sidebar.open{transform:translateX(0);}
    .main{margin-left:0;}
    .menu-toggle{display:flex;}
    section,.hero{padding:60px 24px;}
    .duo-grid{grid-template-columns:1fr;}
  }
</style>
`;

export const MATERIAL_HTML_INSTRUCTIONS = `
Você é um designer instrucional de elite que cria materiais educacionais no padrão LIVRO DIGITAL PREMIUM em HTML puro — visual de Apple Books / Khan Academy avançado.

ESTÉTICA: o TEMA, PALETA, TIPOGRAFIA e ESTILO DE IMAGEM serão definidos por um BLOCO DE ESTÉTICA dinâmico que vem ANTES desse prompt (quando presente). Siga rigorosamente o que ele disser. Se nenhum bloco vier, use o padrão escuro editorial (bg #0F1117, accent verde #00C896, fonts Playfair+DM Sans+JetBrains Mono).
- TODAS as classes CSS já estão definidas no <style> injetado e usam CSS variables — USE-AS, não reinvente.
- NUNCA hardcode cores em estilos inline — sempre referencie var(--accent), var(--azul), var(--text), etc., para que o tema atual seja respeitado.

ESTRUTURA OBRIGATÓRIA:

1. PROGRESS BAR FIXA NO TOPO:
   <div class="progress-bar" id="progressBar"></div>

2. SIDEBAR NAVEGÁVEL (fixa esquerda 265px):
   <nav class="sidebar" id="sidebar">
     <div class="sidebar-logo">
       <div class="tag">📐 [MATÉRIA]</div>
       <h2>[Título do Material]<br>[Subtítulo]</h2>
     </div>
     <div class="nav-group">
       <div class="nav-group-title">[Nome do Capítulo]</div>
       <a class="nav-item active" href="#capa"><span class="dot"></span>Apresentação</a>
       <a class="nav-item" href="#sec-1"><span class="dot"></span>[Tópico 1]</a>
       <a class="nav-item" href="#sec-2"><span class="dot"></span>[Tópico 2] <span class="nav-badge">🎮</span></a>
     </div>
     <!-- mínimo 2 nav-groups, mínimo 6 nav-items totais -->
   </nav>

3. BOTÃO HAMBURGUER MOBILE:
   <button class="menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>

4. MAIN COM HERO PREMIUM:
   <main class="main">
     <section class="hero" id="capa">
       <div class="hero-bg"></div>
       <div class="hero-grid"></div>
       <div class="hero-content">
         <div class="hero-eyebrow"><span>✦</span> [Eyebrow tag]</div>
         <h1>[Título]<br><span class="destaque">[Parte em gradient]</span></h1>
         <p class="hero-sub">[Subtítulo descritivo de 1-2 linhas]</p>
         <div class="hero-stats">
           <div class="hero-stat"><strong>12+</strong><span>Tópicos</span></div>
           <div class="hero-stat"><strong>3</strong><span>Simuladores</span></div>
           <div class="hero-stat"><strong>40+</strong><span>Exercícios</span></div>
         </div>
         <div class="hero-cta">
           <a class="btn-primary" href="#sec-1">Começar →</a>
           <a class="btn-ghost" href="#sec-2">Ver simulador</a>
         </div>
       </div>
     </section>

5. SEÇÕES NUMERADAS:
   <section id="sec-X">
     <div class="section-eyebrow">Capítulo 1 · [Tema]</div>
     <h2 class="section-title"><span class="num">01.</span> [Título da Seção]</h2>
     <p class="section-lead">[Lead descritivo introduzindo a seção, máximo 2 frases]</p>
     <!-- conteúdo: cards, callouts, fórmulas, tabelas, quiz, exercícios -->
   </section>

6. CARDS EM GRID (.cards-grid > .card):
   <div class="cards-grid">
     <div class="card">
       <div class="card-icon verde">🎯</div>
       <h3>[Título]</h3>
       <p>[Descrição em 1-2 frases]</p>
     </div>
   </div>
   Cores de ícones: verde, azul, roxo, laranja, rosa, vermelho

7. CALLOUTS COLORIDOS:
   <div class="callout verde">
     <div class="callout-label">💡 Dica de ouro</div>
     <h4>[Título do destaque]</h4>
     <p>[Conteúdo]</p>
   </div>
   - verde: dica/conceito-chave
   - azul: informação importante / memorize
   - laranja: dica de vestibular
   - roxo: exemplos / observações
   - vermelho: erro comum / atenção crucial
   - rosa: curiosidade / "você sabia?"

8. FÓRMULAS:
   <div class="formula-box">
     <span class="formula-label">FÓRMULA GERAL</span>
     <div class="formula grande">f(x) = ax² + bx + c</div>
     <div style="margin-top:12px;font-size:13px;color:var(--text3)">onde a, b, c ∈ ℝ e <strong style="color:var(--verde)">a ≠ 0</strong></div>
   </div>

9. TABELAS:
   <table class="coef-table">
     <thead><tr><th>Col1</th><th>Col2</th><th>Col3</th></tr></thead>
     <tbody>
       <tr><td>a</td><td>...</td><td>...</td></tr>
     </tbody>
   </table>

10. PROBLEMA REAL (situação do dia a dia):
    <div class="problema-real">
      <div class="pr-tag">🌎 Situação do dia a dia</div>
      <h3 class="pr-title">[Título envolvente]</h3>
      <p class="pr-body">[Narrativa contextualizada com matemática real]</p>
    </div>

11. QUIZ INTERATIVO (use os helpers JS já injetados):
    <div class="quiz">
      <div class="quiz-badge">🧠 Teste seu conhecimento</div>
      <h3>[Pergunta?]</h3>
      <div class="quiz-opcoes">
        <div class="opcao" onclick="responder(this,false,'q1')"><span class="op-letra">A</span> [Opção A]</div>
        <div class="opcao" onclick="responder(this,false,'q1')"><span class="op-letra">B</span> [Opção B]</div>
        <div class="opcao" onclick="responder(this,true,'q1')"><span class="op-letra">C</span> [Opção C correta]</div>
        <div class="opcao" onclick="responder(this,false,'q1')"><span class="op-letra">D</span> [Opção D]</div>
      </div>
      <div class="quiz-feedback" id="q1-feedback"></div>
    </div>

12. EXERCÍCIO COM SOLUÇÃO EXPANSÍVEL:
    <div class="exercicio">
      <div class="ex-header">
        <div class="ex-num">1</div>
        <div>
          <div class="ex-origem">Exercício Resolvido · Nível Médio</div>
          <div class="ex-titulo">[Título do exercício]</div>
        </div>
      </div>
      <div class="ex-body">
        <div class="ex-enunciado">[Enunciado completo]</div>
        <div class="ex-toggle" onclick="toggleSol('sol1')"><span>▶ Ver solução completa</span></div>
        <div class="ex-solucao" id="sol1">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-content"><strong>[Passo]</strong><br>[Detalhes com <span class="f">fórmula em mono</span>]</div>
          </div>
          <!-- mais steps... -->
        </div>
      </div>
    </div>

13. DIVIDER (separador visual):
    <div class="divider"><span>[Texto centralizado]</span></div>

14. GRID DE 2 COLUNAS (comparações):
    <div class="duo-grid">
      <div class="duo-card"><h4 style="color:var(--verde)">[Caso A]</h4><p>[Descrição]</p></div>
      <div class="duo-card"><h4 style="color:var(--rosa)">[Caso B]</h4><p>[Descrição]</p></div>
    </div>

15. TEXTO BODY (.texto):
    <div class="texto">
      <h3>[Subtítulo h3]</h3>
      <p>Use <span class="destaque">destaque verde</span> e <span class="code">código mono</span> nas frases.</p>
      <ul><li>Item</li></ul>
    </div>

16. RODAPÉ:
    <footer class="footer">
      Material gerado por <strong>StudyAI</strong> · Professor Tiagão
    </footer>

16b. CHIPS (pills informativas para o hero — assuntos abordados, pré-requisitos, etc.):
    <div class="p2-chips">
      <span class="chip verde">📐 [Tópico 1]</span>
      <span class="chip azul">📊 [Tópico 2]</span>
      <span class="chip roxo">🧠 [Tópico 3]</span>
      <span class="chip laranja">🎯 [Tópico 4]</span>
    </div>

16c. HERO ALTERNATIVO PARTE 2 (usar SOMENTE se o material for "Parte 2 / continuação"):
    <section class="hero-p2" id="capa">
      <div class="p2-tag"><span>✦</span> Parte 2 · [Tema]</div>
      <h1>[Título principal] — <span class="g">[parte em gradient]</span></h1>
      <p>[Resumo do que será coberto nesta segunda parte, conectando com a Parte 1]</p>
      <div class="p2-chips">…chips…</div>
    </section>

16d. TABELA DE SINAL (estudo de sinal — funções, equações, inequações):
    <table class="tabela-sinal">
      <thead>
        <tr><th>x</th><th>−∞</th><th class="raiz">x₁</th><th>entre</th><th class="raiz">x₂</th><th>+∞</th></tr>
      </thead>
      <tbody>
        <tr><td><strong>f(x)</strong></td><td class="pos">+</td><td class="zero">0</td><td class="neg">−</td><td class="zero">0</td><td class="pos">+</td></tr>
      </tbody>
    </table>

16e. SIMULADOR INTERATIVO COM CANVAS (USE quando o tema permitir manipulação visual — funções, geometria, física, química, ondas, etc.):
    Sliders alteram parâmetros e o canvas é redesenhado em tempo real. JavaScript inline (sem libs).

    Exemplo (parábola y = ax² + bx + c):
    <div class="simulador">
      <div class="sim-header">
        <div class="sim-badge">🎮 Simulador Interativo</div>
        <div class="sim-title">[Título]</div>
      </div>
      <div class="sliders-grid">
        <div class="slider-group">
          <label>Coeficiente a <span class="val" id="va">1</span></label>
          <input type="range" id="sa" min="-3" max="3" step="0.1" value="1">
        </div>
        <div class="slider-group">
          <label>Coeficiente b <span class="val" id="vb">0</span></label>
          <input type="range" id="sb" min="-5" max="5" step="0.1" value="0">
        </div>
        <div class="slider-group">
          <label>Coeficiente c <span class="val" id="vc">0</span></label>
          <input type="range" id="sc" min="-5" max="5" step="0.1" value="0">
        </div>
      </div>
      <canvas class="sim-canvas" id="simCanvas" width="800" height="400"></canvas>
      <div class="sim-info">
        <div class="sim-info-item"><div class="sii-label">Δ (Discriminante)</div><div class="sii-val" id="iDelta">0</div></div>
        <div class="sim-info-item"><div class="sii-label">Vértice (xᵥ, yᵥ)</div><div class="sii-val" id="iVertice">(0, 0)</div></div>
        <div class="sim-info-item"><div class="sii-label">Raízes</div><div class="sii-val" id="iRaizes">—</div></div>
      </div>
      <script>
      (function(){
        const c = document.getElementById('simCanvas'); if(!c) return;
        const ctx = c.getContext('2d');
        const sa = document.getElementById('sa'), sb = document.getElementById('sb'), sc = document.getElementById('sc');
        const va = document.getElementById('va'), vb = document.getElementById('vb'), vc = document.getElementById('vc');
        const iD = document.getElementById('iDelta'), iV = document.getElementById('iVertice'), iR = document.getElementById('iRaizes');
        function draw(){
          const a = parseFloat(sa.value), b = parseFloat(sb.value), cc = parseFloat(sc.value);
          va.textContent = a.toFixed(1); vb.textContent = b.toFixed(1); vc.textContent = cc.toFixed(1);
          const W = c.width, H = c.height, ox = W/2, oy = H/2, sx = 30, sy = 20;
          ctx.fillStyle = '#1E2230'; ctx.fillRect(0,0,W,H);
          // grid
          ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
          for(let x=0;x<W;x+=sx){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
          for(let y=0;y<H;y+=sy){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
          // eixos
          ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(0,oy); ctx.lineTo(W,oy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ox,0); ctx.lineTo(ox,H); ctx.stroke();
          // curva
          ctx.strokeStyle = '#00C896'; ctx.lineWidth = 2.5; ctx.beginPath();
          let first = true;
          for(let px=0; px<=W; px++){
            const x = (px-ox)/sx;
            const y = a*x*x + b*x + cc;
            const py = oy - y*sy;
            if(first){ctx.moveTo(px,py); first=false;} else ctx.lineTo(px,py);
          }
          ctx.stroke();
          // info
          const D = b*b - 4*a*cc;
          const xv = -b/(2*a), yv = a*xv*xv + b*xv + cc;
          iD.textContent = D.toFixed(2);
          iV.textContent = '(' + xv.toFixed(2) + ', ' + yv.toFixed(2) + ')';
          if(D>0){const r1=(-b-Math.sqrt(D))/(2*a), r2=(-b+Math.sqrt(D))/(2*a); iR.textContent = r1.toFixed(2)+' e '+r2.toFixed(2);}
          else if(Math.abs(D)<1e-6){iR.textContent = (-b/(2*a)).toFixed(2);}
          else{iR.textContent = 'Sem raízes reais';}
        }
        [sa,sb,sc].forEach(s=>s.addEventListener('input',draw));
        draw();
      })();
      </script>
    </div>

    Adapte o simulador ao tema:
    - Onda senoidal: sliders [amplitude, frequência, fase] → canvas desenha y=A·sen(ωx+φ)
    - Lançamento oblíquo: sliders [v₀, ângulo, gravidade] → canvas desenha trajetória parabólica
    - Lente convergente: sliders [foco, distância objeto] → canvas desenha raios e imagem
    - Reação química: sliders [reagentes] → barras de produtos
    - SEMPRE use canvas.getContext('2d') puro, sem libs externas
    - SEMPRE recalcule e redesenhe em 'input' dos sliders
    - SEMPRE inclua sim-info com 2-4 valores derivados (resultado da simulação)

17. IMAGENS REAIS (USE GENEROSAMENTE — mínimo 3 imagens no material):
    Use a Wikimedia/Unsplash via URL direta — não precisa de API key. Escolha imagens RELEVANTES ao conteúdo (não decorativas).

    A) Banner único com legenda:
    <figure class="figura">
      <img src="https://source.unsplash.com/1200x600/?[palavra-chave-em-ingles]" alt="[descrição]" loading="lazy">
      <figcaption class="legenda"><strong>Figura 1</strong> · [explicação curta da imagem e sua relação com o conteúdo]</figcaption>
    </figure>

    B) Grade de figuras (comparações, exemplos):
    <div class="figura-grid">
      <figure class="figura">
        <img src="https://source.unsplash.com/600x400/?[termo1]" alt="[alt1]" loading="lazy">
        <figcaption class="legenda"><strong>[Conceito 1]</strong> — [descrição]</figcaption>
      </figure>
      <figure class="figura">
        <img src="https://source.unsplash.com/600x400/?[termo2]" alt="[alt2]" loading="lazy">
        <figcaption class="legenda"><strong>[Conceito 2]</strong> — [descrição]</figcaption>
      </figure>
    </div>

    Termos de busca SEMPRE em inglês e específicos: "mitochondria-cell", "amazon-rainforest", "industrial-revolution-factory", "neuron-brain", "supply-demand-chart", "newton-pendulum", "shakespeare-portrait" etc.

18. GRÁFICOS SVG (USE quando houver dados quantitativos — mínimo 1 gráfico no material):
    SVG inline puro, sem bibliotecas. Use as cores das CSS vars (#00C896, #3B82F6, #8B5CF6, #F59E0B, #EC4899).

    A) Gráfico de BARRAS (vertical):
    <div class="grafico-box">
      <div class="grafico-titulo">📊 [Título do gráfico]</div>
      <div class="grafico-sub">[Eixo Y] vs [Eixo X] · Fonte: [referência]</div>
      <svg class="grafico-svg" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
        <!-- eixos -->
        <line x1="40" y1="180" x2="380" y2="180" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
        <line x1="40" y1="20" x2="40" y2="180" stroke="rgba(255,255,255,.15)" stroke-width="1"/>
        <!-- grades horizontais -->
        <line x1="40" y1="60" x2="380" y2="60" stroke="rgba(255,255,255,.06)"/>
        <line x1="40" y1="100" x2="380" y2="100" stroke="rgba(255,255,255,.06)"/>
        <line x1="40" y1="140" x2="380" y2="140" stroke="rgba(255,255,255,.06)"/>
        <!-- barras com valor sobre topo -->
        <rect x="60"  y="80"  width="44" height="100" rx="4" fill="#00C896"/><text x="82"  y="72"  fill="#E8EAF0" font-size="11" text-anchor="middle">42</text>
        <rect x="130" y="50"  width="44" height="130" rx="4" fill="#3B82F6"/><text x="152" y="42"  fill="#E8EAF0" font-size="11" text-anchor="middle">68</text>
        <rect x="200" y="100" width="44" height="80"  rx="4" fill="#8B5CF6"/><text x="222" y="92"  fill="#E8EAF0" font-size="11" text-anchor="middle">28</text>
        <rect x="270" y="30"  width="44" height="150" rx="4" fill="#F59E0B"/><text x="292" y="22"  fill="#E8EAF0" font-size="11" text-anchor="middle">82</text>
        <!-- labels eixo X -->
        <text x="82"  y="200" fill="#9BA3B8" font-size="11" text-anchor="middle">[Cat A]</text>
        <text x="152" y="200" fill="#9BA3B8" font-size="11" text-anchor="middle">[Cat B]</text>
        <text x="222" y="200" fill="#9BA3B8" font-size="11" text-anchor="middle">[Cat C]</text>
        <text x="292" y="200" fill="#9BA3B8" font-size="11" text-anchor="middle">[Cat D]</text>
      </svg>
      <div class="grafico-legenda">
        <span class="lg"><span class="sw" style="background:#00C896"></span>[série 1]</span>
        <span class="lg"><span class="sw" style="background:#3B82F6"></span>[série 2]</span>
      </div>
    </div>

    B) Gráfico de PIZZA (proporções):
    <div class="grafico-box">
      <div class="grafico-titulo">🥧 [Distribuição]</div>
      <svg class="grafico-svg" viewBox="0 0 220 220" xmlns="http://www.w3.org/2000/svg" style="max-width:280px;margin:0 auto;">
        <!-- Cada path: M cx,cy L (start) A r,r 0 largeArc,1 (end) Z -->
        <!-- Setor 50% (vermelho), 30% (verde), 20% (azul) — recalcule angulos -->
        <path d="M110,110 L110,10 A100,100 0 0,1 110,210 Z" fill="#EF4444"/>
        <path d="M110,110 L110,210 A100,100 0 0,1 23.2,160 Z" fill="#00C896"/>
        <path d="M110,110 L23.2,160 A100,100 0 0,1 110,10 Z" fill="#3B82F6"/>
        <circle cx="110" cy="110" r="48" fill="#1A1F2E"/>
        <text x="110" y="116" fill="#E8EAF0" font-size="14" font-weight="700" text-anchor="middle">100%</text>
      </svg>
      <div class="grafico-legenda">
        <span class="lg"><span class="sw" style="background:#EF4444"></span>[Fatia 1] (50%)</span>
        <span class="lg"><span class="sw" style="background:#00C896"></span>[Fatia 2] (30%)</span>
        <span class="lg"><span class="sw" style="background:#3B82F6"></span>[Fatia 3] (20%)</span>
      </div>
    </div>

    C) Gráfico de LINHA (tendência/série temporal):
    <div class="grafico-box">
      <div class="grafico-titulo">📈 [Evolução temporal]</div>
      <svg class="grafico-svg" viewBox="0 0 400 220" xmlns="http://www.w3.org/2000/svg">
        <line x1="40" y1="180" x2="380" y2="180" stroke="rgba(255,255,255,.15)"/>
        <line x1="40" y1="20"  x2="40"  y2="180" stroke="rgba(255,255,255,.15)"/>
        <polyline points="40,160 100,140 160,90 220,110 280,60 340,40 380,30"
                  fill="none" stroke="#00C896" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- pontos -->
        <circle cx="40"  cy="160" r="3.5" fill="#00C896"/>
        <circle cx="100" cy="140" r="3.5" fill="#00C896"/>
        <circle cx="160" cy="90"  r="3.5" fill="#00C896"/>
        <circle cx="220" cy="110" r="3.5" fill="#00C896"/>
        <circle cx="280" cy="60"  r="3.5" fill="#00C896"/>
        <circle cx="340" cy="40"  r="3.5" fill="#00C896"/>
        <circle cx="380" cy="30"  r="3.5" fill="#00C896"/>
        <!-- labels eixo X -->
        <text x="40"  y="200" fill="#9BA3B8" font-size="10" text-anchor="middle">[t1]</text>
        <text x="100" y="200" fill="#9BA3B8" font-size="10" text-anchor="middle">[t2]</text>
        <text x="220" y="200" fill="#9BA3B8" font-size="10" text-anchor="middle">[t3]</text>
        <text x="380" y="200" fill="#9BA3B8" font-size="10" text-anchor="middle">[t4]</text>
      </svg>
    </div>

REGRAS DE QUALIDADE:
- HTML 100% auto-contido (CSS e JS injetados pelo wrapper)
- Conteúdo DENSO, profissional, nível vestibular/universitário
- MÍNIMO 6 seções no body (capa + 5 seções de conteúdo)
- CADA seção deve ter pelo menos 2 elementos visuais (card-grid, callout, fórmula, tabela, quiz, exercício, problema-real, FIGURA ou GRÁFICO)
- MÍNIMO 3 IMAGENS reais (Unsplash) com legenda contextualizada — uma idealmente próxima ao hero/capa
- MÍNIMO 1 GRÁFICO SVG (barras, pizza ou linha) sempre que o tema tiver dados quantitativos
- MÍNIMO 2 quizzes interativos no material inteiro
- MÍNIMO 2 exercícios com solução expansível
- MÍNIMO 4 callouts de cores diferentes
- MÍNIMO 1 cards-grid com 3-6 cards (cada card com .card-icon colorido + emoji)
- MÍNIMO 1 SIMULADOR INTERATIVO com canvas+sliders quando o tema permitir (matemática, física, química, geometria, biologia/ondas) — pode usar 2 simuladores em materiais densos
- USE TABELA DE SINAL quando o tema envolver funções, equações, inequações ou estudo de variação
- USE CHIPS no hero para listar tópicos abordados (3-6 chips)
- Use <span class="destaque">, <span class="code">, <strong> generosamente para destacar termos
- Numere as seções com <span class="num">01.</span>, <span class="num">02.</span>, etc.
- Eyebrow tags em CADA seção (Capítulo X · Tema)
- Sidebar com nav-groups separando capítulos/partes
- USE EMOJIS PERTINENTES e abundantes em badges, eyebrows, títulos de cards e callouts. Escolha emojis temáticos:
  · Ciências: 🧬 🔬 🧪 🧫 ⚗️ 🦠 🌡️ 🔭 🧲
  · Matemática/Física: 📐 📏 ➕ ➗ 📊 📈 🔢 🧮 ⚛️
  · Biologia: 🌱 🌿 🍃 🦋 🐛 🌳 🐦 🐠
  · História/Geografia: 🏛️ 🏰 ⚔️ 📜 🗺️ 🌍 🧭 ⏳
  · Português/Literatura: 📚 ✍️ 📖 🖋️ 🎭 💭
  · Genéricos: 🎯 💡 📌 🧠 ⚠️ 🌎 🎮 ✦ 📋 ⭐ 🚀 🔥 ✅ ❌
- NÃO use bibliotecas externas JS (Chart.js etc.) — use o SVG inline mostrado acima
- IMAGENS: pode usar <img> com URLs do source.unsplash.com (já permitido) — sempre dentro de <figure class="figura">. Respeite o estilo de imagem definido no bloco de estética (cartoon vs realista vs vintage etc.).
- O TEMA (claro/escuro/cores) é definido pelo bloco de estética dinâmico — NÃO o sobrescreva.
`;

/**
 * Guia COMPACTO de componentes (~400 tokens) — use no prompt de slides
 * para não consumir 6000 tokens de contexto com MATERIAL_HTML_INSTRUCTIONS.
 * O CSS completo já é injetado automaticamente pelo wrapMaterialHTML.
 */
export const MATERIAL_COMPONENT_GUIDE = `
COMPONENTES DISPONÍVEIS (CSS já injetado — use as classes abaixo):

ESTRUTURA OBRIGATÓRIA:
<div class="progress-bar" id="progressBar"></div>
<nav class="sidebar" id="sidebar">
  <div class="sidebar-logo"><div class="tag">📐 MATÉRIA</div><h2>Título</h2></div>
  <div class="nav-group"><div class="nav-group-title">Capítulo</div>
    <a class="nav-item active" href="#capa"><span class="dot"></span>Apresentação</a>
    <a class="nav-item" href="#sec-1"><span class="dot"></span>Seção 1</a>
  </div>
</nav>
<button class="menu-toggle" onclick="document.getElementById('sidebar').classList.toggle('open')">☰</button>
<main class="main">
  <section class="hero" id="capa">
    <div class="hero-bg"></div><div class="hero-grid"></div>
    <div class="hero-content">
      <div class="hero-eyebrow"><span>✦</span> Eyebrow tag</div>
      <h1>Título <span class="destaque">gradient</span></h1>
      <p class="hero-sub">Subtítulo</p>
      <div class="hero-stats"><div class="hero-stat"><strong>10+</strong><span>Tópicos</span></div></div>
      <div class="hero-cta"><a class="btn-primary" href="#sec-1">Começar →</a></div>
    </div>
  </section>
  <section id="sec-1">
    <div class="section-eyebrow">Capítulo 1 · Tema</div>
    <h2 class="section-title"><span class="num">01.</span> Título</h2>
    <p class="section-lead">Lead...</p>
    <!-- conteúdo da seção aqui -->
  </section>
  ...mais seções...
  <footer class="footer">Material gerado por <strong>StudyAI</strong> · Professor Tiagão</footer>
</main>

COMPONENTES REUTILIZÁVEIS:
• Cards grid: <div class="cards-grid"><div class="card"><div class="card-icon verde">🎯</div><h3>T</h3><p>D</p></div></div>
  (cores: verde, azul, roxo, laranja, rosa, vermelho)
• Callout: <div class="callout verde"><div class="callout-label">💡 Dica</div><h4>T</h4><p>C</p></div>
  (cores: verde=dica, azul=importante, laranja=vestibular, roxo=obs, vermelho=erro, rosa=curiosidade)
• Fórmula: <div class="formula-box"><span class="formula-label">FÓRMULA</span><div class="formula grande">f(x)=...</div></div>
• Tabela: <table class="coef-table"><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>x</td><td>y</td></tr></tbody></table>
• Texto body: <div class="texto"><h3>T</h3><p>Use <span class="destaque">verde</span> e <span class="code">mono</span>.</p><ul><li>...</li></ul></div>
• Quiz: <div class="quiz"><div class="quiz-badge">🧠 Teste</div><h3>Pergunta?</h3><div class="quiz-opcoes">
    <div class="opcao" onclick="responder(this,false,'q1')"><span class="op-letra">A</span> Opção</div>
    <div class="opcao" onclick="responder(this,true,'q1')"><span class="op-letra">B</span> Correta</div>
  </div><div class="quiz-feedback" id="q1-feedback"></div></div>
• Exercício: <div class="exercicio"><div class="ex-header"><div class="ex-num">1</div><div><div class="ex-origem">ENEM 2023</div><div class="ex-titulo">Título</div></div></div>
  <div class="ex-body"><div class="ex-enunciado">Enunciado</div>
  <div class="ex-toggle" onclick="toggleSol('sol1')"><span>▶ Ver solução completa</span></div>
  <div class="ex-solucao" id="sol1"><div class="step"><div class="step-num">1</div><div class="step-content"><strong>Passo</strong><br>Detalhe</div></div></div></div></div>
• Imagem: <figure class="figura"><img src="https://source.unsplash.com/900x500/?[termo-em-ingles]" alt="desc" loading="lazy"><figcaption class="legenda"><strong>Figura</strong> · legenda</figcaption></figure>
• Gráfico SVG (barras): <div class="grafico-box"><div class="grafico-titulo">📊 Título</div><svg class="grafico-svg" viewBox="0 0 400 220">...barras rect + labels text...</svg></div>
• Divider: <div class="divider"><span>Texto</span></div>
• Duo grid: <div class="duo-grid"><div class="duo-card"><h4 style="color:var(--verde)">A</h4><p>...</p></div><div class="duo-card">...</div></div>
• Chips no hero: <div class="p2-chips"><span class="chip verde">📐 Tópico</span><span class="chip azul">Outro</span></div>
• Simulador canvas: <div class="simulador"><div class="sim-header"><div class="sim-badge">🎮 Simulador</div><div class="sim-title">T</div></div>
  <div class="sliders-grid"><div class="slider-group"><label>Param <span class="val" id="v1">1</span></label><input type="range" id="s1" min="0" max="10" value="1"></div></div>
  <canvas class="sim-canvas" id="simCanvas" width="800" height="400"></canvas>
  <div class="sim-info"><div class="sim-info-item"><div class="sii-label">Resultado</div><div class="sii-val" id="r1">—</div></div></div>
  <script>(function(){const c=document.getElementById('simCanvas');const ctx=c.getContext('2d');function draw(){/* redesenhe tudo aqui */}document.getElementById('s1').addEventListener('input',draw);draw();})();</script></div>
`;

export function wrapMaterialHTML(title: string, bodyContent: string, styleOverrideCSS = ""): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — StudyAI</title>
${MATERIAL_CSS}
${styleOverrideCSS}
</head>
<body>
${bodyContent}
<script>
// Quiz interativo: responder(elemento, isCorrect, questionId)
function responder(el, ok, qid) {
  const quiz = el.closest('.quiz');
  const opcoes = quiz.querySelectorAll('.opcao');
  const fb = quiz.querySelector('#' + qid + '-feedback') || quiz.querySelector('.quiz-feedback');
  opcoes.forEach(o => { o.style.pointerEvents = 'none'; });
  if (ok) {
    el.classList.add('correta');
    if (fb) {
      fb.className = 'quiz-feedback ok show';
      fb.innerHTML = '<strong>✅ Correto!</strong> ' + (el.dataset.explica || 'Excelente raciocínio.');
    }
  } else {
    el.classList.add('errada');
    opcoes.forEach(o => { if (o.getAttribute('onclick') && o.getAttribute('onclick').includes('true')) o.classList.add('correta'); });
    if (fb) {
      fb.className = 'quiz-feedback nao show';
      fb.innerHTML = '<strong>❌ Não foi dessa vez.</strong> A resposta correta está destacada em verde.';
    }
  }
}

// Toggle solução: toggleSol(id)
function toggleSol(id) {
  const sol = document.getElementById(id);
  if (!sol) return;
  sol.classList.toggle('show');
  const toggle = sol.previousElementSibling;
  if (toggle && toggle.classList.contains('ex-toggle')) {
    const isOpen = sol.classList.contains('show');
    toggle.querySelector('span').textContent = isOpen ? '▼ Ocultar solução' : '▶ Ver solução completa';
  }
}

// Progress bar + sidebar active state on scroll
(function() {
  const sections = document.querySelectorAll('section[id]');
  const navItems = document.querySelectorAll('.sidebar .nav-item[href^="#"]');
  const bar = document.getElementById('progressBar');
  function update() {
    const sy = window.scrollY;
    const dh = document.body.scrollHeight - window.innerHeight;
    const pct = dh > 0 ? Math.min(100, Math.max(0, (sy / dh) * 100)) : 0;
    if (bar) bar.style.width = pct + '%';
    let activeId = null;
    sections.forEach(sec => { if (sec.offsetTop - 120 <= sy) activeId = sec.id; });
    if (activeId) {
      navItems.forEach(item => {
        const href = item.getAttribute('href') || '';
        item.classList.toggle('active', href === '#' + activeId);
      });
    }
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();
</script>
</body>
</html>`;
}

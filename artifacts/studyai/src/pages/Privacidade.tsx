import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Trash2, Download, Mail, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { useStudyAuth as useAuth } from "@/hooks/useStudyAuth";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

async function requestDataDeletion(): Promise<{ ok: boolean; message?: string; error?: string }> {
  const res = await fetch(`${BASE_URL}/api/lgpd/delete-account`, {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}

async function downloadMyData(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/lgpd/my-data`, {
    credentials: "include",
  });
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `studyai_meus_dados_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Privacidade() {
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "loading" | "done">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const handleDeleteRequest = async () => {
    if (deleteStep === "idle") {
      setDeleteStep("confirm");
      return;
    }
    setDeleteStep("loading");
    setDeleteError(null);
    try {
      const result = await requestDataDeletion();
      if (result.ok) {
        setDeleteStep("done");
        setTimeout(() => { window.location.href = "/"; }, 4000);
      } else {
        setDeleteError(result.error || "Erro desconhecido.");
        setDeleteStep("confirm");
      }
    } catch {
      setDeleteError("Erro de conexão. Tente novamente.");
      setDeleteStep("confirm");
    }
  };

  const handleDownload = async () => {
    setDownloadLoading(true);
    try {
      await downloadMyData();
    } finally {
      setDownloadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50">
      {/* Header */}
      <div className="border-b border-white/60 bg-white/70 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/app")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span className="font-bold text-gray-800">Privacidade e LGPD</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-white">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Política de Privacidade</h1>
              <p className="text-gray-500 text-sm mt-1">
                StudyAI — study.ia.br &nbsp;·&nbsp; Em conformidade com a <strong>LGPD</strong> (Lei nº 13.709/2018)
              </p>
              <p className="text-gray-400 text-xs mt-1">Última atualização: Abril de 2025</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        {[
          {
            num: "1",
            title: "Quem somos",
            content: `O StudyAI (study.ia.br) é uma plataforma de estudos com inteligência artificial voltada para estudantes brasileiros. Somos o controlador dos dados pessoais que você nos fornece ao criar uma conta e utilizar nossos serviços.\n\nContato do Encarregado (DPO): privacidade@study.ia.br`,
          },
          {
            num: "2",
            title: "Quais dados coletamos",
            content: `• Nome e endereço de e-mail (fornecidos via login social)\n• Foto de perfil (opcional, via login social)\n• Conteúdo enviado para geração de planos (textos, PDFs, temas)\n• Resultados de simulados e sessões de flashcard\n• Atividade de estudo (datas de acesso, XP acumulado)\n• Dados de pagamento processados pelo Stripe (não armazenamos números de cartão)\n• Endereço IP e dados de sessão (para segurança e prevenção de abusos)`,
          },
          {
            num: "3",
            title: "Como usamos seus dados",
            content: `• Personalizar seu plano de estudos e a Professora Paula com base no seu histórico\n• Exibir seu progresso, ranking e mapa de desempenho\n• Processar pagamentos e manter o status da assinatura\n• Enviar comunicações relacionadas ao serviço (se autorizado)\n• Prevenir fraudes e proteger a segurança da plataforma\n\nBase legal (LGPD Art. 7º): execução de contrato, legítimo interesse e, para marketing, consentimento.`,
          },
          {
            num: "4",
            title: "Com quem compartilhamos",
            content: `Não vendemos seus dados. Compartilhamos apenas com prestadores de serviço essenciais:\n\n• Replit Inc. — infraestrutura e autenticação\n• OpenAI — processamento de IA (seus textos são enviados, mas não usados para treinar modelos)\n• Stripe — processamento de pagamentos\n• Resend — envio de e-mails transacionais\n\nTodos os fornecedores são contratualmente obrigados a manter a confidencialidade e não reutilizar seus dados.`,
          },
          {
            num: "5",
            title: "Cookies e rastreamento",
            content: `Usamos cookies exclusivamente para:\n\n• Manter sua sessão autenticada (cookie "sid" — essencial, HttpOnly, Secure)\n• Preferências de consentimento de cookies\n\nNão usamos cookies de rastreamento de terceiros, pixels de publicidade ou fingerprinting. Você pode limpar os cookies do navegador a qualquer momento.`,
          },
          {
            num: "6",
            title: "Seus direitos (LGPD Art. 18)",
            content: `Como titular dos dados, você tem direito a:\n\n• Confirmação da existência do tratamento\n• Acesso aos seus dados (disponível abaixo)\n• Correção de dados incorretos (entre em contato conosco)\n• Anonimização, bloqueio ou eliminação dos dados\n• Portabilidade dos dados a outro fornecedor\n• Eliminação dos dados tratados com consentimento\n• Revogação do consentimento a qualquer momento\n• Petição à ANPD (Autoridade Nacional de Proteção de Dados)\n\nPara exercer esses direitos: privacidade@study.ia.br`,
          },
          {
            num: "7",
            title: "Segurança",
            content: `Adotamos medidas técnicas e organizacionais para proteger seus dados:\n\n• Comunicações via HTTPS/TLS\n• Cookies de sessão com flags HttpOnly e Secure\n• Rate limiting em todas as rotas da API\n• Cabeçalhos de segurança HTTP (HSTS, X-Frame-Options, etc.)\n• Autenticação via OpenID Connect com PKCE\n• Acesso aos dados restrito por autenticação obrigatória\n• Banco de dados acessível apenas pela aplicação (sem acesso público)`,
          },
          {
            num: "8",
            title: "Retenção de dados",
            content: `Mantemos seus dados enquanto sua conta estiver ativa. Você pode solicitar a exclusão completa a qualquer momento. Após a exclusão, os dados são removidos permanentemente de nossos sistemas em até 30 dias (exceto onde exigido por lei).`,
          },
          {
            num: "9",
            title: "Alterações nesta política",
            content: `Podemos atualizar esta política a qualquer momento. Alterações relevantes serão comunicadas por e-mail ou notificação no app com antecedência mínima de 15 dias.`,
          },
          {
            num: "10",
            title: "Contato",
            content: `Encarregado de Proteção de Dados (DPO): privacidade@study.ia.br\nResponderemos em até 15 dias úteis conforme exigido pela LGPD.`,
          },
        ].map((s) => (
          <div key={s.num} className="bg-white rounded-2xl p-5 shadow-sm border border-white">
            <h2 className="font-black text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0">
                {s.num}
              </span>
              {s.title}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{s.content}</p>
          </div>
        ))}

        {/* LGPD Rights Actions */}
        {isAuthenticated && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-white">
            <h2 className="font-black text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center flex-shrink-0">✓</span>
              Exercer meus direitos
            </h2>
            <p className="text-gray-500 text-xs mb-4">LGPD Art. 18 — ações imediatas disponíveis para você</p>

            <div className="space-y-3">
              {/* Download data */}
              <button
                onClick={handleDownload}
                disabled={downloadLoading}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left disabled:opacity-60"
              >
                <Download className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Baixar meus dados</p>
                  <p className="text-gray-500 text-xs">Exportar todos os dados que temos sobre você em JSON</p>
                </div>
                {downloadLoading && <div className="ml-auto w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
              </button>

              {/* Contact DPO */}
              <a
                href="mailto:privacidade@study.ia.br?subject=LGPD%20-%20Solicita%C3%A7%C3%A3o%20de%20Dados"
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors text-left"
              >
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Contatar o DPO</p>
                  <p className="text-gray-500 text-xs">privacidade@study.ia.br — correção, portabilidade ou outras solicitações</p>
                </div>
              </a>

              {/* Delete account */}
              {deleteStep === "done" ? (
                <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 text-sm">Conta excluída com sucesso</p>
                    <p className="text-green-600 text-xs">Todos os seus dados foram removidos. Redirecionando...</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50">
                  <div className="flex items-start gap-3">
                    <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">Excluir minha conta e dados</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Remove permanentemente sua conta, planos, simulados, flashcards e todo o histórico. Esta ação é irreversível.
                      </p>
                      {deleteStep === "confirm" && (
                        <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-200">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            <p className="font-bold text-red-800 text-xs">Tem certeza? Esta ação é permanente e irreversível.</p>
                          </div>
                          {deleteError && <p className="text-red-600 text-xs mb-2">{deleteError}</p>}
                        </div>
                      )}
                      <div className="flex gap-2 mt-3">
                        {deleteStep === "confirm" && (
                          <button
                            onClick={() => { setDeleteStep("idle"); setDeleteError(null); }}
                            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          onClick={handleDeleteRequest}
                          disabled={deleteStep === "loading"}
                          className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
                        >
                          {deleteStep === "loading" ? "Excluindo..." : deleteStep === "confirm" ? "Confirmar exclusão definitiva" : "Solicitar exclusão de dados"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs pb-8">
          © 2025 StudyAI · study.ia.br · privacidade@study.ia.br
        </p>
      </div>
    </div>
  );
}

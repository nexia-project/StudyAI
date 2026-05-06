export default function Slide14_AdminPanel() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-8 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 40% at 20% 80%, rgba(139,92,246,0.2) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#8B5CF6" }}>Gestão da Plataforma</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Painel de Administração</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Usuários</p>
              <div className="flex flex-col gap-[1vh]">
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Total cadastrados</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#F1F5F9" }}>12.847</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Ativos (30d)</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#10B981" }}>9.341</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Premium</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>2.108</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Novas instituições</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#F59E0B" }}>47</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#8B5CF6" }}>Configurações de IA</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8", marginBottom: "0.4vh" }}>Modelo de chat</p>
                  <p className="font-display font-bold" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>DeepSeek V3 ↔ Claude Sonnet</p>
                </div>
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8", marginBottom: "0.4vh" }}>Limite de tokens / usuário</p>
                  <p className="font-display font-bold" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>50.000 / mês</p>
                </div>
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(139,92,246,0.1)" }}>
                  <p className="font-body" style={{ fontSize: "1vw", color: "#94A3B8", marginBottom: "0.4vh" }}>Fallback automático</p>
                  <p className="font-display font-bold" style={{ fontSize: "1.1vw", color: "#10B981" }}>Ativo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-2 flex flex-col gap-[1.5vw]">
            <div className="grid grid-cols-3 gap-[1.5vw]">
              <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#6366F1" }}>R$ 187K</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>MRR atual</p>
                <p className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#10B981" }}>+23% ao mês</p>
              </div>
              <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#10B981" }}>98.7%</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Disponibilidade</p>
                <p className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#10B981" }}>SLA garantido</p>
              </div>
              <div className="rounded-[1vw] p-[1.8vw] text-center" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <p className="font-display font-extrabold" style={{ fontSize: "2.8vw", color: "#F59E0B" }}>4.8</p>
                <p className="font-body" style={{ fontSize: "1.1vw", color: "#94A3B8" }}>Satisfação</p>
                <p className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>de 5 estrelas</p>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Funções do Administrador</p>
              <div className="grid grid-cols-2 gap-[1.5vw]">
                <div className="flex flex-col gap-[1.2vh]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Gestão de escolas e licenças</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Configuração de planos e preços</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Auditoria de uso de IA por usuário</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#8B5CF6" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Feature flags por plano</p>
                  </div>
                </div>
                <div className="flex flex-col gap-[1.2vh]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#EF4444" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Controle de acesso por papel (RBAC)</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#0EA5E9" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Exportação de relatórios — CSV e PDF</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Webhook Stripe — cobrança automática</p>
                  </div>
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                    <p className="font-body" style={{ fontSize: "1.2vw", color: "#CBD5E1" }}>Moderação de conteúdo gerado por IA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.2vw", color: "#475569" }}>11 / 17</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}

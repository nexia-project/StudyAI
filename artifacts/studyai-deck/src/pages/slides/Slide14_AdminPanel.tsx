export default function Slide14_AdminPanel() {
  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: "#0F172A" }}>
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ background: "radial-gradient(ellipse 50% 60% at 10% 80%, rgba(139,92,246,0.25) 0%, transparent 60%)" }} />

      <div className="relative h-full flex flex-col px-[8vw] pt-[5vh] pb-[4vh]">
        <div className="mb-[2.5vh]">
          <p className="font-display font-semibold tracking-widest uppercase mb-[0.8vh]" style={{ fontSize: "1.3vw", color: "#8B5CF6" }}>Gestao Completa</p>
          <h2 className="font-display font-extrabold tracking-tight" style={{ fontSize: "3.5vw", color: "#F1F5F9" }}>Painel Admin Completo</h2>
        </div>

        <div className="grid grid-cols-3 gap-[1.5vw] flex-1">
          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#8B5CF6" }}>Gestao de Usuarios</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Total cadastrados</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#F1F5F9" }}>14.320</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Assinantes ativos</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#10B981" }}>3.847</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Professores</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#6366F1" }}>218</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Instituicoes B2B</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>42</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Controle de Acesso</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="rounded-[0.5vw] p-[1vw] flex items-center gap-[1vw]" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#EF4444" }} />
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Super Admin</span>
                </div>
                <div className="rounded-[0.5vw] p-[1vw] flex items-center gap-[1vw]" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Admin de Escola</span>
                </div>
                <div className="rounded-[0.5vw] p-[1vw] flex items-center gap-[1vw]" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#6366F1" }} />
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Professor</span>
                </div>
                <div className="rounded-[0.5vw] p-[1vw] flex items-center gap-[1vw]" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-[0.8vw] h-[0.8vw] rounded-full" style={{ background: "#10B981" }} />
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Aluno</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Configuracao de Conteudo</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Banco de questoes ENEM (2010–2025)</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Upload de apostilas e PDFs por escola</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Curriculo personalizado por instituicao</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#8B5CF6" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Versionamento de conteudo e rollback</p>
                </div>
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: "#EF4444" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Moderacao de conteudo gerado por IA</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Configuracao de Planos</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <p className="font-body font-medium" style={{ fontSize: "1.1vw", color: "#F1F5F9" }}>Freemium — limites e cotas</p>
                </div>
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(99,102,241,0.1)" }}>
                  <p className="font-body font-medium" style={{ fontSize: "1.1vw", color: "#6366F1" }}>Pro — acesso completo</p>
                </div>
                <div className="rounded-[0.5vw] p-[1vw]" style={{ background: "rgba(245,158,11,0.1)" }}>
                  <p className="font-body font-medium" style={{ fontSize: "1.1vw", color: "#F59E0B" }}>B2B — customizavel por escola</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-[1.5vw]">
            <div className="rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Monitoramento do Sistema</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Uptime</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#10B981" }}>99.97%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Latencia media API</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#6366F1" }}>340ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Custo IA / usuario</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#F59E0B" }}>R$0.08/mes</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Sessoes ativas agora</span>
                  <span className="font-display font-bold" style={{ fontSize: "1.2vw", color: "#F1F5F9" }}>1.247</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1vw] p-[1.8vw] flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="font-display font-bold mb-[1.5vh]" style={{ fontSize: "1.3vw", color: "#94A3B8" }}>Auditoria e Compliance</p>
              <div className="flex flex-col gap-[1.2vh]">
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh]" style={{ background: "#10B981" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Logs completos de todas as acoes de IA</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh]" style={{ background: "#6366F1" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>LGPD — dados anonimizados e exportaveis</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh]" style={{ background: "#F59E0B" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Historico de acessos e alteracoes</p>
                </div>
                <div className="flex items-start gap-[0.8vw]">
                  <div className="w-[0.5vw] h-[0.5vw] rounded-full mt-[0.7vh]" style={{ background: "#8B5CF6" }} />
                  <p className="font-body" style={{ fontSize: "1.1vw", color: "#CBD5E1" }}>Relatorios para orgaos reguladores</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-[8vw] py-[2vh] flex justify-between items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: "#6366F1" }}>StudyAI</span>
        <span className="font-body" style={{ fontSize: "1.3vw", color: "#475569" }}>study.ia.br</span>
      </div>
    </div>
  );
}

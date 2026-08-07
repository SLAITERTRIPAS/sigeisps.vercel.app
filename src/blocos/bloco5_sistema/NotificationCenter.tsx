import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, FileText, Clock, ChevronRight, AlertCircle, ShieldAlert, Sparkles, CheckCircle2, Wrench, RefreshCw } from "lucide-react";
import { firestoreService } from "../../lib/firestoreService";
import ModalProcessarRequisicao from "./ModalProcessarRequisicao";
import ModalProcessarExpediente from "./ModalProcessarExpediente";
import ModalProcessarReset from "./ModalProcessarReset";
import { intelligentDiagnostics, DiagnosticResult } from "../../lib/intelligentDiagnostics";
import { isSuperBossUser } from "../../lib/auth";

export default function NotificationCenter({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requisicoes, setRequisicoes] = useState<any[]>([]);
  const [expedientes, setExpedientes] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [selectedExp, setSelectedExp] = useState<any | null>(null);
  const [selectedReset, setSelectedReset] = useState<any | null>(null);

  // Diagnostic state for Admins
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [fixSuccessMsg, setFixSuccessMsg] = useState<string | null>(null);

  const isAdmin = user && (user.isOwner || user.role === "Administrador do Sistema" || isSuperBossUser(user));

  useEffect(() => {
    if (!user) return;
    const unsubReq =
      firestoreService.requisicoes_internas.subscribe(setRequisicoes);
    const unsubExp = firestoreService.expedientes.subscribe(setExpedientes);
    const unsubReset = firestoreService.password_reset_requests.subscribe(setResetRequests);
    return () => {
      unsubReq();
      unsubExp();
      unsubReset();
    };
  }, [user]);

  // Execute intelligent diagnostics periodically if admin
  useEffect(() => {
    if (!isAdmin) return;
    const fetchDiag = async () => {
      setIsDiagnosing(true);
      try {
        const res = await intelligentDiagnostics.runDiagnostics();
        setDiagnosticResult(res);
      } catch (err) {
        console.error("Erro ao rodar diagnóstico de notificações:", err);
      } finally {
        setIsDiagnosing(false);
      }
    };

    fetchDiag();
    const interval = setInterval(fetchDiag, 5 * 60 * 1000); // 5 min
    return () => clearInterval(interval);
  }, [isAdmin]);

  const handleResolveAllAnomalies = async () => {
    setIsFixing(true);
    setFixSuccessMsg(null);
    try {
      const res = await intelligentDiagnostics.resolveAllFixable();
      setFixSuccessMsg(`${res.totalResolved} anomalia(s) corrigida(s) com sucesso!`);
      // Refresh diagnostic
      const refreshed = await intelligentDiagnostics.runDiagnostics();
      setDiagnosticResult(refreshed);
    } catch (err: any) {
      setFixSuccessMsg(`Erro na autocura: ${err?.message || err}`);
    } finally {
      setIsFixing(false);
    }
  };

  // Logic to determine if a requisition OR expediente is pending for THIS specifically logged user
  const pendingForMe = [
    ...requisicoes.filter((req) => {
      const step = req.etapaAtual;
      const status = req.status;

      // Necessitado doesn't "receive" notification for their own RI unless it's finalized
      if (step === 0 && req.userId === user.id) return false;

      // Step 1: Secretaria
      if (
        step === 1 &&
        (user.departamento?.toLowerCase().includes("secretaria") ||
          user.direcao?.toLowerCase().includes("secretaria"))
      )
        return true;

      // Step 2: Economato
      if (
        step === 2 &&
        (user.departamento?.toLowerCase().includes("economato") ||
          user.direcao?.toLowerCase().includes("economato"))
      )
        return true;

      // Step 3: Chefe de Departamento
      if (
        step === 3 &&
        (user.cargo?.toLowerCase().includes("chefe") ||
          user.role?.toLowerCase().includes("chefe"))
      )
        return true;

      // Step 4 (Favorável -> Economato)
      if (
        step === 4 &&
        status === "Favorável" &&
        (user.departamento?.toLowerCase().includes("economato") ||
          user.direcao?.toLowerCase().includes("economato"))
      )
        return true;

      // Step 4 (Desfavorável -> Secretaria)
      if (
        step === 4 &&
        status === "Desfavorável" &&
        (user.departamento?.toLowerCase().includes("secretaria") ||
          user.direcao?.toLowerCase().includes("secretaria"))
      )
        return true;

      // Step 5: Final (Notification for the Requester)
      if (step === 5 && req.userId === user.id) return true;

      return false;
    }),
    ...expedientes.filter((exp) => {
      // Document routing notification
      if (
        exp.status === "Pendente" &&
        (exp.destino?.toLowerCase() === user.departamento?.toLowerCase() ||
          exp.destino?.toLowerCase() === user.direcao?.toLowerCase())
      )
        return true;
      return false;
    }),
    ...resetRequests.filter((req) => {
      // Only admins see reset requests
      return req.status === "Pendente" && (user.isOwner || user.role === "Administrador do Sistema");
    }),
  ];

  const hasAnomalies = isAdmin && diagnosticResult && diagnosticResult.totalAnomalies > 0;
  const totalNotifications = pendingForMe.length + (hasAnomalies ? diagnosticResult!.totalAnomalies : 0);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/10 group"
      >
        <Bell
          size={20}
          className="text-white group-hover:scale-110 transition-transform"
        />
        {totalNotifications > 0 && (
          <span className={`absolute -top-1 -right-1 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#121c60] animate-pulse ${hasAnomalies ? "bg-amber-500" : "bg-red-500"}`}>
            {totalNotifications}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            ></div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-4 w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
              style={{ maxHeight: "560px" }}
            >
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <h3 className="text-xs font-black tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-400" />{" "}
                  Notificações do Sistema
                </h3>
                {isAdmin && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-900 text-indigo-200 border border-indigo-700 flex items-center gap-1">
                    <Sparkles size={10} className="text-amber-300" /> Diagnóstico Ativo
                  </span>
                )}
              </div>

              {/* Admin Intelligent Diagnostics Alert Section */}
              {isAdmin && diagnosticResult && (
                <div className="p-3 bg-gradient-to-r from-amber-50 via-slate-50 to-indigo-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert size={16} className={diagnosticResult.criticalCount > 0 ? "text-red-600 animate-pulse" : "text-amber-600"} />
                      <span className="text-xs font-black text-slate-800">
                        Saúde do Sistema: {diagnosticResult.healthScore}%
                      </span>
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${diagnosticResult.healthScore > 90 ? "bg-emerald-100 text-emerald-700" : diagnosticResult.healthScore > 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {diagnosticResult.totalAnomalies} anomalia(s)
                    </span>
                  </div>

                  {diagnosticResult.totalAnomalies > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-slate-600 font-medium">
                        O motor de diagnóstico inteligente detetou potenciais inconsistências preventivas na base de dados.
                      </p>
                      {fixSuccessMsg && (
                        <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 size={12} /> {fixSuccessMsg}
                        </div>
                      )}
                      <button
                        onClick={handleResolveAllAnomalies}
                        disabled={isFixing}
                        className="w-full py-1.5 px-3 bg-gradient-to-r from-indigo-700 to-blue-600 hover:from-indigo-800 hover:to-blue-700 text-white font-black text-[10px] rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                      >
                        {isFixing ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            A Executar Autocura...
                          </>
                        ) : (
                          <>
                            <Wrench size={12} />
                            Resolver Anomalias Automáticas ({diagnosticResult.anomalies.filter(a => a.autoFixable).length})
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Integridade total confirmada sem falhas detetadas.
                    </p>
                  )}
                </div>
              )}

              <div className="overflow-y-auto max-h-80">
                {pendingForMe.length === 0 && (!isAdmin || !diagnosticResult || diagnosticResult.totalAnomalies === 0) ? (
                  <div className="p-12 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Bell size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 tracking-tighter">
                      Sem tarefas pendentes ou alertas
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {/* Diagnostic Anomalies list for Admin */}
                    {isAdmin && diagnosticResult && diagnosticResult.anomalies.map((anom) => (
                      <div key={anom.id} className="p-3 bg-amber-50/50 hover:bg-amber-50 transition-all border-l-4 border-amber-500">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[9px] font-mono font-black text-amber-700 uppercase">
                            {anom.category}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${anom.severity === "critical" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                            {anom.severity === "critical" ? "Crítico" : "Aviso"}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900">
                          {anom.title}
                        </h4>
                        <p className="text-[10px] text-slate-600 mt-1">
                          {anom.description}
                        </p>
                        {anom.autoFixable && (
                          <button
                            onClick={async () => {
                              setIsFixing(true);
                              const res = await intelligentDiagnostics.resolveAnomaly(anom.fixActionKey);
                              setFixSuccessMsg(res.message);
                              const refreshed = await intelligentDiagnostics.runDiagnostics();
                              setDiagnosticResult(refreshed);
                              setIsFixing(false);
                            }}
                            className="mt-2 text-[10px] font-bold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1"
                          >
                            <Wrench size={10} /> Resolver este problema agora
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Regular process notifications */}
                    {pendingForMe.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          if (item.etapaAtual !== undefined) {
                            setSelectedReq(item);
                          } else if (item.numero) {
                            setSelectedExp(item);
                          } else {
                            setSelectedReset(item);
                          }
                        }}
                        className="w-full p-4 hover:bg-slate-50 transition-all text-left group"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-[10px] font-mono font-black text-slate-400">
                            {item.numero || "RESET"}
                          </span>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${item.etapaAtual ? "bg-blue-100 text-blue-600" : item.numero ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"}`}>
                            {item.etapaAtual
                              ? `Etapa ${item.etapaAtual}`
                              : item.numero ? "Expediente" : "Redefinição de Senha"}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 line-clamp-1">
                          {item.solicitante || item.origem || item.identifier}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium italic mt-1 line-clamp-2">
                          {item.etapaAtual ? "Requisição Interna" : item.numero ? "Documento" : "Solicitação de redefinição de senha"} aguardando seu parecer técnico/administrativo.
                        </p>
                        <div className="flex items-center gap-1.5 mt-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                          <span className="text-[10px] font-black">
                            Processar agora
                          </span>
                          <ChevronRight size={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">
                  Sistema de Diagnóstico Ativo
                </span>
                <button
                  onClick={async () => {
                    setIsDiagnosing(true);
                    const res = await intelligentDiagnostics.runDiagnostics();
                    setDiagnosticResult(res);
                    setIsDiagnosing(false);
                  }}
                  className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all flex items-center gap-1"
                >
                  <RefreshCw size={10} className={isDiagnosing ? "animate-spin" : ""} /> Atualizar Diagnóstico
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal de Processamento */}
      <AnimatePresence>
        {selectedReq && (
          <ModalProcessarRequisicao
            user={user}
            requisicao={selectedReq}
            onClose={() => setSelectedReq(null)}
            onComplete={() => {
              setSelectedReq(null);
            }}
          />
        )}
        {selectedExp && (
          <ModalProcessarExpediente
            user={user}
            expediente={selectedExp}
            onClose={() => setSelectedExp(null)}
            onComplete={() => {
              setSelectedExp(null);
            }}
          />
        )}
        {selectedReset && (
          <ModalProcessarReset
            user={user}
            request={selectedReset}
            onClose={() => setSelectedReset(null)}
            onComplete={() => {
              setSelectedReset(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

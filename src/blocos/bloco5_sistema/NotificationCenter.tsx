import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, FileText, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { firestoreService } from "../../lib/firestoreService";
import ModalProcessarRequisicao from "./ModalProcessarRequisicao";
import ModalProcessarExpediente from "./ModalProcessarExpediente";
import ModalProcessarReset from "./ModalProcessarReset";

export default function NotificationCenter({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [requisicoes, setRequisicoes] = useState<any[]>([]);
  const [expedientes, setExpedientes] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [selectedExp, setSelectedExp] = useState<any | null>(null);
  const [selectedReset, setSelectedReset] = useState<any | null>(null);

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
        {pendingForMe.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#121c60] animate-pulse">
            {pendingForMe.length}
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
              className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
              style={{ maxHeight: "480px" }}
            >
              <div className="bg-slate-900 p-4 text-white">
                <h3 className="text-xs font-black tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-400" />{" "}
                  Notificações de Processos
                </h3>
              </div>

              <div className="overflow-y-auto max-h-96">
                {pendingForMe.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Bell size={24} />
                    </div>
                    <p className="text-xs font-bold text-slate-400 tracking-tighter">
                      Sem tarefas pendentes
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {pendingForMe.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          console.log("Item clicado:", item);
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

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button className="text-[10px] font-black text-slate-400 hover:text-slate-600 transition-all">
                  Ver todo o histórico
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

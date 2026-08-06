import React, { ReactNode } from "react";
import { motion } from "motion/react";
import { X, Printer, ShieldCheck, LucideIcon } from "lucide-react";

interface FormLayoutProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  trackingCode?: string;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
  successTitle?: string;
  successMessage: string | ReactNode;
  children: ReactNode;
  bannerColor?: string;
  iconColor?: string;
  maxWidth?: string;
  hidePrintHeader?: boolean;
}

export const FormLayout: React.FC<FormLayoutProps> = ({
  title,
  subtitle,
  icon: Icon,
  trackingCode,
  onCancel,
  onSubmit,
  isSubmitting,
  isSubmitted,
  successTitle = "Sucesso!",
  successMessage,
  children,
  bannerColor = "bg-slate-900",
  iconColor = "text-amber-400",
  maxWidth = "max-w-4xl",
  hidePrintHeader = false,
}) => {
  return (
    <div className="relative">
      {/* Success Overlay */}
      {isSubmitted && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center"
          >
            <div
              className={`w-20 h-20 ${bannerColor.replace("bg-", "bg-")}/10 ${bannerColor.replace("bg-", "text-")} rounded-full flex items-center justify-center mb-6 mx-auto`}
            >
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">
              {successTitle}
            </h3>
            <div className="text-slate-500 text-sm leading-relaxed mb-8">
              {successMessage}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => window.print()}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
              >
                <Printer size={18} /> Descarregar / Imprimir
              </button>
              <button
                onClick={onCancel}
                className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-black text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all"
              >
                Fechar e Voltar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${maxWidth} mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:overflow-visible print:h-auto print:max-w-full`}
      >
        {!hidePrintHeader && (
          <div className="hidden print:flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-6 font-sans">
            <div className="flex items-center gap-4">
              <img
                src="https://lh3.googleusercontent.com/d/11zvvpOpZARM1yk_irEDpjJ-qBKlTlhad"
                alt="ISPS Logo"
                className="h-14 grayscale opacity-90"
                referrerPolicy="no-referrer"
              />
              <div className="leading-tight text-left">
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">
                  INSTITUTO SUPERIOR POLITÉCNICO DE SONGO
                </h1>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-700">PROVÍNCIA DE TETE</p>
                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-700">DISTRITO DE CAHORA-BASSA</p>
              </div>
            </div>
            <div className="text-right mt-2">
              <p className="text-sm font-black uppercase border-y-2 border-slate-900 py-2 inline-block px-4 text-[#121c60]">
                {title}
              </p>
            </div>
          </div>
        )}

        <div
          className={`${bannerColor} p-8 text-white flex justify-between items-center relative overflow-hidden print:hidden`}
        >
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <Icon className={iconColor} size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">{title}</h2>
              <p className="text-xs text-slate-400 font-bold tracking-widest">
                {subtitle}
              </p>
            </div>
          </div>

          {trackingCode && (
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md mr-4 relative z-10">
              <div className="text-[9px] font-black text-slate-300 tracking-widest leading-tight">
                Rastreio Interno
              </div>
              <div className="text-sm font-mono font-black text-white leading-tight">
                {trackingCode}
              </div>
            </div>
          )}

          <div className="flex gap-3 print:hidden relative z-10">
            <button
              onClick={() => window.print()}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
              type="button"
            >
              <Printer size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-8 space-y-8">
          {children}
        </form>
      </motion.div>
    </div>
  );
};
